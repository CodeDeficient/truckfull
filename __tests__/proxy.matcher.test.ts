import { describe, expect, it } from '@jest/globals';
import { config } from '@/proxy';

function matchesProxy(pathname: string): boolean {
  const [matcher] = config.matcher;
  if (!matcher) throw new Error('Proxy matcher is missing');
  return new RegExp(`^${matcher}$`).test(pathname);
}

describe('proxy matcher', () => {
  it.each([
    '/manifest.json',
    '/pins/README.md',
    '/pwa-icons-readme.md',
    '/field-guide-demo-optimized.mp4',
  ])('excludes the approved public static path %s', (pathname) => {
    expect(matchesProxy(pathname)).toBe(false);
  });

  it.each([
    '/claim-your-truck',
    '/events/atlanta-ga/summer-festival-2026-08-01',
    '/ni-lashay-kitchen',
    '/api/auth/claim/verify-code',
  ])('continues matching protected or redirect-sensitive path %s', (pathname) => {
    expect(matchesProxy(pathname)).toBe(true);
  });

  it('runs on every API path, including ones with static file extensions', () => {
    expect(config.matcher).toContain('/api/:path*');
    expect(matchesProxy('/api/og/default.png')).toBe(false);
  });
});
