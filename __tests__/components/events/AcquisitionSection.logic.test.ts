import { describe, it, expect } from '@jest/globals';
import { buildAcquisitionPrimaryCta } from '@/components/events/AcquisitionSection';
import {
  buildEventAudiencePathSelected,
  buildOrganizerWaitlistSubmitted,
} from '@/lib/analytics/funnel';

const NOW = new Date('2026-09-06T12:00:00Z');

describe('buildAcquisitionPrimaryCta', () => {
  it('loading yields no actionable CTA', () => {
    expect(
      buildAcquisitionPrimaryCta(
        {
          isLoading: true,
          authenticated: true,
          subscriptionTier: 'pro',
          stripeSubscriptionId: 'sub_123',
          subscriptionEndsAt: null,
        },
        NOW,
      ),
    ).toBeNull();
  });

  it('anonymous yields the auth URL with returnTo=/pricing and eligible-trial wording', () => {
    const cta = buildAcquisitionPrimaryCta(
      {
        isLoading: false,
        authenticated: false,
        subscriptionTier: 'free',
        stripeSubscriptionId: null,
        subscriptionEndsAt: null,
      },
      NOW,
    );
    expect(cta).toEqual({
      label: 'Explore vending opportunities',
      href: '/?auth=open&returnTo=%2Fpricing',
      supportLine: 'Free to join · Eligible accounts get 30 days of Pro · No card required',
    });
  });

  it('authenticated free yields /pricing with no trial promise', () => {
    const cta = buildAcquisitionPrimaryCta(
      {
        isLoading: false,
        authenticated: true,
        subscriptionTier: 'free',
        stripeSubscriptionId: null,
        subscriptionEndsAt: null,
      },
      NOW,
    );
    expect(cta).toEqual({
      label: 'Explore event tools',
      href: '/pricing',
      supportLine: null,
    });
  });

  it('active trial (pro tier, future endsAt, no Stripe id) yields /owner-dashboard/events', () => {
    const cta = buildAcquisitionPrimaryCta(
      {
        isLoading: false,
        authenticated: true,
        subscriptionTier: 'pro',
        stripeSubscriptionId: null,
        subscriptionEndsAt: '2026-10-01T00:00:00Z',
      },
      NOW,
    );
    expect(cta).toEqual({
      label: 'Open event discovery',
      href: '/owner-dashboard/events',
      supportLine: null,
    });
  });

  it('paid Pro (Stripe subscription id) yields /owner-dashboard/events', () => {
    const cta = buildAcquisitionPrimaryCta(
      {
        isLoading: false,
        authenticated: true,
        subscriptionTier: 'pro',
        stripeSubscriptionId: 'sub_123',
        subscriptionEndsAt: null,
      },
      NOW,
    );
    expect(cta).toEqual({
      label: 'Open event discovery',
      href: '/owner-dashboard/events',
      supportLine: null,
    });
  });

  it('enterprise yields /owner-dashboard/events', () => {
    const cta = buildAcquisitionPrimaryCta(
      {
        isLoading: false,
        authenticated: true,
        subscriptionTier: 'enterprise',
        stripeSubscriptionId: null,
        subscriptionEndsAt: null,
      },
      NOW,
    );
    expect(cta).toEqual({
      label: 'Open event discovery',
      href: '/owner-dashboard/events',
      supportLine: null,
    });
  });

  it('expired Pro (endsAt in the past, no Stripe id) yields /pricing', () => {
    const cta = buildAcquisitionPrimaryCta(
      {
        isLoading: false,
        authenticated: true,
        subscriptionTier: 'pro',
        stripeSubscriptionId: null,
        subscriptionEndsAt: '2026-08-01T00:00:00Z',
      },
      NOW,
    );
    expect(cta).toEqual({
      label: 'Explore event tools',
      href: '/pricing',
      supportLine: null,
    });
  });
});

describe('acquisition analytics builders', () => {
  it('all four audiences produce event_audience_path_selected with correct properties', () => {
    const audiences = ['vendor', 'truck_owner', 'organizer', 'foodie'] as const;
    for (const audience of audiences) {
      const { event, properties } = buildEventAudiencePathSelected(
        audience,
        'event_detail_acquisition',
      );
      expect(event).toBe('event_audience_path_selected');
      expect(properties).toEqual({ audience, cta_location: 'event_detail_acquisition' });
    }
  });

  it('organizer_waitlist_submitted carries its cta_location', () => {
    const { event, properties } = buildOrganizerWaitlistSubmitted('event_detail_acquisition');
    expect(event).toBe('organizer_waitlist_submitted');
    expect(properties).toEqual({ cta_location: 'event_detail_acquisition' });
  });
});
