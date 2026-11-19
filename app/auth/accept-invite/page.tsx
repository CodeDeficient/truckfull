'use client';

/**
 * Accept Invite Page
 *
 * Handles the invite acceptance flow:
 * 1. User clicks invite link with token
 * 2. Page validates token and shows truck info
 * 3. User signs up/signs in
 * 4. On success, truck is auto-claimed and user becomes food_truck_owner
 */

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Truck, CheckCircle, AlertTriangle, Loader2, Clock, MapPin } from 'lucide-react';
import { AuthOAuthForm } from '@/components/auth/AuthOAuthForm';

interface InviteData {
  truck_name: string;
  cuisine_type?: string;
  location?: string;
  truck_id: string;
  expires_at: string;
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  );
}

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  const validateToken = useCallback(async () => {
    if (!token) {
      setError('No invite token provided');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/auth/validate-invite?token=${token}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Invalid or expired invite');
        return;
      }

      setInviteData(data.invite);
    } catch {
      setError('Failed to validate invite');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    validateToken();
  }, [validateToken]);

  const handleAcceptInvite = async () => {
    if (!token) return;

    try {
      setClaiming(true);

      const response = await fetch('/api/auth/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept invite');
      }

      setClaimed(true);

      // Redirect to owner dashboard after short delay
      setTimeout(() => {
        router.push(data.trialStarted ? '/owner-dashboard?trial_started=true' : '/owner-dashboard');
      }, 2000);
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : 'Failed to accept invite');
    } finally {
      setClaiming(false);
    }
  };

  // Check if user is already logged in and auto-claim
  useEffect(() => {
    const checkAuth = async () => {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        // User is logged in, try to accept invite
        handleAcceptInvite();
      }
    };

    if (inviteData && !claimed && !error) {
      checkAuth();
    }
  }, [inviteData, claimed, error]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Invite Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button variant="outline" className="w-full mt-4" onClick={() => router.push('/')}>
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (claimed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle>Truck Claimed Successfully!</CardTitle>
            <CardDescription>
              {inviteData?.truck_name} is now yours. Redirecting to your dashboard...
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <Truck className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle>Claim Your Food Truck</CardTitle>
          <CardDescription>
            You've been invited to claim <strong>{inviteData?.truck_name}</strong> on TruckFull
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Truck Info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold">{inviteData?.truck_name}</h3>
            {inviteData?.cuisine_type && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                🍽️ {inviteData.cuisine_type}
              </p>
            )}
            {inviteData?.location && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {inviteData.location}
              </p>
            )}
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
              <Clock className="w-3 h-3" />
              Invite expires {new Date(inviteData?.expires_at || '').toLocaleDateString()}
            </p>
          </div>

          {/* Auth Options */}
          <div className="space-y-4">
            <p className="text-sm text-center text-muted-foreground">
              Sign in or create an account to claim this truck
            </p>

            <AuthOAuthForm redirectTo={`/auth/accept-invite?token=${token}`} />
          </div>

          {claiming && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Claiming your truck...</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
