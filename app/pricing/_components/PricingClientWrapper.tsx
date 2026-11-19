'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PricingCards } from './PricingCards';
import { initiateCheckout } from '@/lib/stripe/checkout';
import type { TrialEligibility } from '@/lib/subscription/trialProvisioning';
import { refreshProfileAccess } from '@/lib/stores/userAccessStores';

interface PricingClientWrapperProps {
  readonly foundingData?: { remaining: number; total: number; taken: number };
  /**
   * Server-derived trial eligibility, computed before this component renders
   * so the presented action matches the account state without a failed
   * trial-start probe. 'unauthenticated' | 'error' keeps the CTA as a link.
   */
  readonly trialEligibility:
    | TrialEligibility
    | 'unauthenticated'
    | 'error';
}

export function PricingClientWrapper({
  foundingData,
  trialEligibility,
}: PricingClientWrapperProps) {
  const router = useRouter();
  const [trialLoading, setTrialLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [trialError, setTrialError] = useState<string | null>(null);

  const handleStartTrial = useCallback(async () => {
    setTrialLoading(true);
    setTrialError(null);
    try {
      const response = await fetch('/api/trial/start', { method: 'POST' });
      const data = await response.json();

      if (data.status === 'trial_started') {
        void refreshProfileAccess();
        router.push('/owner-dashboard?trial_started=true');
        return;
      }

      if (data.redirect) {
        router.push(data.redirect);
        return;
      }

      setTrialError(data.error ?? 'Failed to start trial');
    } catch {
      setTrialError('An unexpected error occurred');
    } finally {
      setTrialLoading(false);
    }
  }, [router]);

  const handlePaidUpgrade = useCallback(async () => {
    setCheckoutLoading(true);
    await initiateCheckout({ tier: 'pro', interval: 'month' });
    // initiateCheckout navigates to Stripe on success; reset only matters on failure.
    setCheckoutLoading(false);
  }, []);

  const eligibilityKnown =
    trialEligibility !== 'unauthenticated' && trialEligibility !== 'error';
  const hasActiveEntitlement =
    eligibilityKnown &&
    !trialEligibility.eligible &&
    trialEligibility.reason === 'active_entitlement';
  const currentTier = hasActiveEntitlement ? trialEligibility.currentTier : undefined;
  let onUpgrade: (() => void) | undefined;
  let ctaMode: 'trial' | 'paid_upgrade' | 'auth_required' = 'auth_required';
  if (eligibilityKnown && !hasActiveEntitlement) {
    if (trialEligibility.eligible) {
      onUpgrade = handleStartTrial;
      ctaMode = 'trial';
    } else {
      // cooldown, inactive_entitlement, and unsupported_tier all resolve to an
      // explicit paid upgrade — never a free-trial promise the API would refuse.
      onUpgrade = handlePaidUpgrade;
      ctaMode = 'paid_upgrade';
    }
  }

  return (
    <>
      {trialError && (
        <div className="text-sm text-destructive text-center mb-4">{trialError}</div>
      )}
      <PricingCards
        currentTier={currentTier}
        foundingData={foundingData}
        onUpgrade={onUpgrade}
        upgradeLoading={trialLoading || checkoutLoading}
        ctaMode={ctaMode}
        authUrl="/?auth=open&returnTo=%2Fpricing"
      />
    </>
  );
}
