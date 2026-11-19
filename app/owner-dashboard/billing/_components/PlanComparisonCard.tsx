'use client';

import { PricingCards } from '@/app/pricing/_components/PricingCards';

interface PlanComparisonCardProps {
  readonly currentTier?: string;
  readonly onUpgrade?: () => void;
  readonly foundingData?: {
    readonly remaining: number;
    readonly total: number;
    readonly taken: number;
  };
  readonly upgradeLoading?: boolean;
}

export function PlanComparisonCard({
  currentTier,
  onUpgrade,
  foundingData,
  upgradeLoading,
}: PlanComparisonCardProps) {
  return (
    <PricingCards
      currentTier={currentTier}
      foundingData={foundingData}
      ctaMode="paid_upgrade"
      onUpgrade={onUpgrade}
      upgradeLoading={upgradeLoading}
      ctaLocation="billing_tab"
    />
  );
}
