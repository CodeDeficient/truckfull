'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from '@/components/navigation/IntentLink';
import { Check, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { AnimatedGradientButton } from '@/components/ui/AnimatedGradientButton';
import { PRICING } from '@/lib/content/metrics';
import { captureOwnerFunnelEvent } from '@/lib/analytics/trackClient';
import { buildOwnerCtaClicked, type CtaLocation } from '@/lib/analytics/funnel';
import { PricingComparisonTable } from './PricingComparisonTable';

function trackPricingTrialCta(ctaLocation: CtaLocation): void {
  const { event, properties } = buildOwnerCtaClicked(ctaLocation);
  captureOwnerFunnelEvent(event, properties);
}

/** How the Pro CTA should behave — decided server-side before render. */
export type PricingCtaMode =
  | 'trial'
  | 'paid_upgrade'
  | 'auth_required';

interface PricingCardsProps {
  readonly currentTier?: string;
  readonly foundingData?: { remaining: number; total: number; taken: number };
  readonly onUpgrade?: () => void;
  readonly upgradeLoading?: boolean;
  readonly ctaLocation?: CtaLocation;
  /** Which action the Pro CTA performs; eligibility is known before render. */
  readonly ctaMode?: PricingCtaMode;
  /** Auth entry URL used when ctaMode is 'auth_required' (includes returnTo). */
  readonly authUrl?: string;
}

export interface FeatureItem {
  label: string;
  tooltip: string;
}

export const FREE_FEATURES: FeatureItem[] = [
  {
    label: 'Truck listing on the live map',
    tooltip: 'Your truck appears on the public map for customers to find',
  },
  {
    label: '1 truck profile',
    tooltip: 'List one truck on the map — upgrade to Pro for unlimited',
  },
  {
    label: 'Menu & schedule management',
    tooltip: 'Keep your menu, hours, and location up to date',
  },
  {
    label: 'Open/closed status ring',
    tooltip: 'Green ring shows customers you\u2019re open right now',
  },
  { label: 'Analytics', tooltip: 'See views, clicks, favorites, and more for your truck profile' },
  {
    label: 'Event discovery feed',
    tooltip: 'AI-curated feed of vending opportunities from dozens of sources',
  },
  { label: 'Quick Check', tooltip: '12 red flags to check before paying a vendor fee' },
  {
    label: '5 saved event leads',
    tooltip: 'Save events you\u2019re interested in and track your applications',
  },
  { label: 'Email support (within 7 days)', tooltip: 'We respond within 7 business days' },
];

export const PRO_FEATURES: FeatureItem[] = [
  {
    label: 'Event Investigation',
    tooltip:
      'Paste a flyer or upload an image \u2014 get a structured event profile with risk audit. Know before you pay the vendor fee.',
  },
  {
    label: 'Smart Filter Controls',
    tooltip:
      'Narrow events by research status, relevance score, and source type \u2014 find the right opportunities faster',
  },
  {
    label: 'Field Guide',
    tooltip:
      'See average daily vehicle traffic volume as a heatmap \u2014 find busy spots without driving around',
  },
  {
    label: 'Unlimited saved leads',
    tooltip: 'Save as many events as you want and track your applications',
  },
  {
    label: 'Unlimited truck profiles',
    tooltip: 'Manage multiple trucks for fleets or restaurant groups',
  },
  {
    label: 'Early access to new features',
    tooltip: 'Try new tools and improvements before they launch to everyone',
  },
  { label: 'Email support (within 48 hours)', tooltip: 'We respond within 48 hours' },
];

function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const show = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  }, []);

  const hide = useCallback(() => {
    timeoutRef.current = setTimeout(() => setOpen(false), 150);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (open) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setOpen(false);
      } else {
        show();
      }
    },
    [open, show],
  );

  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={handleClick}
          onMouseEnter={show}
          onMouseLeave={hide}
          className="inline-flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors shrink-0"
          aria-label="Learn more"
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" align="center" className="max-w-[220px] text-xs">
        <p>{text}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function FeatureList({ features }: { features: FeatureItem[] }) {
  return (
    <ul className="space-y-2 mb-6">
      {features.map((f) => (
        <li key={f.label} className="flex items-start gap-2 text-sm">
          <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
          <span className="text-foreground/80">{f.label}</span>
          <InfoTooltip text={f.tooltip} />
        </li>
      ))}
    </ul>
  );
}

