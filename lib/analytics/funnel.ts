export type CtaLocation =
  | 'for_owners_claim'
  | 'for_owners_pricing'
  | 'event_truck_strip'
  | 'event_detail_acquisition'
  | 'pricing_start_trial'
  | 'upgrade_modal'
  | 'paywall'
  | 'billing_tab';

export type EventAudience = 'vendor' | 'truck_owner' | 'organizer' | 'foodie';

export type TrialSource = 'claim' | 'verification_code' | 'pricing';

export type ClaimMethod = 'verification_code' | 'listing_submission';

export interface OwnerCtaClickedProps {
  readonly cta_location: CtaLocation;
}

export interface ClaimStartedProps {
  readonly claim_method: ClaimMethod;
}

export interface TrialStartedProps {
  readonly source: TrialSource;
}

export interface CheckoutStartedProps {
  readonly tier: 'pro';
  readonly interval: 'month' | 'year';
  readonly founding: boolean;
}

export interface SubscriptionActivatedProps {
  readonly tier: string;
  readonly from_tier: string | null;
  readonly $insert_id: string;
}

export interface EventAudiencePathSelectedProps {
  readonly audience: EventAudience;
  readonly cta_location: CtaLocation;
}

export interface OrganizerWaitlistSubmittedProps {
  readonly cta_location: CtaLocation;
}

export const OWNER_FUNNEL_EVENTS = [
  'owner_cta_clicked',
  'claim_started',
  'trial_started',
  'checkout_started',
  'subscription_activated',
  'event_audience_path_selected',
  'organizer_waitlist_submitted',
] as const;

export type OwnerFunnelEvent = (typeof OWNER_FUNNEL_EVENTS)[number];

export function buildOwnerCtaClicked(ctaLocation: CtaLocation): {
  event: OwnerFunnelEvent;
  properties: OwnerCtaClickedProps;
} {
  return { event: 'owner_cta_clicked', properties: { cta_location: ctaLocation } };
}

export function buildClaimStarted(method: ClaimMethod): {
  event: OwnerFunnelEvent;
  properties: ClaimStartedProps;
} {
  return { event: 'claim_started', properties: { claim_method: method } };
}

export function buildTrialStarted(source: TrialSource): {
  event: OwnerFunnelEvent;
  properties: TrialStartedProps;
} {
  return { event: 'trial_started', properties: { source } };
}

export function shouldEmitCheckoutStarted(sessionUrl: string | null | undefined): boolean {
  return typeof sessionUrl === 'string' && sessionUrl.length > 0;
}

export function buildCheckoutStarted(
  tier: 'pro',
  interval: 'month' | 'year',
  founding: boolean,
): { event: OwnerFunnelEvent; properties: CheckoutStartedProps } {
  return { event: 'checkout_started', properties: { tier, interval, founding } };
}

export function buildSubscriptionActivated(
  tier: string,
  fromTier: string | null,
  insertId: string,
): { event: OwnerFunnelEvent; properties: SubscriptionActivatedProps } {
  return {
    event: 'subscription_activated',
    properties: { tier, from_tier: fromTier, $insert_id: insertId },
  };
}

export function buildEventAudiencePathSelected(
  audience: EventAudience,
  ctaLocation: CtaLocation,
): { event: OwnerFunnelEvent; properties: EventAudiencePathSelectedProps } {
  return {
    event: 'event_audience_path_selected',
    properties: { audience, cta_location: ctaLocation },
  };
}

export function buildOrganizerWaitlistSubmitted(ctaLocation: CtaLocation): {
  event: OwnerFunnelEvent;
  properties: OrganizerWaitlistSubmittedProps;
} {
  return {
    event: 'organizer_waitlist_submitted',
    properties: { cta_location: ctaLocation },
  };
}
