import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PauseCircle, ExternalLink, CalendarClock, Ban } from 'lucide-react';
import { useTierAccess } from '@/hooks/useTierAccess';
import { BILLING_CONFIG } from '@/lib/config/billing';
import { initiateCheckout } from '@/lib/stripe/checkout';
import {
  buildBillingTabView,
  shouldShowBillingHistory,
  BILLING_HISTORY_NOTE,
  TRIAL_CANCELED_NOTE,
  type BillingTabView,
} from '@/lib/subscription/trialState';
import {
  deriveBillingAccountState,
  hasActiveBillingAccount,
  type BillingAccountState,
} from '@/lib/subscription/billingAccountState';
import { PlanComparisonCard } from '../billing/_components/PlanComparisonCard';
import { PricingFAQ } from '@/app/pricing/_components/PricingFAQ';
import { refreshProfileAccess } from '@/lib/stores/userAccessStores';

interface BillingTabProps {
  readonly foundingData?: {
    readonly remaining: number;
    readonly total: number;
    readonly taken: number;
  };
}

// One delayed retry after a derivation failure so a transient fetch error
// self-heals instead of sticking for the session. The timer fires the retry
// only if the effect is still mounted (not aborted); cleanup cancels it.
function scheduleDerivationRetry(signal: AbortSignal, retry: () => void): void {
  const retryTimer = setTimeout(() => {
    if (!signal.aborted) retry();
  }, 4000);
  signal.addEventListener('abort', () => clearTimeout(retryTimer), { once: true });
}

