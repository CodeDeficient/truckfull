/**
 * @jest-environment node
 */
import { describe, it, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  AI_AGENT_NOTICE,
  HONEYPOT_BAN_SECONDS,
  HONEYPOT_PATH_PREFIX,
  honeypotGuard,
  isBrowserUserAgent,
  isHoneypotPath,
} from '../../worker/honeypot.mjs';
import { HONEYPOT_LINK_PATH, HONEYPOT_PATH_PREFIX as APP_PREFIX } from '@/lib/security/honeypot';
import robots from '@/app/robots';

class MemoryCache {
  readonly entries = new Map<string, Response>();

  put(key: string, response: Response): Promise<void> {
    this.entries.set(key, response);
    return Promise.resolve();
  }

  match(key: string): Promise<Response | undefined> {
    return Promise.resolve(this.entries.get(key));
  }
}

const SCRAPER_IP = '2a04:4e41:80:ddb7::5c82:ddb7';
const BARE_UA = 'Mozilla/5.0';
const SAFARI_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.6.1 Mobile/15E148 Safari/604.1';

function makeRequest(
  path: string,
  ip: string | null,
  userAgent: string,
  cf: Record<string, unknown> = {},
): Request {
  const headers = new Headers({ 'user-agent': userAgent });
  if (ip) headers.set('cf-connecting-ip', ip);
  const request = new Request(`https://www.truckfull.food${path}`, { headers });
  Object.defineProperty(request, 'cf', { value: cf });
  return request;
}

async function runGuard(cache: MemoryCache, request: Request): Promise<Response | null> {
  const pending: Promise<unknown>[] = [];
  const result = await honeypotGuard(request, cache, (task: Promise<unknown>) => pending.push(task));
  await Promise.all(pending);
  return result;
}

describe('isHoneypotPath', () => {
  it('matches the trap prefix and anything under it', () => {
    expect(isHoneypotPath(HONEYPOT_PATH_PREFIX)).toBe(true);
    expect(isHoneypotPath(`${HONEYPOT_PATH_PREFIX}/all-trucks.csv`)).toBe(true);
  });

  it('ignores lookalike and normal paths', () => {
    expect(isHoneypotPath(`${HONEYPOT_PATH_PREFIX}-public`)).toBe(false);
    expect(isHoneypotPath('/trucks')).toBe(false);
    expect(isHoneypotPath('/')).toBe(false);
  });
});

describe('isBrowserUserAgent', () => {
  it('treats full browser strings as browsers', () => {
    expect(isBrowserUserAgent(SAFARI_UA)).toBe(true);
  });

  it('treats stripped and tool user agents as non-browsers', () => {
    for (const userAgent of [BARE_UA, 'Mozilla/5.0 Chrome/124', 'python-requests/2.32.3', '', null]) {
      expect(isBrowserUserAgent(userAgent)).toBe(false);
    }
  });
});

