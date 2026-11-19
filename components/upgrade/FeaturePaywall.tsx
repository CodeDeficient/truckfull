'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Crown, TrendingUp } from 'lucide-react';
import { useTierAccess } from '@/hooks/useTierAccess';
import { type SubscriptionTier } from '@/lib/auth/tierCheck';
import { UpgradeModal } from './UpgradeModal';
import { captureOwnerFunnelEvent } from '@/lib/analytics/trackClient';
import { buildOwnerCtaClicked } from '@/lib/analytics/funnel';

interface FeaturePaywallProps {
  readonly featureName: string;
  readonly requiredTier: SubscriptionTier;
  readonly children: React.ReactNode; // The actual feature content
  readonly description?: string;
  readonly benefits?: readonly string[];
}

/**
 * FeaturePaywall Component
 *
 * Wraps premium features and shows upgrade prompt if user doesn't have access.
 * Renders children only if user has the required tier.
 */
export function FeaturePaywall({
  featureName,
  requiredTier,
  children,
  description,
  benefits = [],
}: FeaturePaywallProps) {
  const { tier, tierDisplay, isLoading } = useTierAccess();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Tier hierarchy for access checks
  const tierHierarchy: Record<SubscriptionTier, number> = {
    free: 0,
    starter: 0,
    pro: 2,
    enterprise: 3,
  };

  const hasAccess = tierHierarchy[tier] >= tierHierarchy[requiredTier];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  // Show paywall
  const requiredTierInfo = {
    free: { name: 'Free', price: 'Free', color: 'text-gray-600' },
    starter: { name: 'Free', price: 'Free', color: 'text-gray-600' },
    pro: { name: 'Pro', price: '$50/mo', color: 'text-purple-600' },
    enterprise: { name: 'Enterprise', price: 'Custom', color: 'text-indigo-600' },
  }[requiredTier] || { name: 'Premium', price: 'Paid', color: 'text-gray-600' };

  return (
    <>
      <Card className="border-2 border-dashed border-gray-300 bg-gray-50/50">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl">{featureName}</CardTitle>
          <CardDescription className="text-base">
            {description ?? `Unlock this feature with ${requiredTierInfo.name}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current plan badge */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            You're on the{' '}
            <span className="font-semibold text-gray-600">
              {tier === 'free' ? 'Free Plan' : tierDisplay.displayName || 'Premium Plan'}
            </span>{' '}
            plan
          </div>

          {/* Benefits list */}
          {benefits.length > 0 && (
            <div className="bg-white rounded-lg p-4 space-y-2">
              <p className="font-semibold text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                What you'll get:
              </p>
              <ul className="space-y-2 ml-6">
                {benefits.map((benefit, index) => (
                  <li key={index} className="text-sm text-muted-foreground list-disc">
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Upgrade CTA */}
          <div className="flex flex-col items-center gap-3">
            <Button
              size="lg"
              className="w-full max-w-xs gap-2"
              onClick={() => {
                const { event, properties } = buildOwnerCtaClicked('paywall');
                captureOwnerFunnelEvent(event, properties);
                setShowUpgradeModal(true);
              }}
            >
              <Crown className="w-4 h-4 text-amber-500" />
              Upgrade to {requiredTierInfo.name}
            </Button>
            <p className="text-xs text-muted-foreground">Starting at {requiredTierInfo.price}</p>
          </div>

          {/* Founding member offer */}
          <div className="text-center">
            <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2">
              🎉 <span className="font-semibold">Limited time:</span> 50% off for founding members
            </p>
          </div>
        </CardContent>
      </Card>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        targetTier={requiredTier}
      />
    </>
  );
}
