import { describe, it, expect } from '@jest/globals';
import {
  buildOwnerCtaClicked,
  buildClaimStarted,
  buildTrialStarted,
  buildCheckoutStarted,
  buildSubscriptionActivated,
  buildEventAudiencePathSelected,
  buildOrganizerWaitlistSubmitted,
  shouldEmitCheckoutStarted,
  OWNER_FUNNEL_EVENTS,
} from '@/lib/analytics/funnel';

describe('owner funnel event builders (#1323)', () => {
  it('owner_cta_clicked carries its cta_location', () => {
    const { event, properties } = buildOwnerCtaClicked('event_truck_strip');
    expect(event).toBe('owner_cta_clicked');
    expect(properties).toEqual({ cta_location: 'event_truck_strip' });
  });

  it('claim_started carries its claim_method', () => {
    const { event, properties } = buildClaimStarted('listing_submission');
    expect(event).toBe('claim_started');
    expect(properties).toEqual({ claim_method: 'listing_submission' });
  });

  it('trial_started carries its source', () => {
    const { event, properties } = buildTrialStarted('claim');
    expect(event).toBe('trial_started');
    expect(properties).toEqual({ source: 'claim' });
  });

  it('checkout_started carries tier, interval, founding', () => {
    const { event, properties } = buildCheckoutStarted('pro', 'year', true);
    expect(event).toBe('checkout_started');
    expect(properties).toEqual({ tier: 'pro', interval: 'year', founding: true });
  });

  it('subscription_activated carries tier, from_tier, and a stable insert ID', () => {
    const { event, properties } = buildSubscriptionActivated('pro', 'free', 'evt_123');
    expect(event).toBe('subscription_activated');
    expect(properties).toEqual({ tier: 'pro', from_tier: 'free', $insert_id: 'evt_123' });
  });

  it('subscription_activated tolerates an unknown prior tier', () => {
    expect(buildSubscriptionActivated('pro', null, 'evt_123').properties.from_tier).toBeNull();
  });

  it('event_audience_path_selected carries audience and cta_location', () => {
    const { event, properties } = buildEventAudiencePathSelected(
      'organizer',
      'event_detail_acquisition',
    );
    expect(event).toBe('event_audience_path_selected');
    expect(properties).toEqual({ audience: 'organizer', cta_location: 'event_detail_acquisition' });
  });

  it('organizer_waitlist_submitted carries its cta_location', () => {
    const { event, properties } = buildOrganizerWaitlistSubmitted('event_detail_acquisition');
    expect(event).toBe('organizer_waitlist_submitted');
    expect(properties).toEqual({ cta_location: 'event_detail_acquisition' });
  });

  it('event catalog contains exactly the seven funnel events', () => {
    expect(OWNER_FUNNEL_EVENTS).toEqual([
      'owner_cta_clicked',
      'claim_started',
      'trial_started',
      'checkout_started',
      'subscription_activated',
      'event_audience_path_selected',
      'organizer_waitlist_submitted',
    ]);
  });
});

describe('emit guards', () => {
  it('checkout_started emits only when a session URL exists', () => {
    expect(shouldEmitCheckoutStarted('https://checkout.stripe.com/x')).toBe(true);
    expect(shouldEmitCheckoutStarted('')).toBe(false);
    expect(shouldEmitCheckoutStarted(null)).toBe(false);
    expect(shouldEmitCheckoutStarted(undefined)).toBe(false);
  });
});

describe('property hygiene — no PII reaches event payloads', () => {
  it('all builder payloads contain only whitelisted keys', () => {
    const payloads = [
      buildOwnerCtaClicked('pricing_start_trial'),
      buildClaimStarted('verification_code'),
      buildTrialStarted('pricing'),
      buildCheckoutStarted('pro', 'month', false),
      buildSubscriptionActivated('pro', 'trial_expired_profile', 'evt_123'),
    ].map((b) => b.properties);
    const allowed = new Set([
      'cta_location',
      'claim_method',
      'source',
      'tier',
      'interval',
      'founding',
      'from_tier',
      '$insert_id',
    ]);
    for (const payload of payloads) {
      for (const key of Object.keys(payload)) {
        expect(allowed.has(key)).toBe(true);
      }
    }
  });
});