describe('honeypotGuard', () => {
  it('asks AI agents at the trap to leave their operator contact on the API waitlist', async () => {
    const cache = new MemoryCache();
    const trap = await runGuard(cache, makeRequest(HONEYPOT_LINK_PATH, SCRAPER_IP, BARE_UA));
    const body = (await trap?.text()) ?? '';
    expect(body.startsWith(AI_AGENT_NOTICE)).toBe(true);
    expect(AI_AGENT_NOTICE).toContain('https://www.truckfull.food/data-api');

    const followUp = await runGuard(cache, makeRequest('/a-taste-of-cmg', SCRAPER_IP, BARE_UA));
    expect(await followUp?.text()).not.toContain(AI_AGENT_NOTICE);
  });

  it('denies a trap hit and then bans that address and user agent pair', async () => {
    const cache = new MemoryCache();
    const trap = await runGuard(cache, makeRequest(HONEYPOT_LINK_PATH, SCRAPER_IP, BARE_UA));
    expect(trap?.status).toBe(403);

    const followUp = await runGuard(cache, makeRequest('/a-taste-of-cmg', SCRAPER_IP, BARE_UA));
    expect(followUp?.status).toBe(403);
  });

  it('keeps serving a real browser that shares the same relay address', async () => {
    const cache = new MemoryCache();
    await runGuard(cache, makeRequest(HONEYPOT_LINK_PATH, SCRAPER_IP, BARE_UA));

    expect(await runGuard(cache, makeRequest('/a-taste-of-cmg', SCRAPER_IP, SAFARI_UA))).toBeNull();
  });

  it('keeps serving the same user agent from another address', async () => {
    const cache = new MemoryCache();
    await runGuard(cache, makeRequest(HONEYPOT_LINK_PATH, SCRAPER_IP, BARE_UA));

    expect(await runGuard(cache, makeRequest('/a-taste-of-cmg', '203.0.113.9', BARE_UA))).toBeNull();
  });

  it('refuses a real browser user agent at the trap without banning it', async () => {
    const cache = new MemoryCache();
    const trap = await runGuard(cache, makeRequest(HONEYPOT_LINK_PATH, SCRAPER_IP, SAFARI_UA));
    expect(trap?.status).toBe(403);
    expect(cache.entries.size).toBe(0);

    expect(await runGuard(cache, makeRequest('/a-taste-of-cmg', SCRAPER_IP, SAFARI_UA))).toBeNull();
  });

  it('bans common scripting clients as non-browsers', async () => {
    for (const userAgent of ['python-requests/2.32.3', 'curl/8.5.0', 'Mozilla/5.0 Chrome/124', '']) {
      const cache = new MemoryCache();
      await runGuard(cache, makeRequest(HONEYPOT_LINK_PATH, SCRAPER_IP, userAgent));
      expect(cache.entries.size).toBe(1);
      expect((await runGuard(cache, makeRequest('/', SCRAPER_IP, userAgent)))?.status).toBe(403);
    }
  });

  it('never bans verified search crawlers that reach the trap', async () => {
    const cache = new MemoryCache();
    const googlebot = { verifiedBotCategory: 'Search Engine Crawler' };
    const trap = await runGuard(
      cache,
      makeRequest(HONEYPOT_LINK_PATH, '66.249.66.1', 'Googlebot/2.1', googlebot),
    );
    expect(trap?.status).toBe(403);
    expect(cache.entries.size).toBe(0);
  });

  it('records nothing when the client address is missing', async () => {
    const cache = new MemoryCache();
    await runGuard(cache, makeRequest(HONEYPOT_LINK_PATH, null, BARE_UA));
    expect(cache.entries.size).toBe(0);
  });

  it('stores bans for thirty days', async () => {
    const cache = new MemoryCache();
    await runGuard(cache, makeRequest(HONEYPOT_LINK_PATH, SCRAPER_IP, BARE_UA));
    const [stored] = [...cache.entries.values()];
    expect(stored.headers.get('cache-control')).toBe(`max-age=${HONEYPOT_BAN_SECONDS}`);
    expect(HONEYPOT_BAN_SECONDS).toBe(2_592_000);
  });

  it('keeps ban keys on the site origin without exposing the raw address', async () => {
    const cache = new MemoryCache();
    await runGuard(cache, makeRequest(HONEYPOT_LINK_PATH, SCRAPER_IP, BARE_UA));
    const [key] = [...cache.entries.keys()];
    expect(key.startsWith('https://www.truckfull.food/__honeypot-ban/')).toBe(true);
    expect(key).not.toContain(SCRAPER_IP);
  });
});

describe('honeypot wiring', () => {
  it('uses the same trap prefix in the Worker and the app', () => {
    expect(APP_PREFIX).toBe(HONEYPOT_PATH_PREFIX);
    expect(isHoneypotPath(HONEYPOT_LINK_PATH)).toBe(true);
  });

  it('tells well-behaved crawlers to stay out of the trap', () => {
    const disallowed = robots()
      .rules.filter((rule) => rule.userAgent === '*')
      .flatMap((rule) => (Array.isArray(rule.disallow) ? rule.disallow : [rule.disallow]));
    expect(disallowed).toContain(`${HONEYPOT_PATH_PREFIX}/`);
  });

  it('runs the guard in the web Worker before the container is reached', () => {
    const source = readFileSync(join(process.cwd(), 'worker', 'container.mjs'), 'utf8').split(
      'export default {',
    )[1];
    const guardIndex = source.indexOf('honeypotGuard(request, caches.default');
    expect(guardIndex).toBeGreaterThan(-1);
    expect(guardIndex).toBeLessThan(source.indexOf('getContainer(env.TRUCKFULL_CONTAINER'));
  });

  it('renders a hidden, unfollowed trap link from the root layout', () => {
    const layout = readFileSync(join(process.cwd(), 'app', 'layout.tsx'), 'utf8');
    expect(layout).toContain('href={HONEYPOT_LINK_PATH}');
    expect(layout).toContain('rel="nofollow"');
    expect(layout).toContain('aria-hidden="true"');
  });
});