export function PricingCards({
  currentTier,
  foundingData,
  onUpgrade,
  upgradeLoading,
  ctaLocation = 'pricing_start_trial',
  ctaMode = 'trial',
  authUrl = '/?auth=open&returnTo=%2Fpricing',
}: PricingCardsProps) {
  const isPro = currentTier === 'pro' || currentTier === 'enterprise';
  const remaining = foundingData?.remaining;
  const hasFoundingAvailability = remaining !== undefined && remaining > 0;
  const proPrice = hasFoundingAvailability ? PRICING.PRO_FOUNDING_MONTHLY : PRICING.PRO_MONTHLY;
  const handlePricingCta = useCallback(() => {
    trackPricingTrialCta(ctaLocation);
    onUpgrade?.();
  }, [ctaLocation, onUpgrade]);
  const pricingCtaHref = onUpgrade ? undefined : authUrl;
  const ctaLabel = ctaMode === 'paid_upgrade' ? 'Upgrade today — charged at checkout' : 'Start Free Trial';

  return (
    <TooltipProvider delayDuration={200}>
      <div className="hidden md:block">
        <div className="grid grid-cols-2 gap-6">
          {/* Free Card */}
          <div className="glass-strong rounded-xl p-8 flex flex-col">
            <h2 className="text-xl font-semibold text-foreground mb-1">Free</h2>
            <p className="text-muted-foreground text-sm mb-4">Get discovered. Find events.</p>
            <p className="text-4xl font-bold text-foreground mb-1">$0</p>
            <p className="text-sm text-muted-foreground mb-6">Forever free</p>

            <FeatureList features={FREE_FEATURES} />

            <div className="mt-auto">
              {currentTier && !isPro ? (
                <span className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary w-full text-center text-sm font-medium">
                  Current Plan
                </span>
              ) : (
                <Link
                  href="/"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors w-full text-center text-sm font-medium"
                >
                  Get Started
                </Link>
              )}
            </div>
          </div>

          {/* Pro Card */}
          <div className="glass-strong rounded-xl p-8 flex flex-col border-2 border-primary relative">
            {remaining !== undefined && remaining > 0 && (
              <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-semibold px-3 py-1 rounded-full text-center whitespace-nowrap">
                {remaining} founding member spots remaining
              </div>
            )}
            <h2 className="text-xl font-semibold text-foreground mb-1">Pro</h2>
            <p className="text-muted-foreground text-sm mb-4">Stop guessing.</p>
            <div className="mb-1">
              {hasFoundingAvailability && (
                <span className="text-4xl font-bold text-muted-foreground/50 line-through">
                  ${PRICING.PRO_MONTHLY}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-green-500 mb-1">
              ${proPrice}
              <span className="text-muted-foreground text-lg font-normal">/month</span>
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              {hasFoundingAvailability
                ? `Founding member discount \u2014 $${PRICING.PRO_FOUNDING_MONTHLY}/mo for life`
                : remaining === 0
                  ? 'Standard pricing'
                  : 'Founding availability could not be verified'}
              . 30-day free trial. No credit card required. Cancel anytime.
            </p>

            <p className="text-sm font-medium text-muted-foreground mb-3">
              Everything in Free, plus:
            </p>
            <FeatureList features={PRO_FEATURES} />

            <div className="mt-auto">
              {currentTier && isPro ? (
                <span className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary w-full text-center text-sm font-medium">
                  Current Plan
                </span>
              ) : (
                <AnimatedGradientButton
                  href={pricingCtaHref}
                  onClick={upgradeLoading ? undefined : handlePricingCta}
                  disabled={upgradeLoading}
                  className="w-full"
                >
                  {upgradeLoading ? 'Processing...' : ctaLabel}
                </AnimatedGradientButton>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="md:hidden">
        <PricingComparisonTable
          currentTier={currentTier}
          foundingData={foundingData}
          onUpgrade={onUpgrade}
          upgradeLoading={upgradeLoading}
          ctaLocation={ctaLocation}
          ctaMode={ctaMode}
          authUrl={authUrl}
        />
      </div>
    </TooltipProvider>
  );
}
