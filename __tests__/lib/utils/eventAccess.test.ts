import {
  getEventAccess,
  getDocumentVisibility,
  getApplicationPriority,
  SubscriptionTier,
  EventAccessResult,
} from '@/lib/utils/eventAccess';

describe('Event Access Utilities', () => {
  describe('getEventAccess', () => {
    describe('Free Tier', () => {
      it('should allow viewing public free events but restrict application', () => {
        const tier: SubscriptionTier = 'free';
        const event = { vendor_fee: 0, is_public: true };
        const result = getEventAccess(tier, event);

        expect(result.canView).toBe(true);
        expect(result.canApply).toBe(false);
        expect(result.canSeeDocuments).toBe(false);
        expect(result.canSeeFullDetails).toBe(true);
        expect(result.restrictionReason).toBe('Upgrade to apply to events');
        expect(result.upgradeTarget).toBe('pro');
      });

      it('should restrict applying to paid events (even if public)', () => {
        const tier: SubscriptionTier = 'free';
        const event = { vendor_fee: 50, is_public: true };
        const result = getEventAccess(tier, event);

        expect(result.canView).toBe(true);
        expect(result.canApply).toBe(false);
        expect(result.restrictionReason).toBe('Upgrade to apply to events');
        expect(result.upgradeTarget).toBe('pro');
      });

      it('should handle undefined tier as free', () => {
        const tier: SubscriptionTier = undefined;
        const event = { vendor_fee: 0, is_public: true };
        const result = getEventAccess(tier, event);

        expect(result.canView).toBe(true);
        expect(result.canApply).toBe(false);
      });
    });

    describe('Pro Tier', () => {
      it('should allow full access to paid events', () => {
        const tier: SubscriptionTier = 'pro';
        const event = { vendor_fee: 100, is_public: true };
        const result = getEventAccess(tier, event);

        expect(result.canView).toBe(true);
        expect(result.canApply).toBe(true);
        expect(result.canSeeDocuments).toBe(true);
        expect(result.canSeeFullDetails).toBe(true);
        expect(result.restrictionReason).toBeUndefined();
      });

      it('should allow full access to free events', () => {
        const tier: SubscriptionTier = 'pro';
        const event = { vendor_fee: 0, is_public: true };
        const result = getEventAccess(tier, event);

        expect(result.canView).toBe(true);
        expect(result.canApply).toBe(true);
        expect(result.canSeeDocuments).toBe(true);
      });

      it('should allow viewing private events', () => {
        const tier: SubscriptionTier = 'pro';
        const event = { vendor_fee: 0, is_public: false };
        const result = getEventAccess(tier, event);

        expect(result.canView).toBe(true);
        expect(result.canApply).toBe(true);
      });
    });

    describe('Edge Cases', () => {
      it('should handle null vendor_fee as 0 (free event)', () => {
        const tier: SubscriptionTier = 'pro';
        const event = { vendor_fee: null, is_public: true };
        const result = getEventAccess(tier, event);

        expect(result.canApply).toBe(true);
      });

      it('should default is_public to true if undefined', () => {
        const tier: SubscriptionTier = 'free';
        const event = { vendor_fee: 0 };
        const result = getEventAccess(tier, event);

        expect(result.canView).toBe(true);
      });
    });
  });

  describe('getDocumentVisibility', () => {
    it('should return full visibility for Pro tier', () => {
      const visibility = getDocumentVisibility('pro');
      expect(visibility).toEqual({
        canSeeBadge: true,
        canSeeBasicDocs: true,
        canSeeAllDocs: true,
        canSeeReviews: true,
      });
    });

    it('should return minimal visibility for Free tier', () => {
      const visibility = getDocumentVisibility('free');
      expect(visibility).toEqual({
        canSeeBadge: true,
        canSeeBasicDocs: false,
        canSeeAllDocs: false,
        canSeeReviews: false,
      });
    });

    it('should return minimal visibility for undefined tier', () => {
      const visibility = getDocumentVisibility(undefined);
      expect(visibility).toEqual({
        canSeeBadge: true,
        canSeeBasicDocs: false,
        canSeeAllDocs: false,
        canSeeReviews: false,
      });
    });
  });

  describe('getApplicationPriority', () => {
    it('should return same priority for all tiers (ranking boost removed)', () => {
      const pro = getApplicationPriority('pro');
      const free = getApplicationPriority('free');
      const undef = getApplicationPriority(undefined);
      expect(pro).toBe(1);
      expect(free).toBe(1);
      expect(undef).toBe(1);
    });
  });
});