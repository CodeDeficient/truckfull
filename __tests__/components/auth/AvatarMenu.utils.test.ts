import { describe, it, expect } from '@jest/globals';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { getUserInitials, getUserDisplayName } from '@/components/auth/AvatarMenu.utils';

describe('AvatarMenu.utils', () => {
  describe('getUserInitials', () => {
    it('should return ? when user is null', () => {
      expect(getUserInitials(null)).toBe('?');
    });

    it('should return ? when user metadata is null', () => {
      const user = { email: 'test@test.com' } as SupabaseUser;
      expect(getUserInitials(user)).toBe('TE');
    });

    it('should extract initials from full_name', () => {
      const user = {
        email: 'test@test.com',
        user_metadata: { full_name: 'John Doe' },
      } as SupabaseUser;
      expect(getUserInitials(user)).toBe('JD');
    });

    it('should extract initials from first_name and last_name', () => {
      const user = {
        email: 'test@test.com',
        user_metadata: { first_name: 'John', last_name: 'Doe' },
      } as SupabaseUser;
      expect(getUserInitials(user)).toBe('JD');
    });

    it('should fall back to email when no name metadata', () => {
      const user = {
        email: 'johndoe@test.com',
        user_metadata: {},
      } as SupabaseUser;
      expect(getUserInitials(user)).toBe('JO');
    });

    it('should handle empty full_name', () => {
      const user = {
        email: 'test@test.com',
        user_metadata: { full_name: '' },
      } as SupabaseUser;
      expect(getUserInitials(user)).toBe('TE');
    });

    it('should handle single name in full_name', () => {
      const user = {
        email: 'test@test.com',
        user_metadata: { full_name: 'John' },
      } as SupabaseUser;
      expect(getUserInitials(user)).toBe('J');
    });

    it('should handle more than 2 names in full_name', () => {
      const user = {
        email: 'test@test.com',
        user_metadata: { full_name: 'John Michael Doe' },
      } as SupabaseUser;
      expect(getUserInitials(user)).toBe('JM');
    });

    it('should handle metadata with name property', () => {
      const user = {
        email: 'test@test.com',
        user_metadata: { name: 'Test User' },
      } as SupabaseUser;
      expect(getUserInitials(user)).toBe('TE');
    });

    it('should prioritize full_name over first/last name', () => {
      const user = {
        email: 'test@test.com',
        user_metadata: {
          full_name: 'Full Name',
          first_name: 'First',
          last_name: 'Last',
        },
      } as SupabaseUser;
      expect(getUserInitials(user)).toBe('FN');
    });
  });

  describe('getUserDisplayName', () => {
    it('should return Anonymous when user is null', () => {
      expect(getUserDisplayName(null)).toBe('Anonymous');
    });

    it('should return Anonymous when user metadata is null', () => {
      const user = { email: 'test@test.com' } as SupabaseUser;
      expect(getUserDisplayName(user)).toBe('test');
    });

    it('should return full_name when available', () => {
      const user = {
        email: 'test@test.com',
        user_metadata: { full_name: 'John Doe' },
      } as SupabaseUser;
      expect(getUserDisplayName(user)).toBe('John Doe');
    });

    it('should return first and last name combined', () => {
      const user = {
        email: 'test@test.com',
        user_metadata: { first_name: 'John', last_name: 'Doe' },
      } as SupabaseUser;
      expect(getUserDisplayName(user)).toBe('John Doe');
    });

    it('should return name from metadata', () => {
      const user = {
        email: 'test@test.com',
        user_metadata: { name: 'Test User' },
      } as SupabaseUser;
      expect(getUserDisplayName(user)).toBe('Test User');
    });

    it('should return email username when no name available', () => {
      const user = {
        email: 'johndoe@test.com',
        user_metadata: {},
      } as SupabaseUser;
      expect(getUserDisplayName(user)).toBe('johndoe');
    });

    it('should return User when nothing available', () => {
      const user = {
        email: '',
        user_metadata: {},
      } as SupabaseUser;
      expect(getUserDisplayName(user)).toBe('User');
    });

    it('should prioritize full_name over other name fields', () => {
      const user = {
        email: 'test@test.com',
        user_metadata: {
          full_name: 'Full Name',
          first_name: 'First',
          last_name: 'Last',
          name: 'Metadata Name',
        },
      } as SupabaseUser;
      expect(getUserDisplayName(user)).toBe('Full Name');
    });

    it('should use first and last name over name field', () => {
      const user = {
        email: 'test@test.com',
        user_metadata: {
          first_name: 'First',
          last_name: 'Last',
          name: 'Metadata Name',
        },
      } as SupabaseUser;
      expect(getUserDisplayName(user)).toBe('First Last');
    });

    it('should use name field when first/last not complete', () => {
      const user = {
        email: 'test@test.com',
        user_metadata: {
          name: 'Metadata Name',
        },
      } as SupabaseUser;
      expect(getUserDisplayName(user)).toBe('Metadata Name');
    });
  });
});
