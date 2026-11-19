import { describe, expect, it } from '@jest/globals';
import {
  authorizeStaging,
  isVerifiedBotRscRequest,
  staticAssetCacheControl,
  verifiedBotRscResponse,
  withTrustedClientIp,
} from '../../worker/edgePolicy.mjs';

describe('container edge policy', () => {
  it('fails closed when staging has no access credential', () => {
    expect(authorizeStaging(new Request('https://staging.test/'), { APP_ENV: 'staging' })).toBe(
      false,
    );
  });

  it('requires the staging credential but leaves production public', () => {
    const request = new Request('https://staging.test/', {
      headers: { 'x-truckfull-staging-token': 'test-only-token' },
    });
    expect(
      authorizeStaging(request, { APP_ENV: 'staging', STAGING_ACCESS_TOKEN: 'test-only-token' }),
    ).toBe(true);
    expect(
      authorizeStaging(request, { APP_ENV: 'staging', STAGING_ACCESS_TOKEN: 'different-token' }),
    ).toBe(false);
    expect(authorizeStaging(new Request('https://public.test/'), { APP_ENV: 'production' })).toBe(
      true,
    );
  });

  it.each([undefined, '', 'stagng', 'Production', 'development'])(
    'denies access when APP_ENV is missing or unrecognized: %s',
    (appEnv) => {
      const env = { APP_ENV: appEnv, STAGING_ACCESS_TOKEN: 'test-only-token' };
      expect(authorizeStaging(new Request('https://staging.test/'), env)).toBe(false);
      expect(
        authorizeStaging(
          new Request('https://staging.test/', {
            headers: { 'x-truckfull-staging-token': 'test-only-token' },
          }),
          env,
        ),
      ).toBe(false);
    },
  );

  it('supports origin-scoped browser credentials without forwarding them to the application', () => {
    const env = { APP_ENV: 'staging', STAGING_ACCESS_TOKEN: 'test-only-token' };
    const request = new Request('https://staging.test/', {
      headers: { authorization: `Basic ${btoa('truckfull:test-only-token')}` },
    });
    expect(authorizeStaging(request, env)).toBe(true);
    expect(withTrustedClientIp(request, env).headers.has('authorization')).toBe(false);
    expect(
      authorizeStaging(
        new Request(request.url, { headers: { authorization: 'Basic invalid' } }),
        env,
      ),
    ).toBe(false);
  });

  it('overwrites spoofable IP headers with the Cloudflare client address', () => {
    const request = new Request('https://public.test/api/trucks', {
      headers: {
        'cf-connecting-ip': '192.0.2.10',
        'x-forwarded-for': '198.51.100.2',
        'x-real-ip': '198.51.100.3',
        'x-vercel-forwarded-for': '198.51.100.4',
        'x-truckfull-staging-token': 'test-only-token',
      },
    });
    const forwarded = withTrustedClientIp(request);
    expect(forwarded.headers.get('x-forwarded-for')).toBe('192.0.2.10');
    expect(forwarded.headers.get('x-real-ip')).toBe('192.0.2.10');
    expect(forwarded.headers.has('x-vercel-forwarded-for')).toBe(false);
    expect(forwarded.headers.has('x-truckfull-staging-token')).toBe(false);
  });

  it('only caches successful content-addressed Next assets', () => {
    const request = new Request('https://public.test/_next/static/chunks/abc.js');
    const response = new Response('asset', {
      headers: { 'content-type': 'application/javascript' },
    });
    expect(staticAssetCacheControl(request, response)).toBe('public, max-age=31536000, immutable');
    expect(staticAssetCacheControl(request, new Response('missing', { status: 404 }))).toBe(
      'no-store',
    );
    expect(staticAssetCacheControl(new Request('https://public.test/truck'), response)).toBe(
      'no-store',
    );
    expect(
      staticAssetCacheControl(new Request('https://public.test/_next/image?url=x'), response),
    ).toBe('no-store');
  });

  it.each(['cookie', 'authorization', 'rsc'])('bypasses %s requests', (header) => {
    const request = new Request('https://public.test/_next/static/chunks/abc.js', {
      headers: { [header]: 'value' },
    });
    expect(request.headers.has(header)).toBe(true);
    expect(staticAssetCacheControl(request, new Response('asset'))).toBe('no-store');
  });

  it('does not cache cookies, private responses, HTML, or queried assets', () => {
    const request = new Request('https://public.test/_next/static/chunks/abc.js');
    for (const headers of [
      { 'set-cookie': 'session=value' },
      { 'cache-control': 'private' },
      { 'content-type': 'text/html' },
      { vary: '*' },
    ]) {
      expect(staticAssetCacheControl(request, new Response('asset', { headers }))).toBe('no-store');
    }
    expect(staticAssetCacheControl(new Request(`${request.url}?x=1`), new Response('asset'))).toBe(
      'no-store',
    );
  });
  describe('verified bot RSC filter', () => {
    const crawler = { verifiedBotCategory: 'Search Engine Crawler' };

    it('matches RSC payload requests from verified bots', () => {
      expect(
        isVerifiedBotRscRequest(new Request('https://public.test/privacy?_rsc=abc123'), crawler),
      ).toBe(true);
      expect(
        isVerifiedBotRscRequest(
          new Request('https://public.test/events', { headers: { rsc: '1' } }),
          crawler,
        ),
      ).toBe(true);
      expect(
        isVerifiedBotRscRequest(
          new Request('https://public.test/events', { headers: { 'next-router-prefetch': '1' } }),
          crawler,
        ),
      ).toBe(true);
    });

    it('lets verified bots fetch full HTML pages', () => {
      expect(isVerifiedBotRscRequest(new Request('https://public.test/events'), crawler)).toBe(
        false,
      );
      expect(
        isVerifiedBotRscRequest(new Request('https://public.test/events?city=augusta'), crawler),
      ).toBe(false);
    });

    it.each([undefined, {}, { verifiedBotCategory: '' }, { verifiedBotCategory: null }])(
      'never filters requests Cloudflare has not verified as a bot: %p',
      (cf) => {
        expect(
          isVerifiedBotRscRequest(
            new Request('https://public.test/privacy?_rsc=abc123', { headers: { rsc: '1' } }),
            cf,
          ),
        ).toBe(false);
      },
    );

    it('answers with an uncached noindex 204', () => {
      const response = verifiedBotRscResponse();
      expect(response.status).toBe(204);
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(response.headers.get('x-robots-tag')).toBe('noindex');
    });
  });
});
