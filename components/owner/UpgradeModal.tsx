'use client';

import { useEffect, useState } from 'react';
import { Check, Crown, Zap, X, PauseCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { initiateCheckout } from '@/lib/stripe/checkout';
import type { SubscriptionTier } from '@/lib/auth/tierCheck';
import { logError } from '@/lib/logging';
import { BILLING_CONFIG } from '@/lib/config/billing';
import { captureOwnerFunnelEvent } from '@/lib/analytics/trackClient';
import { buildOwnerCtaClicked } from '@/lib/analytics/funnel';
import { FREE_FEATURES, PRO_FEATURES } from '@/app/pricing/_components/PricingCards';
import { PRICING } from '@/lib/content/metrics';

interface UpgradeModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly currentTier: SubscriptionTier;
}

interface PricingTier {
  name: string;
  tier: SubscriptionTier;
  displayName: string;
  price: number;
  yearlyPrice: number;
  foundingPrice: number;
  foundingYearlyPrice: number;
  description: string;
  features: { text: string; available: boolean; isTierReference?: boolean }[];
  icon: typeof Crown;
  recommended?: boolean;
}

const PRICING_TIERS: PricingTier[] = [
  {
    name: 'free',
    tier: 'free',
    displayName: 'Free',
    price: 0,
    yearlyPrice: 0,
    foundingPrice: 0,
    foundingYearlyPrice: 0,
    description: 'Get discovered.',
    icon: Zap,
    features: FREE_FEATURES.map((f) => ({ text: f.label, available: true })),
  },
  {
    name: 'pro',
    tier: 'pro',
    displayName: 'Pro',
    price: PRICING.PRO_MONTHLY,
    yearlyPrice: PRICING.PRO_MONTHLY * 12,
    foundingPrice: PRICING.PRO_FOUNDING_MONTHLY,
    foundingYearlyPrice: PRICING.PRO_FOUNDING_MONTHLY * 12,
    description: 'Stop guessing.',
    icon: Crown,
    recommended: true,
    features: [
      { text: 'All Free features, plus:', available: true, isTierReference: true },
      ...PRO_FEATURES.map((f) => ({ text: f.label, available: true })),
    ],
  },
];

