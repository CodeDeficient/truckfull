'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Crown } from 'lucide-react';
import { useTierAccess } from '@/hooks/useTierAccess';
import {
  type SubscriptionTier,
  getTierDisplayInfo,
} from '@/lib/auth/tierCheck';
import { logDebug } from '@/lib/logging';

interface UpgradeModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly targetTier?: SubscriptionTier; // Which tier to highlight/promote
}

export function UpgradeModal({ isOpen, onClose, targetTier }: UpgradeModalProps) {
  const { tier: currentTier } = useTierAccess();
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>(targetTier ?? 'pro');

  const proInfo = getTierDisplayInfo('pro');
  const currentInfo = getTierDisplayInfo(currentTier);

  const proFeatures = [
    'Unlimited trucks',
    'Daily auto-updates from socials',
    'Advanced BI analytics suite',
    'Event ROI tracking',
    'Location performance analysis',
    'Competitive insights',
    'Predictive recommendations',
    'Export reports (CSV/PDF)',
    '3 featured dishes',
    'Phone + email support (12h)',
  ];

  const handleUpgrade = (tier: SubscriptionTier) => {
    logDebug('Upgrading to:', tier);
    globalThis.location.href = `/api/checkout?tier=${tier}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Upgrade Your TruckFull Plan</DialogTitle>
          <DialogDescription>
            You're currently on the <span className="font-semibold">{currentInfo.displayName}</span>{' '}
            plan. Upgrade to Pro for full access.
          </DialogDescription>
        </DialogHeader>

        <Card
          className={`cursor-pointer transition-all relative ${
            selectedTier === 'pro' ? 'ring-2 ring-purple-500 shadow-lg' : 'hover:shadow-md'
          }`}
          onClick={() => setSelectedTier('pro')}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500" />
                {proInfo.displayName}
              </CardTitle>
            </div>
            <CardDescription className="text-2xl font-bold text-purple-600">
              {proInfo.price}
            </CardDescription>
            <p className="text-sm text-muted-foreground mt-2">
              Your personal BI platform for growth
            </p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {proFeatures.map((feature, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
            <Button
              className="w-full mt-6"
              disabled={currentTier === 'pro'}
              onClick={(e) => {
                e.stopPropagation();
                handleUpgrade('pro');
              }}
            >
              {currentTier === 'pro' ? 'Current Plan' : 'Upgrade to Pro'}
            </Button>
          </CardContent>
        </Card>

        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm font-semibold text-yellow-900">
            Limited Time: Founding Member Pricing
          </p>
          <p className="text-xs text-yellow-800 mt-1">
            Lock in 50% off for life ($25/mo). First 40 food truck owners only!
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
