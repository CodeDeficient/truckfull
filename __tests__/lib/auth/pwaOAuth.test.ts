import {
  buildOAuthCallbackUrl,
  buildPwaCompletionUrl,
  resolvePwaCompletionRedirect,
  sanitizeRelativeRedirectPath,
} from '@/lib/auth/pwaOAuth';

describe('pwaOAuth helpers', () => {
  it('builds a standalone callback URL with pwa marker', () => {
    expect(buildOAuthCallbackUrl('https://www.truckfull.food', '/@mobile?showAuth=true', true)).toBe(
      'https://www.truckfull.food/auth/callback?redirectTo=%2F%40mobile%3FshowAuth%3Dtrue&pwa=1',
    );
  });

  it('builds a normal callback URL without pwa marker', () => {
    expect(buildOAuthCallbackUrl('https://www.truckfull.food', '/owner-dashboard', false)).toBe(
      'https://www.truckfull.food/auth/callback?redirectTo=%2Fowner-dashboard',
    );
  });

  it('builds the browser-to-pwa handoff URL', () => {
    expect(buildPwaCompletionUrl('https://www.truckfull.food', '/@mobile')).toBe(
      'https://www.truckfull.food/auth/pwa-complete?redirectTo=%2F%40mobile',
    );
  });

  it('resolves a post-auth target through the PWA handoff page', () => {
    expect(
      resolvePwaCompletionRedirect('https://www.truckfull.food/@mobile', 'https://www.truckfull.food'),
    ).toBe('https://www.truckfull.food/auth/pwa-complete?redirectTo=%2F%40mobile%3Fsource%3Dpwa');
  });

  it('rejects external redirect paths', () => {
    expect(sanitizeRelativeRedirectPath('https://evil.example')).toBe('/');
    expect(sanitizeRelativeRedirectPath('//evil.example')).toBe('/');
  });
});
