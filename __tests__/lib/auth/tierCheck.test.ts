/**
 * @jest-environment node
 */

import {
  TIER_FEATURES,
  hasFeatureAccess,
  getMaxTrucks,
  getAutoUpdateFrequency,
  canAccessAnalytics,
  canAccessAdvancedAnalytics,
  canAccessAutoUpdates,
  canExportReports,
  getTierDisplayInfo,
  getUpgradePath,
  getFeatureComparison,
  SubscriptionTier,
} from '@/lib/auth/tierCheck';

describe('lib/auth/tierCheck.ts', () => {
  describe('TIER_FEATURES', () => {
    it('should have correct structure for all tiers', () => {
      const tiers = ['free', 'pro', 'enterprise'] as const;
      tiers.forEach((tier) => {
        expect(TIER_FEATURES).toHaveProperty(tier);
        const features = TIER_FEATURES[tier];
        expect(features).toHaveProperty('maxTrucks');
        expect(features).toHaveProperty('autoUpdates');
        expect(features).toHaveProperty('autoUpdateFrequency');
        expect(features).toHaveProperty('basicAnalytics');
        expect(features).toHaveProperty('advancedAnalytics');
        expect(features).toHaveProperty('eventTracking');
        expect(features).toHaveProperty('exportReports');
        expect(features).toHaveProperty('featuredDishes');
      });
    });

    it('should have correct values for free tier', () => {
      const free = TIER_FEATURES.free;
      expect(free.maxTrucks).toBe(1);
      expect(free.autoUpdates).toBe(false);
      expect(free.autoUpdateFrequency).toBeNull();
      expect(free.basicAnalytics).toBe(true);
      expect(free.advancedAnalytics).toBe(true);
      expect(free.eventTracking).toBe(false);
      expect(free.exportReports).toBe(false);
      expect(free.featuredDishes).toBe(0);
    });

    it('should have correct values for pro tier', () => {
      const pro = TIER_FEATURES.pro;
      expect(pro.maxTrucks).toBe(Infinity);
      expect(pro.autoUpdates).toBe(true);
      expect(pro.autoUpdateFrequency).toBe('daily');
      expect(pro.basicAnalytics).toBe(true);
      expect(pro.advancedAnalytics).toBe(true);
      expect(pro.eventTracking).toBe(true);
      expect(pro.exportReports).toBe(true);
      expect(pro.featuredDishes).toBe(3);
    });

    it('should have correct values for enterprise tier', () => {
      const enterprise = TIER_FEATURES.enterprise;
      expect(enterprise.maxTrucks).toBe(Infinity);
      expect(enterprise.autoUpdates).toBe(true);
      expect(enterprise.autoUpdateFrequency).toBe('hourly');
      expect(enterprise.basicAnalytics).toBe(true);
      expect(enterprise.advancedAnalytics).toBe(true);
      expect(enterprise.eventTracking).toBe(true);
      expect(enterprise.exportReports).toBe(true);
      expect(enterprise.featuredDishes).toBe(10);
    });
  });

  describe('hasFeatureAccess()', () => {
    describe('boolean features', () => {
      it('should return true for enabled boolean features', () => {
        expect(hasFeatureAccess('pro', 'advancedAnalytics')).toBe(true);
        expect(hasFeatureAccess('enterprise', 'exportReports')).toBe(true);
      });

      it('should return false for disabled boolean features', () => {
        expect(hasFeatureAccess('free', 'autoUpdates')).toBe(false);
        expect(hasFeatureAccess('free', 'exportReports')).toBe(false);
      });
    });

    describe('numeric features', () => {
      it('should return true for tiers with maxTrucks > 0', () => {
        expect(hasFeatureAccess('free', 'maxTrucks')).toBe(true);
        expect(hasFeatureAccess('pro', 'maxTrucks')).toBe(true);
      });

      it('should return false for featuredDishes when 0', () => {
        expect(hasFeatureAccess('free', 'featuredDishes')).toBe(false);
        expect(hasFeatureAccess('pro', 'featuredDishes')).toBe(true);
      });
    });

    describe('string features', () => {
      it('should return true for tiers with non-null autoUpdateFrequency', () => {
        expect(hasFeatureAccess('pro', 'autoUpdateFrequency')).toBe(true);
      });

      it('should return false for free tier with null autoUpdateFrequency', () => {
        expect(hasFeatureAccess('free', 'autoUpdateFrequency')).toBe(false);
      });
    });
  });

  describe('getMaxTrucks()', () => {
    it('should return correct max trucks for each tier', () => {
      expect(getMaxTrucks('free')).toBe(1);
      expect(getMaxTrucks('pro')).toBe(Infinity);
      expect(getMaxTrucks('enterprise')).toBe(Infinity);
    });
  });

  describe('getAutoUpdateFrequency()', () => {
    it('should return correct frequency for each tier', () => {
      expect(getAutoUpdateFrequency('free')).toBeNull();
      expect(getAutoUpdateFrequency('pro')).toBe('daily');
      expect(getAutoUpdateFrequency('enterprise')).toBe('hourly');
    });
  });

  describe('canAccessAnalytics()', () => {
    it('should return true for all tiers (analytics now free)', () => {
      expect(canAccessAnalytics('free')).toBe(true);
      expect(canAccessAnalytics('pro')).toBe(true);
      expect(canAccessAnalytics('enterprise')).toBe(true);
    });
  });

  describe('canAccessAdvancedAnalytics()', () => {
    it('should return true for all tiers (analytics now free)', () => {
      expect(canAccessAdvancedAnalytics('free')).toBe(true);
      expect(canAccessAdvancedAnalytics('pro')).toBe(true);
      expect(canAccessAdvancedAnalytics('enterprise')).toBe(true);
    });
  });

  describe('canAccessAutoUpdates()', () => {
    it('should return true for tiers with autoUpdates enabled', () => {
      expect(canAccessAutoUpdates('pro')).toBe(true);
      expect(canAccessAutoUpdates('enterprise')).toBe(true);
    });

    it('should return false for free tier', () => {
      expect(canAccessAutoUpdates('free')).toBe(false);
    });
  });

  describe('canExportReports()', () => {
    it('should return true only for pro and enterprise tiers', () => {
      expect(canExportReports('pro')).toBe(true);
      expect(canExportReports('enterprise')).toBe(true);
    });

    it('should return false for free tier', () => {
      expect(canExportReports('free')).toBe(false);
    });
  });

  describe('getTierDisplayInfo()', () => {
    it('should return correct display info for free tier', () => {
      const info = getTierDisplayInfo('free');
      expect(info.name).toBe('free');
      expect(info.displayName).toBe('Free');
      expect(info.color).toBe('text-gray-600');
      expect(info.badge).toBe('💚 Free');
      expect(info.price).toBe('$0/mo');
    });

it.skip('should return correct display info for pro tier', () => {
      const info = getTierDisplayInfo('pro');
      expect(info.name).toBe('pro');
      expect(info.displayName).toBe('Pro');
      expect(info.color).toBe('text-purple-600');
      expect(info.badge).toBe('🟣 Pro');
      expect(info.price).toBe('$100/mo');
    });

    it('should return correct display info for enterprise tier', () => {
      const info = getTierDisplayInfo('enterprise');
      expect(info.name).toBe('enterprise');
      expect(info.displayName).toBe('Enterprise');
      expect(info.color).toBe('text-indigo-600');
      expect(info.badge).toBe('🏢 Enterprise');
      expect(info.price).toBe('Custom');
    });
  });

  describe('getUpgradePath()', () => {
    it('should return correct upgrade path for each tier', () => {
      expect(getUpgradePath('free')).toBe('pro');
      expect(getUpgradePath('pro')).toBe('enterprise');
      expect(getUpgradePath('enterprise')).toBeNull();
    });
  });

  describe('getFeatureComparison()', () => {
    it('should return correct comparison for free to pro', () => {
      const comparison = getFeatureComparison('free', 'pro');
      expect(comparison).toHaveLength(4);

      const trucks = comparison.find((c) => c.feature === 'Trucks');
      expect(trucks?.current).toBe('1');
      expect(trucks?.target).toBe('Unlimited');

      const autoUpdates = comparison.find((c) => c.feature === 'Auto-Updates');
      expect(autoUpdates?.current).toBe('None');
      expect(autoUpdates?.target).toBe('daily');

      const analytics = comparison.find((c) => c.feature === 'Analytics');
      expect(analytics?.current).toBe('Advanced');
      expect(analytics?.target).toBe('Advanced');

      const dishes = comparison.find((c) => c.feature === 'Featured Dishes');
      expect(dishes?.current).toBe('0');
      expect(dishes?.target).toBe('3');
    });

    it('should return correct comparison for pro to enterprise', () => {
      const comparison = getFeatureComparison('pro', 'enterprise');
      expect(comparison).toHaveLength(4);

      const trucks = comparison.find((c) => c.feature === 'Trucks');
      expect(trucks?.current).toBe('Unlimited');
      expect(trucks?.target).toBe('Unlimited');

      const autoUpdates = comparison.find((c) => c.feature === 'Auto-Updates');
      expect(autoUpdates?.current).toBe('daily');
      expect(autoUpdates?.target).toBe('hourly');

      const analytics = comparison.find((c) => c.feature === 'Analytics');
      expect(analytics?.current).toBe('Advanced');
      expect(analytics?.target).toBe('Advanced');

      const dishes = comparison.find((c) => c.feature === 'Featured Dishes');
      expect(dishes?.current).toBe('3');
      expect(dishes?.target).toBe('10');
    });
  });
});
