import { describe, it, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(join(process.cwd(), 'worker', 'container.mjs'), 'utf8').split(
  'export default {',
)[1];

describe('container geo forwarding wiring', () => {
  it('stamps request.cf onto the forwarded request', () => {
    expect(source).toContain('const clientLocation = request.cf;');
    expect(source).toContain('withClientLocationHeaders(request, clientLocation)');
  });

  it('still forwards the request to the container', () => {
    expect(source).toContain('container.fetch(');
  });
});

describe('container bot access guard wiring', () => {
  it('rejects blocked crawler user agents before reaching the container', () => {
    const guardIndex = source.indexOf('isBlockedUserAgent(request.headers.get(');
    const containerIndex = source.indexOf('getContainer(env.TRUCKFULL_CONTAINER');
    expect(guardIndex).toBeGreaterThan(-1);
    expect(guardIndex).toBeLessThan(containerIndex);
  });

  it('rejects published crawler source addresses before reaching the container', () => {
    const guardIndex = source.indexOf('isBlockedCrawlerIp(');
    const containerIndex = source.indexOf('getContainer(env.TRUCKFULL_CONTAINER');
    expect(guardIndex).toBeGreaterThan(-1);
    expect(guardIndex).toBeLessThan(containerIndex);
    expect(source).toContain("request.headers.get('cf-connecting-ip')");
  });

  it('returns the contact message with a 403', () => {
    expect(source).toContain('BOT_ACCESS_MESSAGE');
    expect(source).toContain('status: 403');
  });
});

describe('container verified bot RSC filter wiring', () => {
  it('answers verified bot RSC requests before reaching the container', () => {
    const filterIndex = source.indexOf('isVerifiedBotRscRequest(request, request.cf, url)');
    const containerIndex = source.indexOf('getContainer(env.TRUCKFULL_CONTAINER');
    expect(filterIndex).toBeGreaterThan(-1);
    expect(filterIndex).toBeLessThan(containerIndex);
    expect(source).toContain('return verifiedBotRscResponse();');
  });
});
