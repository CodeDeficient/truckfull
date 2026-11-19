import {
  type OwnerFunnelEvent,
  type OwnerCtaClickedProps,
  type ClaimStartedProps,
  type EventAudiencePathSelectedProps,
  type OrganizerWaitlistSubmittedProps,
} from './funnel';

export type FunnelEventProperties =
  | OwnerCtaClickedProps
  | ClaimStartedProps
  | EventAudiencePathSelectedProps
  | OrganizerWaitlistSubmittedProps;

export function captureOwnerFunnelEvent(
  event: OwnerFunnelEvent,
  properties: FunnelEventProperties,
): void {
  import('posthog-js')
    .then(({ default: posthog }) => {
      posthog.capture(event, properties);
    })
    .catch(() => {});
}
