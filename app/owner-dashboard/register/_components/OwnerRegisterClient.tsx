'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from '@/components/navigation/IntentLink';
import { Loader2 } from 'lucide-react';
import { useSafeAuth } from '@/lib/auth/useSafeAuth';
import { AuthOAuthForm } from '@/components/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function OwnerRegisterClient() {
  const router = useRouter();
  const { user, loading: authLoading } = useSafeAuth();

  // Redirect to truck registration if already authenticated
  useEffect(() => {
    if (user) {
      router.push('/owner-dashboard/register/truck');
    }
  }, [user, router]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin" />
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Become a Food Truck Owner</CardTitle>
          <CardDescription>
            Create your account to start managing your food truck business
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              Sign up with your preferred method
            </p>

            <AuthOAuthForm redirectTo="/owner-dashboard/register/truck" showFacebookButton={true} />
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                By signing up, you agree to our
              </span>
            </div>
          </div>

          <div className="flex justify-center gap-4 text-xs">
            <Link href="/terms" className="text-primary hover:underline">
              Terms of Service
            </Link>
            <Link href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
          </div>

          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Button variant="link" className="p-0" onClick={() => router.push('/?auth=open')}>
                Sign in
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
