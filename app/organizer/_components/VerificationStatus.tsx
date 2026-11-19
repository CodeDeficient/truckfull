'use client';

/**
 * Verification Status Component
 * WBS: 6.5.1
 *
 * Shows verification status and triggers verification flow.
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, CheckCircle, Clock, AlertTriangle, ExternalLink, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface VerificationStatusProps {
  status: 'unverified' | 'pending' | 'verified' | 'verification_failed' | 'shadowbanned';
  onStartVerification?: () => void;
}

const STATUS_CONFIG = {
  unverified: {
    icon: AlertTriangle,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    label: 'Not Verified',
    description: 'Complete identity verification to publish paid events',
    action: 'Start Verification',
  },
  pending: {
    icon: Clock,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    label: 'Verification Pending',
    description: 'Your verification is being reviewed. This usually takes 1-2 business days.',
    action: null,
  },
  verified: {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Verified',
    description: 'Your identity has been verified. You can publish paid events.',
    action: null,
  },
  verification_failed: {
    icon: AlertTriangle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    label: 'Verification Failed',
    description: 'Your verification was not successful. Please try again or contact support.',
    action: 'Retry Verification',
  },
  shadowbanned: {
    icon: Shield,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    label: 'Restricted',
    description: 'Your account has restrictions due to low ratings. You can only post free events.',
    action: null,
  },
};

export function VerificationStatus({ status, onStartVerification }: VerificationStatusProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = STATUS_CONFIG[status];
  const StatusIcon = config.icon;

  const handleStartVerification = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/organizer/verification', {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start verification');
      }

      const data = await response.json();

      // TODO: Implement Stripe Identity verification
      // For now, show an info message
      if (data.status === 'unavailable') {
        setError(data.error || 'Verification is coming soon');
        return;
      }
      if (data.token) {
        onStartVerification?.();
      }
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Identity Verification
        </CardTitle>
        <CardDescription>Required for publishing paid events</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${config.bgColor}`}>
            <StatusIcon className={`w-5 h-5 ${config.color}`} />
          </div>
          <div>
            <Badge className={`${config.bgColor} ${config.color}`}>{config.label}</Badge>
            <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {config.action && (
          <Button onClick={handleStartVerification} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                {config.action}
                <ExternalLink className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        )}

        <Alert>
          <AlertDescription className="text-sm">
            <strong>How it works:</strong> Identity verification is coming soon. Stripe Identity
            integration will be available in a future update to enable paid event publishing.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
