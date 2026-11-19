/**
 * @jest-environment node
 */

import { describe, it, expect } from '@jest/globals';
import {
  normalizeEmail,
  buildAdminClaimUpdate,
  findMatchingTruckFromRows,
} from '@/lib/services/claimService';
import { escapeIlike } from '@/lib/claim/escapeIlike';

describe('claimService — pure functions', () => {
  describe('normalizeEmail', () => {
    it('lowercases and trims email', () => {
      expect(normalizeEmail('  TEST@Example.COM  ')).toBe('test@example.com');
    });

    it('handles already-normalized email', () => {
      expect(normalizeEmail('user@example.com')).toBe('user@example.com');
    });

    it('handles mixed case', () => {
      expect(normalizeEmail('SampleTacoTruck@Gmail.Com')).toBe(
        'sampletacotruck@gmail.com',
      );
    });
  });

  describe('escapeIlike', () => {
    it('escapes percent sign', () => {
      expect(escapeIlike('100%')).toBe('100\\%');
    });

    it('escapes underscore', () => {
      expect(escapeIlike('user_name')).toBe('user\\_name');
    });

    it('escapes backslash', () => {
      expect(escapeIlike('path\\file')).toBe('path\\\\file');
    });

    it('does not alter plain strings', () => {
      expect(escapeIlike('taco@example.com')).toBe('taco@example.com');
    });

    it('escapes multiple special characters', () => {
      expect(escapeIlike('user%_name@test.com')).toBe(
        'user\\%\\_name@test.com',
      );
    });
  });

  describe('buildAdminClaimUpdate', () => {
    it('includes all required claim fields', () => {
      const result = buildAdminClaimUpdate('user-123');

      expect(result).toMatchObject({
        owner_id: 'user-123',
        is_claimed: true,
        claimed_by: 'user-123',
        claim_verification_method: 'admin',
      });
      expect(result.claimed_at).toBeDefined();
    });

    it('sets claimed_at to a valid ISO timestamp', () => {
      const result = buildAdminClaimUpdate('user-123');

      expect(new Date(result.claimed_at!).toISOString()).toBe(result.claimed_at);
    });

    it('uses different user IDs correctly', () => {
      const result = buildAdminClaimUpdate('other-user');
      expect(result.owner_id).toBe('other-user');
      expect(result.claimed_by).toBe('other-user');
    });
  });

  describe('findMatchingTruckFromRows', () => {
    it('returns null for empty rows', () => {
      expect(findMatchingTruckFromRows([])).toBeNull();
    });

    it('returns truck with id, name, photo_url, cuisine_type', () => {
      const rows = [
        {
          id: 'truck-1',
          name: 'Taco Truck',
          contact_info: { email: 'taco@example.com', photo_url: '/taco.jpg' },
          cuisine_type: ['Mexican'],
        },
      ];

      const result = findMatchingTruckFromRows(rows as any);

      expect(result).toEqual({
        id: 'truck-1',
        name: 'Taco Truck',
        photo_url: '/taco.jpg',
        cuisine_type: ['Mexican'],
      });
    });

    it('returns null name as Unknown Truck', () => {
      const rows = [
        {
          id: 'truck-1',
          name: null,
          contact_info: { email: 'taco@example.com' },
          cuisine_type: null,
        },
      ];

      const result = findMatchingTruckFromRows(rows as any);

      expect(result).toEqual({
        id: 'truck-1',
        name: 'Unknown Truck',
        photo_url: null,
        cuisine_type: null,
      });
    });

    it('handles null contact_info', () => {
      const rows = [
        {
          id: 'truck-1',
          name: 'Truck',
          contact_info: null,
          cuisine_type: [],
        },
      ];

      const result = findMatchingTruckFromRows(rows as any);

      expect(result).toEqual({
        id: 'truck-1',
        name: 'Truck',
        photo_url: null,
        cuisine_type: [],
      });
    });

    it('returns first match from multiple rows', () => {
      const rows = [
        {
          id: 'truck-1',
          name: 'First',
          contact_info: { email: 'first@example.com' },
          cuisine_type: ['Mexican'],
        },
        {
          id: 'truck-2',
          name: 'Second',
          contact_info: { email: 'second@example.com' },
          cuisine_type: ['Italian'],
        },
      ];

      const result = findMatchingTruckFromRows(rows as any);

      expect(result!.id).toBe('truck-1');
    });
  });
});
