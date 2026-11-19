import { evaluateAuthGate, type AuthGateOptions } from '@/lib/auth/apiAccessPolicy';

const ADMIN_ONLY: AuthGateOptions = { requiresAdmin: true };
const AUTH_REQUIRED: AuthGateOptions = { requiresAdmin: false };

describe('evaluateAuthGate', () => {
  describe('admin-only endpoints', () => {
    it('returns unauthorized for anonymous callers', () => {
      expect(evaluateAuthGate(null, null, ADMIN_ONLY)).toBe('unauthorized');
      expect(evaluateAuthGate(undefined, undefined, ADMIN_ONLY)).toBe('unauthorized');
      expect(evaluateAuthGate('', undefined, ADMIN_ONLY)).toBe('unauthorized');
    });

    it('returns forbidden for authenticated non-admin roles', () => {
      expect(evaluateAuthGate('user-1', 'customer', ADMIN_ONLY)).toBe('forbidden');
      expect(evaluateAuthGate('user-1', 'food_truck_owner', ADMIN_ONLY)).toBe('forbidden');
      expect(evaluateAuthGate('user-1', undefined, ADMIN_ONLY)).toBe('forbidden');
      expect(evaluateAuthGate('user-1', '', ADMIN_ONLY)).toBe('forbidden');
    });

    it('allows admins and superadmins', () => {
      expect(evaluateAuthGate('admin-1', 'admin', ADMIN_ONLY)).toBe('allow');
      expect(evaluateAuthGate('admin-1', 'superadmin', ADMIN_ONLY)).toBe('allow');
    });
  });

  describe('authenticated endpoints', () => {
    it('returns unauthorized for anonymous callers', () => {
      expect(evaluateAuthGate(null, 'admin', AUTH_REQUIRED)).toBe('unauthorized');
      expect(evaluateAuthGate('', 'admin', AUTH_REQUIRED)).toBe('unauthorized');
    });

    it('allows any authenticated role', () => {
      expect(evaluateAuthGate('user-1', 'customer', AUTH_REQUIRED)).toBe('allow');
      expect(evaluateAuthGate('user-1', 'food_truck_owner', AUTH_REQUIRED)).toBe('allow');
      expect(evaluateAuthGate('admin-1', 'admin', AUTH_REQUIRED)).toBe('allow');
    });
  });
});
