'use client';

import Link from '@/components/navigation/IntentLink';
import { useCallback } from 'react';
import { AnimatedGradientButton } from '@/components/ui/AnimatedGradientButton';
import { PRICING } from '@/lib/content/metrics';
import { captureOwnerFunnelEvent } from '@/lib/analytics/trackClient';
import { buildOwnerCtaClicked, type CtaLocation } from '@/lib/analytics/funnel';

interface PricingComparisonTableProps {
  readonly currentTier?: string;
  readonly foundingData?: { remaining: number; total: number; taken: number };
  readonly onUpgrade?: () => void;
  readonly upgradeLoading?: boolean;
  readonly ctaLocation?: CtaLocation;
  /** Which action the Pro CTA performs; eligibility is known before render. */
  readonly ctaMode?: 'trial' | 'paid_upgrade' | 'auth_required';
  /** Auth entry URL used when ctaMode is 'auth_required' (includes returnTo). */
  readonly authUrl?: string;
}

interface ComparisonRow {
  label: string;
  free: string;
  pro: string;
}

const COMPARISON_ROWS: ComparisonRow[] = [
  { label: 'Truck listing', free: '✓', pro: '✓' },
  { label: 'Menu & schedule', free: '✓', pro: '✓' },
  { label: 'Status ring', free: '✓', pro: '✓' },
  { label: 'Analytics', free: '✓', pro: '✓' },
  { label: 'Event feed', free: '✓', pro: '✓' },
  { label: 'Quick Check', free: '✓', pro: '✓' },
  { label: 'Saved leads', free: '5', pro: '∞' },
  { label: 'Truck profiles', free: '1', pro: '∞' },
  { label: 'Event Investigation', free: '—', pro: '✓' },
  { label: 'Smart Filter', free: '—', pro: '✓' },
  { label: 'Field Guide', free: '—', pro: '✓' },
  { label: 'Early access', free: '—', pro: '✓' },
  { label: 'Email support', free: '7d', pro: '48h' },
];

function CellValue({ value }: { value: string }) {
  const isIncluded = value === '✓';
  const isUnlimited = value === '∞';
  const isExcluded = value === '—';

  if (isIncluded || isUnlimited) {
    return <span className="text-green-500 text-xs font-medium">{value}</span>;
  }
  if (isExcluded) {
    return <span className="text-muted-foreground/30 text-xs">{value}</span>;
  }
  return <span className="text-foreground text-xs">{value}</span>;
}

export function PricingComparisonTable({
  currentTier,
  foundingData,
  onUpgrade,
  upgradeLoading,
  ctaLocation = 'pricing_start_trial',
  ctaMode = 'trial',
  authUrl = '/?auth=open&returnTo=%2Fpricing',
}: PricingComparisonTableProps) {
  const isPro = currentTier === 'pro' || currentTier === 'enterprise';
  const remaining = foundingData?.remaining;
  const hasFoundingAvailability = remaining !== undefined && remaining > 0;
  const proPrice = hasFoundingAvailability ? PRICING.PRO_FOUNDING_MONTHLY : PRICING.PRO_MONTHLY;
  const handlePricingCta = useCallback(() => {
    const { event, properties } = buildOwnerCtaClicked(ctaLocation);
    captureOwnerFunnelEvent(event, properties);
    onUpgrade?.();
  }, [ctaLocation, onUpgrade]);
  const pricingCtaHref = onUpgrade ? undefined : authUrl;
  const ctaLabel = ctaMode === 'paid_upgrade' ? 'Upgrade today — charged at checkout' : 'Start Free Trial';

  return (
    <div className="glass-strong rounded-xl p-4 flex flex-col relative">
      {remaining !== undefined && remaining > 0 && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap z-10">
          {remaining} founding member spots remaining
        </div>
      )}

      <div
        className="grid gap-x-1 items-center"
        style={{ gridTemplateColumns: 'minmax(0,1fr) 4.5rem 4.5rem' }}
      >
        <div />
        <div className="text-xs font-semibold text-foreground text-center">Free</div>
        <div
          className="text-xs font-bold text-center bg-clip-text text-transparent"
          style={{ backgroundImage: 'linear-gradient(90deg, #fbbf24, #fffbeb)' }}
        >
          Pro
        </div>
      </div>

      <div
        className="grid gap-x-1 items-end mt-1 pb-3 border-b border-border/20"
        style={{ gridTemplateColumns: 'minmax(0,1fr) 4.5rem 4.5rem' }}
      >
        <span className="text-xs font-semibold text-foreground self-center">Features</span>
        <div className="text-center">
          <div className="flex items-baseline justify-center gap-1 leading-none">
            <span className="text-base font-bold text-foreground tabular-nums">$0</span>
            <span className="text-[10px] text-muted-foreground">/mo</span>
          </div>
        </div>
        <div className="text-center">
          <div className="flex items-baseline justify-center gap-1 leading-none">
            {hasFoundingAvailability && (
              <span className="text-xs text-muted-foreground/60 line-through tabular-nums">
                ${PRICING.PRO_MONTHLY}
              </span>
            )}
            <span className="text-base font-bold text-foreground tabular-nums">${proPrice}</span>
            <span className="text-[10px] text-muted-foreground">/mo</span>
          </div>
        </div>
      </div>

      <div className="space-y-0">
        {COMPARISON_ROWS.map((row) => (
          <div
            key={row.label}
            className="grid gap-x-1 items-center leading-tight"
            style={{ gridTemplateColumns: 'minmax(0,1fr) 4.5rem 4.5rem' }}
          >
            <div className="text-xs text-foreground/80 truncate pr-1">{row.label}</div>
            <div className="text-center">
              <CellValue value={row.free} />
            </div>
            <div className="text-center">
              <CellValue value={row.pro} />
            </div>
          </div>
        ))}
      </div>

      <div
        className="grid gap-x-1 items-start mt-0.5 pt-2 border-t border-border/20"
        style={{ gridTemplateColumns: 'minmax(0,1fr) 4.5rem 4.5rem' }}
      >
        <div />
        <div className="text-center text-[10px] text-muted-foreground">Forever free</div>
        <div className="text-center text-[10px] text-muted-foreground">
          {hasFoundingAvailability
            ? `Founding: $${PRICING.PRO_FOUNDING_MONTHLY}/mo for life`
            : remaining === 0
              ? 'Standard pricing'
              : 'Availability unavailable'}
        </div>
      </div>

      <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-border/20">
        <div>
          {currentTier && isPro ? (
            <span className="flex items-center justify-center w-full text-center text-sm font-semibold rounded-lg bg-primary/10 text-primary border border-primary/20 px-4 py-2">
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
        <div>
          {currentTier && !isPro ? (
            <span className="flex items-center justify-center w-full text-center text-sm font-semibold rounded-lg bg-primary/10 text-primary border border-primary/20 px-4 py-2">
              Current Plan
            </span>
          ) : (
            <Link
              href="/"
              className="flex items-center justify-center w-full text-center text-sm font-semibold rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors px-4 py-2"
            >
              Get Started
            </Link>
          )}
        </div>
      </div>

      <p className="text-center text-[10px] text-muted-foreground mt-2">
        30-day free trial. No cc required. Cancel anytime.
      </p>
    </div>
  );
}
