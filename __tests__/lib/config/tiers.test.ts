import { describe, it, expect } from '@jest/globals';
import {
  getTierLimits,
  canReserveHotspot,
  getTierDisplayName,
} from '@/lib/config/tiers';

describe('tiers', () => {
  describe('getTierLimits', () => {
    it('returns limits for free tier', () => {
      const limits = getTierLimits('free');
      expect(limits.canReserveHotspots).toBe(false);
      expect(limits.maxReservationsAtOnce).toBe(0);
      expect(limits.maxTrucks).toBe(1);
    });

    it('returns limits for pro tier', () => {
      const limits = getTierLimits('pro');
      expect(limits.canReserveHotspots).toBe(true);
      expect(limits.maxReservationDays).toBeNull();
      expect(limits.maxReservationsAtOnce).toBe(5);
      expect(limits.maxTrucks).toBe(10);
    });

    it('returns limits for admin tier', () => {
      const limits = getTierLimits('admin');
      expect(limits.canReserveHotspots).toBe(true);
      expect(limits.maxReservationDays).toBeNull();
      expect(limits.maxReservationsAtOnce).toBe(Infinity);
      expect(limits.maxTrucks).toBe(Infinity);
    });

    it('maps invalid tier to free tier limits', () => {
      const limits = getTierLimits('invalid');
      expect(limits.canReserveHotspots).toBe(false);
      expect(limits.maxReservationsAtOnce).toBe(0);
      expect(limits.maxTrucks).toBe(1);
    });
  });

  describe('canReserveHotspot', () => {
    it('returns false for free tier', () => {
      expect(canReserveHotspot('free', 1)).toBe(false);
    });

    it('returns true for pro tier regardless of days', () => {
      expect(canReserveHotspot('pro', 30)).toBe(true);
    });

    it('returns true for admin tier', () => {
      expect(canReserveHotspot('admin', 365)).toBe(true);
    });
  });

  describe('getTierDisplayName', () => {
    it('returns capitalized tier names', () => {
      expect(getTierDisplayName('free')).toBe('Free');
      expect(getTierDisplayName('pro')).toBe('Pro');
      expect(getTierDisplayName('admin')).toBe('Admin');
    });

    it('maps unknown tier to Free', () => {
      expect(getTierDisplayName('unknown')).toBe('Free');
    });
  });
});