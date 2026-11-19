import { describe, it, expect } from '@jest/globals';
import { normalizeServiceResult } from '@/lib/utils/serviceResultUtils';

describe('serviceResultUtils', () => {
  describe('normalizeServiceResult', () => {
    it('returns empty trucks with error message for error result', () => {
      const result = { error: 'Something went wrong' };
      const normalized = normalizeServiceResult(result);
      expect(normalized.trucks).toEqual([]);
      expect(normalized.error).toBe('Something went wrong');
    });

    it('handles string error', () => {
      const result = { error: 'error message' };
      const normalized = normalizeServiceResult(result);
      expect(normalized.error).toBe('error message');
    });

    it('handles object error', () => {
      const result = { error: { message: 'obj error' } };
      const normalized = normalizeServiceResult(result);
      expect(normalized.error).toBe('{"message":"obj error"}');
    });

    it('handles empty object error', () => {
      const result = { error: {} };
      const normalized = normalizeServiceResult(result);
      expect(normalized.error).toBe('Unknown error');
    });

    it('handles null error', () => {
      const result = { error: null } as unknown as { error: unknown };
      const normalized = normalizeServiceResult(result);
      expect(normalized.error).toBe('Unknown error');
    });

    it('returns empty trucks when trucks is undefined', () => {
      const result = {};
      const normalized = normalizeServiceResult(result);
      expect(normalized.trucks).toEqual([]);
      expect(normalized.error).toBe('No trucks returned');
    });

    it('normalizes trucks with null fields', () => {
      const result = {
        trucks: [
          { id: 't1', description: null, created_at: null, updated_at: null, cuisine_type: null },
        ],
      };
      const normalized = normalizeServiceResult(result);
      expect(normalized.trucks[0].description).toBe('');
      expect(normalized.trucks[0].created_at).toBe('');
      expect(normalized.trucks[0].updated_at).toBe('');
      expect(normalized.trucks[0].cuisine_type).toEqual([]);
    });

    it('preserves existing non-null fields', () => {
      const result = {
        trucks: [{ id: 't1', description: 'Test', created_at: '2024', updated_at: '2024', cuisine_type: ['Vegan'] }],
      };
      const normalized = normalizeServiceResult(result);
      expect(normalized.trucks[0].description).toBe('Test');
      expect(normalized.trucks[0].created_at).toBe('2024');
    });

    it('returns null error on success', () => {
      const result = { trucks: [{ id: 't1' }] };
      const normalized = normalizeServiceResult(result);
      expect(normalized.error).toBeNull();
    });

    it('handles empty trucks array', () => {
      const result = { trucks: [] };
      const normalized = normalizeServiceResult(result);
      expect(normalized.trucks).toEqual([]);
      expect(normalized.error).toBeNull();
    });
  });
});