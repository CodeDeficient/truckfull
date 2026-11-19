/**
 * @jest-environment node
 */

import { describe, it, expect } from '@jest/globals';
import { isAdminRole } from '@/lib/hooks/useAdminAuth';

describe('isAdminRole (pure function)', () => {
  it('returns true for admin role', () => {
    expect(isAdminRole('admin')).toBe(true);
  });

  it('returns true for superadmin role', () => {
    expect(isAdminRole('superadmin')).toBe(true);
  });

  it('returns false for regular user role', () => {
    expect(isAdminRole('user')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isAdminRole('')).toBe(false);
  });

  it('returns false for unknown roles', () => {
    expect(isAdminRole('moderator')).toBe(false);
    expect(isAdminRole('editor')).toBe(false);
  });
});