export function BillingTab({ foundingData }: BillingTabProps) {
  const { tier, subscriptionEndsAt } = useTierAccess();
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);
  // null = derivation loading; 'error' = derivation failed. The 'error'
  // state degrades to the permissive pre-#1305 behavior (paid users keep
  // portal access through transient fetch failures) — but plain loading
  // shows neither portal entry nor trial UI until state is known.
  const [trialView, setTrialView] = useState<BillingTabView | 'error' | null>(null);
  const [billingAccountState, setBillingAccountState] = useState<
    BillingAccountState | 'error' | null
  >(null);
  // Bumped after a successful cancel so the derivation effect re-runs — the
  // profile row is intentionally untouched by cancellation, so tier and
  // subscriptionEndsAt alone would never re-trigger it.
  const [trialDataVersion, setTrialDataVersion] = useState(0);
  // Derivation retries once per success to self-heal a transient fetch
  // failure; a ref prevents an unbounded retry loop when failures persist.
  const derivationRetriedRef = useRef(false);
  const [clientFoundingData, setClientFoundingData] = useState<
    { readonly remaining: number; readonly total: number; readonly taken: number } | undefined
  >();
  const [foundingLoading, setFoundingLoading] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    // Defined at effect scope so the retry callback stays shallow.
    const retryDerivation = (): void => setTrialDataVersion((v) => v + 1);
    (async () => {
      try {
        const { getSupabase } = await import('@/lib/supabase/client');
        const supabase = getSupabase();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || ctrl.signal.aborted) return;

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select(
            'stripe_customer_id, stripe_subscription_id, subscription_started_at',
          )
          .eq('id', user.id)
          .single();
        if (ctrl.signal.aborted) return;
        if (profileError) throw profileError;
        if (!profile) throw new Error('Profile not found');

        // Only markers recorded during the CURRENT trial count — mirrors the
        // cancel route's lookup (see route.ts). A stale marker from a prior
        // trial cycle must not render "Trial canceled" for a fresh trial.
        let trialCanceledAt: string | null = null;
        if (tier === 'pro' && !profile.stripe_subscription_id) {
          let markerQuery = supabase
            .from('subscription_history')
            .select('changed_at')
            .eq('user_id', user.id)
            .like('notes', `${TRIAL_CANCELED_NOTE}%`)
            .order('changed_at', { ascending: false })
            .limit(1);
          const startedAt = (
            profile as { subscription_started_at?: string | null }
          ).subscription_started_at;
          if (startedAt) {
            markerQuery = markerQuery.gte('changed_at', startedAt);
          }
          const { data: marker } = await markerQuery.maybeSingle();
          trialCanceledAt = marker?.changed_at ?? null;
        }

        if (ctrl.signal.aborted) return;
        const state = deriveBillingAccountState(
          {
            subscriptionTier: tier,
            stripeSubscriptionId: profile.stripe_subscription_id ?? null,
            subscriptionEndsAt: subscriptionEndsAt,
            trialCanceledAt,
          },
          new Date(),
        );
        setBillingAccountState(state);

        if (state.kind === 'trial_expired') {
          // Expired trial: expired-trial renewal copy via the shared view
          // builder; the plan card already renders the upgrade CTA.
          setTrialView({
            showTrialStatus: true,
            trialStatusText:
              'Your free trial has ended. Upgrade to keep Pro features.',
            showCancelTrial: false,
            showManageBilling: false,
            showBillingHistory: false,
          });
          derivationRetriedRef.current = false;
          return;
        }

        if (state.kind === 'enterprise') {
          // Comped Enterprise: active plan, no Stripe requirement, no
          // upgrade/expiration treatment.
          setTrialView(null);
          derivationRetriedRef.current = false;
          return;
        }

        if (state.kind === 'never_pro') {
          // Free with no trial history: the plan comparison card above is the
          // owner-tools upgrade offer. No error/expired copy.
          setTrialView(null);
          derivationRetriedRef.current = false;
          return;
        }

        const legacyView = buildBillingTabView(
          state.kind === 'paid'
            ? {
                kind: 'paid',
                stripeSubscriptionId: state.stripeSubscriptionId,
              }
            : {
                kind: state.kind,
                trialEndsAt: state.trialEndsAt,
                daysRemaining: state.daysRemaining,
              },
        );
        setTrialView(legacyView);
        derivationRetriedRef.current = false;
      } catch {
        // Derivation failed: degrade to the permissive error state (paid
        // users keep portal entry) and retry once after a short delay so a
        // transient fetch failure self-heals instead of sticking for the
        // session. The ref caps this at one retry per success — persistent
        // failures leave the user in the permissive error state.
        setTrialView('error');
        setBillingAccountState('error');
        if (!derivationRetriedRef.current) {
          derivationRetriedRef.current = true;
          scheduleDerivationRetry(ctrl.signal, retryDerivation);
        }
      }
    })();
    return () => ctrl.abort();
  }, [tier, subscriptionEndsAt, trialDataVersion]);

  useEffect(() => {
    if (foundingData) return;
    const ctrl = new AbortController();
    setFoundingLoading(true);
    fetch('/api/founding-members', { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : undefined))
      .then((data) => setClientFoundingData(data))
      .catch(() => {})
      .finally(() => setFoundingLoading(false));
    return () => ctrl.abort();
  }, [foundingData]);

  const effectiveFoundingData = clientFoundingData ?? foundingData;
  const hasFoundingAvailability = (effectiveFoundingData?.remaining ?? 0) > 0;

  const refreshFoundingData = useCallback(async () => {
    const response = await fetch('/api/founding-members');
    if (!response.ok) return;
    const data = (await response.json()) as {
      readonly remaining: number;
      readonly total: number;
      readonly taken: number;
    };
    setClientFoundingData(data);
  }, []);

  const isPro = tier === 'pro' || tier === 'enterprise';
  const hasActivePlan =
    billingAccountState === 'error'
      ? isPro
      : billingAccountState !== null && hasActiveBillingAccount(billingAccountState);

  const handleManageBilling = useCallback(async () => {
    setPortalLoading(true);
    setPortalError(null);
    try {
      const res = await fetch('/api/stripe/create-portal', { method: 'POST' });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `Server error (${res.status})`);
      }
      const data = await res.json();
      if (data.url) {
        globalThis.location.href = data.url;
      } else {
        setPortalError(data.error || 'Could not open billing portal');
      }
    } catch (error) {
      setPortalError(error instanceof Error ? error.message : 'Network error — please try again');
    } finally {
      setPortalLoading(false);
    }
  }, []);

  const handleUpgrade = useCallback(async () => {
    setCheckoutError(null);
    setCheckoutLoading(true);
    const result = await initiateCheckout({
      tier: 'pro',
      isFoundingMember: hasFoundingAvailability,
      interval: 'month',
    });
    if (!result.success) {
      setCheckoutLoading(false);
      setCheckoutError(result.error ?? 'Failed to start checkout');
      if (result.foundingUnavailable) await refreshFoundingData();
    }
  }, [hasFoundingAvailability, refreshFoundingData]);

  const handleCancelTrial = useCallback(async () => {
    setCancelLoading(true);
    setCancelMessage(null);
    try {
      const res = await fetch('/api/trial/cancel', { method: 'POST' });
      const data: { message?: string; error?: string } = await res
        .json()
        .catch(() => ({ error: 'Something went wrong. Please try again.' }));
      if (res.ok) {
        setCancelMessage(data.message ?? 'Your trial cancellation is scheduled.');
        setTrialDataVersion((v) => v + 1);
        void refreshProfileAccess();
      } else {
        setCancelMessage(data.error ?? 'Something went wrong. Please try again.');
      }
    } catch {
      setCancelMessage('Network error — please try again.');
    } finally {
      setCancelLoading(false);
    }
  }, []);

  if (BILLING_CONFIG.PAUSED && billingAccountState === null) {
    return null;
  }

  if (BILLING_CONFIG.PAUSED && !hasActivePlan) {
    return (
      <div className="space-y-4">
        <div className="bg-card rounded-lg p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">{tier} Plan</span>
            </div>
            <Badge variant="secondary" className="text-sm px-3 py-1">
              Free
            </Badge>
          </div>
          <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
            <PauseCircle className="w-6 h-6 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="font-medium">Payments paused</p>
              <p className="text-sm text-muted-foreground">{BILLING_CONFIG.PAUSED_MESSAGE}</p>
            </div>
          </div>
        </div>
        {trialView !== 'error' && trialView?.showTrialStatus && (
          <div className="bg-card rounded-lg p-4 md:p-6 border border-border">
            <div className="flex items-start gap-3">
              <CalendarClock className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{trialView.trialStatusText}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (BILLING_CONFIG.PAUSED && hasActivePlan) {
    return (
      <div className="bg-card rounded-lg p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold capitalize">{tier} Plan</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-green-600/10 rounded-lg">
            <span className="text-sm font-medium text-green-600">Active</span>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
          <PauseCircle className="w-6 h-6 text-muted-foreground flex-shrink-0" />
          <div>
            <p className="font-medium">Billing changes paused</p>
            <p className="text-sm text-muted-foreground">{BILLING_CONFIG.PAUSED_MESSAGE}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Want to cancel your free trial? Reach us at{' '}
              <a href="mailto:support@truckfull.food" className="underline hover:text-foreground">
                support@truckfull.food
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-6 mt-4 text-center">
        <h2 className="text-2xl font-bold text-foreground mb-1">Simple, transparent pricing</h2>
        <p className="text-muted-foreground text-sm">
          If TruckFull helps you avoid one bad event or book one additional good one, Pro has likely
          already paid for itself.
        </p>
      </div>

      <PlanComparisonCard
        currentTier={hasActivePlan ? tier : undefined}
        onUpgrade={handleUpgrade}
        foundingData={foundingLoading ? undefined : effectiveFoundingData}
        upgradeLoading={checkoutLoading}
      />

      {checkoutError && <p className="text-xs text-destructive text-center">{checkoutError}</p>}

      {trialView !== 'error' && trialView?.showTrialStatus && (
        <div className="bg-card rounded-lg p-4 md:p-6 border border-border">
          <div className="flex items-start gap-3">
            <CalendarClock className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">{trialView.trialStatusText}</p>
              {trialView.showCancelTrial && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={handleCancelTrial}
                  disabled={cancelLoading}
                >
                  <Ban className="h-4 w-4 mr-2" />
                  {cancelLoading ? 'Canceling...' : 'Cancel trial'}
                </Button>
              )}
              {cancelMessage && trialView.showCancelTrial && (
                <p className="text-xs text-muted-foreground mt-2">{cancelMessage}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Derivation failure ('error' trialView) degrades to the permissive
          pre-#1305 behavior: paid subscribers must never lose portal access
          to a transient fetch error. While loading (null), show nothing —
          a trial user must never see a flashed portal entry or mock history. */}
      {isPro &&
        (trialView === 'error' || (trialView !== null && trialView.showManageBilling)) && (
          <>
            <div className="flex flex-col items-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleManageBilling}
                disabled={portalLoading}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                {portalLoading ? 'Loading...' : 'Manage Billing'}
              </Button>
              {portalError && <p className="text-xs text-destructive">{portalError}</p>}
            </div>
          </>
        )}

      {/* Billing history (#1302): no invoice rows are rendered anywhere —
          TruckFull does not yet fetch Stripe invoices. Only a derived paid
          state shows the honest unavailable card; loading (null) and the
          'error' degrade show no billing history at all, so trial-only and
          Free users are never shown UI implying Stripe history exists. */}
      {isPro && shouldShowBillingHistory(trialView) && (
        <div className="bg-card rounded-lg p-4 md:p-6">
          <div className="mb-4">
            <span className="text-lg font-semibold">Billing History</span>
          </div>
          <p className="text-sm text-muted-foreground">{BILLING_HISTORY_NOTE}</p>
        </div>
      )}

      <PricingFAQ className="mt-8" />
    </div>
  );
}