export function UpgradeModal({ isOpen, onClose, currentTier }: UpgradeModalProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [foundingRemaining, setFoundingRemaining] = useState<number | null>(null);
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');
  const isFoundingMember = (foundingRemaining ?? 0) > 0;

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    setFoundingRemaining(null);
    fetch('/api/founding-members', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Failed to load founding availability');
        return (await response.json()) as { remaining: number };
      })
      .then((data) => setFoundingRemaining(data.remaining))
      .catch((error: unknown) => {
        if (error instanceof Error && error.name !== 'AbortError') {
          logError('Failed to load founding availability:', error);
          setFoundingRemaining(0);
        }
      });
    return () => controller.abort();
  }, [isOpen]);

  const handleUpgrade = async (tier: SubscriptionTier) => {
    if (BILLING_CONFIG.PAUSED) return;
    const { event, properties } = buildOwnerCtaClicked('upgrade_modal');
    captureOwnerFunnelEvent(event, properties);
    setLoading(tier);
    try {
      const result = await initiateCheckout({
        tier,
        isFoundingMember,
        interval: billingInterval,
      });

      if (!result.success) {
        if (result.foundingUnavailable) {
          setFoundingRemaining(0);
        }
        logError('Checkout failed:', result.error);
        alert(result.error ?? 'Failed to start checkout. Please try again.');
        setLoading(null);
      }
      // If successful, user will be redirected to Stripe checkout
    } catch (error) {
      logError('Error initiating checkout:', error);
      alert('An unexpected error occurred. Please try again.');
      setLoading(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {BILLING_CONFIG.PAUSED && (
          <div className="flex items-center gap-3 p-4 bg-muted rounded-lg border">
            <PauseCircle className="w-6 h-6 text-muted-foreground flex-shrink-0" />
            <p className="text-sm">{BILLING_CONFIG.PAUSED_MESSAGE}</p>
          </div>
        )}

        {/* Billing Interval Toggle */}
        <div className="flex justify-center">
          <div className="bg-muted p-1 rounded-lg inline-flex">
            <button
              onClick={() => setBillingInterval('month')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                billingInterval === 'month'
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval('year')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                billingInterval === 'year'
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Yearly
            </button>
          </div>
        </div>

        {isFoundingMember && (
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-2">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
              <Crown className="w-5 h-5 text-amber-500" />
              <span className="font-semibold">Founding Member Pricing</span>
            </div>
            <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
              Get ${PRICING.PRO_FOUNDING_MONTHLY}/mo for life as an early adopter!
            </p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 mt-2">
          {PRICING_TIERS.map((pricingTier) => {
            const isCurrentTier = currentTier === pricingTier.tier;
            const Icon = pricingTier.icon;

            // Calculate display price based on interval and founding status
            const basePrice =
              billingInterval === 'year'
                ? Math.round(pricingTier.yearlyPrice / 12)
                : pricingTier.price;

            const foundingPrice =
              billingInterval === 'year'
                ? Math.round(pricingTier.foundingYearlyPrice / 12)
                : pricingTier.foundingPrice;

            const displayPrice = isFoundingMember ? foundingPrice : basePrice;
            const originalPrice = basePrice;

            return (
              <div
                key={pricingTier.name}
                className={`relative flex flex-col h-full border rounded-lg p-6 ${
                  pricingTier.recommended
                    ? 'border-primary shadow-lg ring-2 ring-primary ring-opacity-50'
                    : 'border-gray-200 dark:border-gray-800'
                }`}
              >
                {pricingTier.recommended && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold">
                    Recommended
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`p-2 rounded-lg ${pricingTier.recommended ? 'bg-primary/10' : 'bg-gray-100 dark:bg-gray-800'}`}
                  >
                    <Icon
                      className={`w-6 h-6 ${pricingTier.recommended ? 'text-primary' : 'text-gray-600 dark:text-gray-400'}`}
                    />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{pricingTier.displayName}</h3>
                    <p className="text-sm text-muted-foreground">{pricingTier.description}</p>
                  </div>
                </div>

                <div className="mb-6">
                  {pricingTier.tier === 'free' ? (
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold">Free</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold">${displayPrice}</span>
                        <span className="text-muted-foreground">/mo</span>
                      </div>

                      {isFoundingMember && displayPrice !== originalPrice && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-muted-foreground line-through">
                            ${originalPrice}/mo
                          </span>
                          <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                            Save ${originalPrice - displayPrice}/mo
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <ul className="flex-grow space-y-3 mb-6">
                  {pricingTier.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      {feature.isTierReference ? (
                        <span className="text-sm font-semibold">{feature.text}</span>
                      ) : feature.available ? (
                        <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <X className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      )}
                      {!feature.isTierReference && (
                        <span
                          className={`text-sm ${feature.available ? '' : 'text-muted-foreground'}`}
                        >
                          {feature.text}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>

                {(() => {
                  let buttonText = '';
                  if (BILLING_CONFIG.PAUSED) {
                    buttonText = 'Coming Soon';
                  } else if (loading === pricingTier.tier) {
                    buttonText = 'Processing...';
                  } else if (isCurrentTier) {
                    buttonText = 'Current Plan';
                  } else {
                    buttonText = `Upgrade today — $${displayPrice}/month`;
                  }

                  return (
                    <Button
                      onClick={() => void handleUpgrade(pricingTier.tier)}
                      disabled={
                        isCurrentTier ||
                        loading !== null ||
                        BILLING_CONFIG.PAUSED ||
                        (pricingTier.tier === 'pro' && foundingRemaining === null)
                      }
                      className="w-full"
                      variant={pricingTier.recommended ? 'default' : 'outline'}
                    >
                      {buttonText}
                    </Button>
                  );
                })()}
              </div>
            );
          })}
        </div>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          {BILLING_CONFIG.PAUSED
            ? 'Pricing information shown for reference only.'
            : 'Cancel anytime. No hidden fees. Secure payment powered by Stripe.'}
        </div>
      </DialogContent>
    </Dialog>
  );
}
