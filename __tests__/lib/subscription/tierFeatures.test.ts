import { TIER_FEATURES, hasFeature, getMaxLeads, type Tier } from '@/lib/subscription/tierFeatures';

describe('tierFeatures', () => {
  describe('TIER_FEATURES', () => {
    it('free tier cannot view vetting research', () => {
      expect(TIER_FEATURES.free.canViewVettingResearch).toBe(false);
    });

    it('pro tier can view vetting research', () => {
      expect(TIER_FEATURES.pro.canViewVettingResearch).toBe(true);
    });

    it('free tier cannot view traffic hotspots', () => {
      expect(TIER_FEATURES.free.canViewTrafficHotspots).toBe(false);
    });

    it('pro tier can view traffic hotspots', () => {
      expect(TIER_FEATURES.pro.canViewTrafficHotspots).toBe(true);
    });

    it('all tiers can apply to events', () => {
      expect(TIER_FEATURES.free.canApplyToEvents).toBe(true);
      expect(TIER_FEATURES.pro.canApplyToEvents).toBe(true);
    });

    it('free tier can save leads', () => {
      expect(TIER_FEATURES.free.canSaveLeads).toBe(true);
    });

    it('pro tier can save leads', () => {
      expect(TIER_FEATURES.pro.canSaveLeads).toBe(true);
    });

    it('free tier has max 3 event applications', () => {
      expect(TIER_FEATURES.free.maxEventsApplyCount).toBe(3);
    });

    it('pro tier has unlimited event applications', () => {
      expect(TIER_FEATURES.pro.maxEventsApplyCount).toBe(-1);
    });

    it('free tier has 5 saved leads', () => {
      expect(TIER_FEATURES.free.maxSavedLeads).toBe(5);
    });

    it('pro tier has unlimited saved leads', () => {
      expect(TIER_FEATURES.pro.maxSavedLeads).toBe(-1);
    });

    it('free tier can view external events', () => {
      expect(TIER_FEATURES.free.canViewExternalEvents).toBe(true);
    });

    it('pro tier can view external events', () => {
      expect(TIER_FEATURES.pro.canViewExternalEvents).toBe(true);
    });

    it('free tier cannot create hotspots', () => {
      expect(TIER_FEATURES.free.canCreateHotspots).toBe(false);
    });

    it('pro tier can create hotspots', () => {
      expect(TIER_FEATURES.pro.canCreateHotspots).toBe(true);
    });
  });

  describe('hasFeature', () => {
    it('returns false for free tier canViewVettingResearch', () => {
      expect(hasFeature('free', 'canViewVettingResearch')).toBe(false);
    });

    it('returns true for pro tier canViewVettingResearch', () => {
      expect(hasFeature('pro', 'canViewVettingResearch')).toBe(true);
    });

    it('returns true for free tier canSaveLeads', () => {
      expect(hasFeature('free', 'canSaveLeads')).toBe(true);
    });

    it('returns true for pro tier canSaveLeads', () => {
      expect(hasFeature('pro', 'canSaveLeads')).toBe(true);
    });

    it('returns correct boolean for each tier', () => {
      expect(hasFeature('free', 'canViewTrafficHotspots')).toBe(false);
      expect(hasFeature('pro', 'canViewTrafficHotspots')).toBe(true);
    });

    it('returns correct boolean for canViewExternalEvents', () => {
      expect(hasFeature('free', 'canViewExternalEvents')).toBe(true);
      expect(hasFeature('pro', 'canViewExternalEvents')).toBe(true);
    });

    it('returns correct boolean for canCreateHotspots', () => {
      expect(hasFeature('free', 'canCreateHotspots')).toBe(false);
      expect(hasFeature('pro', 'canCreateHotspots')).toBe(true);
    });
  });

  describe('getMaxLeads', () => {
    it('returns 5 for free tier', () => {
      expect(getMaxLeads('free')).toBe(5);
    });

    it('returns -1 for pro tier (unlimited)', () => {
      expect(getMaxLeads('pro')).toBe(-1);
    });
  });
});
