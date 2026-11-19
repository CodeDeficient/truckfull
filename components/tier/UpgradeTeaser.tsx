'use client';

/**
 * Upgrade Teaser Component
 * WBS: 6.4.3
 *
 * Shows upgrade prompts when feature is tier-restricted.
 */

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Sparkles, ArrowRight } from 'lucide-react';

interface UpgradeTeaserProps {
  feature: string;
  targetTier: 'pro';
  description?: string;
  onUpgrade?: () => void;
  variant?: 'inline' | 'card' | 'banner';
}

const TIER_COLORS = {
  pro: 'from-amber-500 to-orange-500',
};

const TIER_LABELS = {
  pro: 'Pro',
};

export function UpgradeTeaser({
  feature,
  targetTier,
  description,
  onUpgrade,
  variant = 'inline',
}: UpgradeTeaserProps) {
  const handleClick = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      // Default: redirect to billing
      globalThis.location.href = '/owner-dashboard/billing';
    }
  };

  if (variant === 'banner') {
    return (
      <div
        className={`bg-gradient-to-r ${TIER_COLORS[targetTier]} text-white rounded-lg p-4 flex items-center justify-between`}
      >
        <div className="flex items-center gap-3">
          <Lock className="w-5 h-5" />
          <div>
            <p className="font-medium">{feature}</p>
            {description && <p className="text-sm opacity-90">{description}</p>}
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={handleClick} className="shrink-0">
          Upgrade to {TIER_LABELS[targetTier]}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="py-8 text-center">
          <div
            className={`inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r ${TIER_COLORS[targetTier]} text-white mb-4`}
          >
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="font-semibold mb-1">{feature}</h3>
          {description && <p className="text-sm text-muted-foreground mb-4">{description}</p>}
          <Button
            onClick={handleClick}
            className={`bg-gradient-to-r ${TIER_COLORS[targetTier]} hover:opacity-90`}
          >
            Upgrade to {TIER_LABELS[targetTier]}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Inline variant
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded px-3 py-2">
      <Lock className="w-4 h-4" />
      <span>{feature}</span>
      <Button variant="link" size="sm" className="h-auto p-0" onClick={handleClick}>
        Upgrade to {TIER_LABELS[targetTier]}
      </Button>
    </div>
  );
}
