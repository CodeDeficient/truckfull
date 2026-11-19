import {
  getDefaultNewProfileRole,
  getOAuthRedirectTarget,
  isSameOriginRelativePath,
} from '@/lib/auth/oauthPolicy';
import { resolvePublicOrigin } from '@/lib/http/publicOrigin';

describe('oauthPolicy', () => {
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

  afterEach(() => {
    if (originalAppUrl === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
    }
  });

  describe('resolvePublicOrigin', () => {
    it('prefers the configured URL and strips non-origin components', () => {
      process.env.NEXT_PUBLIC_APP_URL =
        'https://user:password@example.com/injected/path?next=/admin#fragment';

      expect(resolvePublicOrigin('http://internal:3000/request')).toBe('https://example.com');
    });

    it('falls back to the request origin when no configured URL exists', () => {
      delete process.env.NEXT_PUBLIC_APP_URL;

      expect(resolvePublicOrigin('http://internal:3000')).toBe('http://internal:3000');
    });

    it.each(['not a URL', 'ftp://example.com', 'javascript:alert(1)'])(
      'falls back for malformed or unsupported configuration %s',
      (configuredUrl) => {
        process.env.NEXT_PUBLIC_APP_URL = configuredUrl;

        expect(resolvePublicOrigin('http://internal:3000')).toBe('http://internal:3000');
      },
    );
  });

  describe('getDefaultNewProfileRole', () => {
    it('always returns customer', () => {
      expect(getDefaultNewProfileRole()).toBe('customer');
    });
  });

  describe('getOAuthRedirectTarget', () => {
    const origin = 'http://localhost:3000';

    it('routes admin to provided admin redirect', () => {
      expect(getOAuthRedirectTarget({ origin, redirectTo: '/admin', userRole: 'admin' })).toBe(
        'http://localhost:3000/admin',
      );
    });

    it('routes owner role to owner dashboard', () => {
      expect(
        getOAuthRedirectTarget({
          origin,
          redirectTo: '/',
          userRole: 'food_truck_owner',
        }),
      ).toBe('http://localhost:3000/owner-dashboard');
    });

    it('routes customer to a validated non-root redirect target', () => {
      expect(getOAuthRedirectTarget({ origin, redirectTo: '/pricing', userRole: 'customer' })).toBe(
        'http://localhost:3000/pricing',
      );
    });

    it('routes customer to home when redirectTo is the fallback root', () => {
      expect(getOAuthRedirectTarget({ origin, redirectTo: '/', userRole: 'customer' })).toBe(
        'http://localhost:3000/',
      );
    });

    it('routes legacy user role to a validated non-root redirect target', () => {
      expect(getOAuthRedirectTarget({ origin, redirectTo: '/pricing', userRole: 'user' })).toBe(
        'http://localhost:3000/pricing',
      );
    });

    it('routes legacy user role to home when redirectTo is the fallback root', () => {
      expect(getOAuthRedirectTarget({ origin, redirectTo: '/', userRole: 'user' })).toBe(
        'http://localhost:3000/',
      );
    });

    it('routes unknown role to unauthorized page', () => {
      expect(
        getOAuthRedirectTarget({
          origin,
          redirectTo: '/admin',
          userRole: 'unexpected_role',
        }),
      ).toBe('http://localhost:3000/unauthorized');
    });
  });

  describe('isSameOriginRelativePath', () => {
    it('accepts a same-origin path', () => {
      expect(isSameOriginRelativePath('/pricing', 'https://truckfull.food')).toBe(true);
    });

    it.each(['https://truckfull.food', 'http://internal:3000'])(
      'rejects external targets under origin %s',
      (origin) => {
        for (const target of ['/\\evil.example', '//evil.example', 'https://evil.example/path']) {
          expect(isSameOriginRelativePath(target, origin)).toBe(false);
        }
      },
    );
  });
});
