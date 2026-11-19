import { getBusinessAuthState } from '@/lib/facebook/businessAuthStatus';

describe('businessAuthStatus', () => {
  const nowIso = '2026-05-21T00:00:00.000Z';

  it('marks missing app env as misconfigured internally but missing for user state', () => {
    expect(
      getBusinessAuthState({
        hasBusinessAppId: true,
        hasBusinessAppSecret: false,
        hasToken: false,
        tokenExpiresAt: null,
        nowIso,
      }),
    ).toEqual({
      needsBusinessAuth: true,
      authStatus: 'missing',
      isMisconfigured: true,
    });
  });

  it('returns missing when configured but token absent', () => {
    expect(
      getBusinessAuthState({
        hasBusinessAppId: true,
        hasBusinessAppSecret: true,
        hasToken: false,
        tokenExpiresAt: null,
        nowIso,
      }),
    ).toEqual({
      needsBusinessAuth: true,
      authStatus: 'missing',
      isMisconfigured: false,
    });
  });

  it('returns expired when token is present and expired', () => {
    expect(
      getBusinessAuthState({
        hasBusinessAppId: true,
        hasBusinessAppSecret: true,
        hasToken: true,
        tokenExpiresAt: '2026-05-20T23:59:59.000Z',
        nowIso,
      }),
    ).toEqual({
      needsBusinessAuth: true,
      authStatus: 'expired',
      isMisconfigured: false,
    });
  });

  it('returns connected when token is valid', () => {
    expect(
      getBusinessAuthState({
        hasBusinessAppId: true,
        hasBusinessAppSecret: true,
        hasToken: true,
        tokenExpiresAt: '2026-05-22T00:00:00.000Z',
        nowIso,
      }),
    ).toEqual({
      needsBusinessAuth: false,
      authStatus: 'connected',
      isMisconfigured: false,
    });
  });
});
