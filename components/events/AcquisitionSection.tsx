'use client';

import Link from '@/components/navigation/IntentLink';
import { useState, type JSX } from 'react';
import { useTierAccess } from '@/hooks/useTierAccess';
import { computeEntitlementActive } from '@/lib/auth/ownerAccess';
import { captureOwnerFunnelEvent } from '@/lib/analytics/trackClient';
import {
  buildEventAudiencePathSelected,
  buildOrganizerWaitlistSubmitted,
  type EventAudience,
} from '@/lib/analytics/funnel';
import { WaitlistModal } from '@/components/ui/featured/WaitlistModal';

const CTA_LOCATION = 'event_detail_acquisition' as const;

function trackAudience(audience: EventAudience): void {
  const { event, properties } = buildEventAudiencePathSelected(audience, CTA_LOCATION);
  captureOwnerFunnelEvent(event, properties);
}

interface PrimaryCta {
  readonly label: string;
  readonly href: string;
  readonly supportLine: string | null;
}

interface AcquisitionProfileInput {
  readonly isLoading: boolean;
  readonly authenticated: boolean;
  readonly subscriptionTier: string;
  readonly stripeSubscriptionId: string | null;
  readonly subscriptionEndsAt: string | null;
}

/**
 * Pure: full primary-CTA decision for the acquisition section.
 * Loading yields no actionable CTA; otherwise the canonical
 * computeEntitlementActive decides between the free and entitled paths.
 */
export function buildAcquisitionPrimaryCta(
  input: AcquisitionProfileInput,
  now: Date,
): PrimaryCta | null {
  if (input.isLoading) return null;
  if (!input.authenticated) {
    return {
      label: 'Explore vending opportunities',
      href: '/?auth=open&returnTo=%2Fpricing',
      supportLine: 'Free to join · Eligible accounts get 30 days of Pro · No card required',
    };
  }
  const entitlementActive = computeEntitlementActive(
    {
      subscriptionTier: input.subscriptionTier,
      stripeSubscriptionId: input.stripeSubscriptionId,
      subscriptionEndsAt: input.subscriptionEndsAt,
    },
    now,
  );
  if (!entitlementActive) {
    return {
      label: 'Explore event tools',
      href: '/pricing',
      supportLine: null,
    };
  }
  return {
    label: 'Open event discovery',
    href: '/owner-dashboard/events',
    supportLine: null,
  };
}

export function AcquisitionSection(): JSX.Element {
  const { tier, role, subscriptionEndsAt, stripeSubscriptionId, isLoading } = useTierAccess();
  const [waitlistOpen, setWaitlistOpen] = useState(false);

  const cta = buildAcquisitionPrimaryCta(
    {
      isLoading,
      authenticated: role !== null,
      subscriptionTier: tier,
      stripeSubscriptionId,
      subscriptionEndsAt,
    },
    new Date(),
  );

  return (
    <section className="bg-white py-14 dark:bg-black sm:py-20">
      <div className="mx-auto max-w-4xl px-6 text-center sm:px-10">
        <h2 className="font-heading text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
          Find more events worth your time.
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-gray-600 dark:text-gray-400 sm:text-base">
          Discover thousands of events for food trucks and mobile vendors. Research organizers
          before you spend time or money.
        </p>

        <div className="mt-8 flex min-h-[3rem] flex-col items-center">
          {cta && (
            <>
              <Link
                href={cta.href}
                onClick={() => trackAudience('vendor')}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-red-600 px-8 py-3 font-heading text-base font-semibold text-white transition hover:bg-red-700 sm:w-auto dark:bg-red-500 dark:hover:bg-red-400"
              >
                {cta.label}
              </Link>
              {cta.supportLine && (
                <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">{cta.supportLine}</p>
              )}
            </>
          )}
        </div>

        <div className="mt-8 flex flex-col items-center gap-3 border-t border-gray-200 pt-6 text-sm sm:flex-row sm:justify-center sm:gap-0 dark:border-gray-800">
          <Link
            href="/claim-your-truck"
            onClick={() => trackAudience('truck_owner')}
            className="font-medium text-red-600 underline-offset-4 hover:underline sm:px-4 dark:text-red-400"
          >
            Claim or list a food truck
          </Link>
          <span
            aria-hidden
            className="hidden sm:block sm:h-4 sm:w-px sm:bg-gray-300 dark:bg-gray-700"
          />
          <button
            type="button"
            onClick={() => {
              trackAudience('organizer');
              setWaitlistOpen(true);
            }}
            className="font-medium text-red-600 underline-offset-4 hover:underline sm:px-4 dark:text-red-400"
          >
            Join the organizer waitlist
          </button>
          <span
            aria-hidden
            className="hidden sm:block sm:h-4 sm:w-px sm:bg-gray-300 dark:bg-gray-700"
          />
          <Link
            href="/"
            onClick={() => trackAudience('foodie')}
            className="font-medium text-red-600 underline-offset-4 hover:underline sm:px-4 dark:text-red-400"
          >
            Find food trucks near you
          </Link>
        </div>
      </div>

      <WaitlistModal
        isOpen={waitlistOpen}
        onClose={() => setWaitlistOpen(false)}
        waitlistRole="event_manager"
        title="Organizer Waitlist"
        description="Organizer tools are in development. Join the waitlist and we'll notify you as soon as they're available."
        onSubmitted={() => {
          const { event, properties } = buildOrganizerWaitlistSubmitted(CTA_LOCATION);
          captureOwnerFunnelEvent(event, properties);
        }}
      />
    </section>
  );
}
