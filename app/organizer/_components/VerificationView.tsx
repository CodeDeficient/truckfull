'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface VerificationViewProps {
  readonly status: 'unverified' | 'pending' | 'verified';
}

export function VerificationView({ status }: VerificationViewProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Identity Verification</h2>
        <p className="text-muted-foreground">
          Verify your identity to unlock full platform features.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-l-4 border-l-primary">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-8 h-8 text-primary" />
              <Badge
                variant={status === 'verified' ? 'default' : 'secondary'}
                className="ml-auto capitalize"
              >
                {status}
              </Badge>
            </div>
            <CardTitle>Verification Status</CardTitle>
            <CardDescription>Current status of your organizer account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {status === 'unverified' && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-4 space-y-3">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-500 font-medium">
                  <AlertTriangle className="w-4 h-4" />
                  Action Required
                </div>
                <p className="text-sm text-amber-800/80 dark:text-amber-200/80">
                  You must complete identity verification to publish paid events and collect
                  payments.
                </p>
                <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white">
                  Start Verification
                </Button>
              </div>
            )}

            {status === 'pending' && (
              <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-4">
                <p className="text-sm text-blue-800/80 dark:text-blue-200/80">
                  Your documents are currently under review. This process typically takes 1-2
                  business days.
                </p>
              </div>
            )}

            {status === 'verified' && (
              <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-500" />
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  Your identity has been verified. You have full access.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Why Verify?</CardTitle>
            <CardDescription>Benefits of a verified account</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {[
                'Publish paid events and sell tickets',
                'Collect vendor fees securely',
                'Higher trust score for vendors',
                'Priority support access',
                'Verified badge on your profile',
              ].map((benefit, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  {benefit}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
