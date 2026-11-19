'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, CreditCard, Calendar, CheckCircle2 } from 'lucide-react';
import type { SubscriptionTier } from '@/lib/auth/tierCheck';

interface CurrentPlanCardProps {
  readonly tierDisplayName: string;
  readonly tierPrice: string;
  readonly tierColor: string;
  readonly tier: SubscriptionTier;
  readonly subscriptionStartedAt?: string;
  readonly subscriptionEndsAt?: string;
  readonly hasCustomerId: boolean;
  readonly onManageSubscription: () => void;
  readonly _onUpgrade: () => void;
  readonly portalLoading: boolean;
}

export function CurrentPlanCard({
  tierDisplayName,
  tierPrice,
  tierColor,
  tier,
  subscriptionStartedAt,
  subscriptionEndsAt,
  hasCustomerId,
  onManageSubscription,
  _onUpgrade,
  portalLoading,
}: CurrentPlanCardProps) {
  const isPaidTier = tier !== 'free' && tier !== 'starter';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full ${tierColor} bg-opacity-10`}>
              <Crown className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <CardTitle>Current Plan: {tierDisplayName}</CardTitle>
              <CardDescription>{isPaidTier ? tierPrice : 'Free forever'}</CardDescription>
            </div>
          </div>
          {isPaidTier && (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-600">Active</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isPaidTier ? (
          <>
            {subscriptionStartedAt && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>
                  Subscribed since{' '}
                  {new Date(subscriptionStartedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
            )}
            {subscriptionEndsAt && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>
                  Ends on{' '}
                  {new Date(subscriptionEndsAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
            )}
            <div className="pt-4 border-t space-y-3">
              <Button
                onClick={onManageSubscription}
                disabled={portalLoading || !hasCustomerId}
                className="w-full sm:w-auto"
                variant="outline"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                {portalLoading ? 'Opening...' : 'Manage Payment & Billing'}
              </Button>
              <p className="text-xs text-muted-foreground">
                Update payment method, view invoices, or cancel subscription
              </p>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
