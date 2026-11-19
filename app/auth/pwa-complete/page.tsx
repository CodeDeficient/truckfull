'use client';

import { Suspense, useEffect } from 'react';
import Link from '@/components/navigation/IntentLink';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import {
  PWA_AUTH_CHANNEL,
  PWA_AUTH_STORAGE_KEY,
  sanitizeRelativeRedirectPath,
} from '@/lib/auth/pwaOAuth';

export default function PwaCompletePage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </main>
    }>
      <PwaCompleteContent />
    </Suspense>
  );
}

function PwaCompleteContent() {
  const searchParams = useSearchParams();
  const redirectTo = sanitizeRelativeRedirectPath(searchParams.get('redirectTo'));

  useEffect(() => {
    if (globalThis.location.hash === '#_=_') {
      globalThis.history.replaceState({}, '', `${globalThis.location.pathname}${globalThis.location.search}`);
    }

    try {
      globalThis.localStorage.setItem(PWA_AUTH_STORAGE_KEY, redirectTo);
    } catch {
      // Ignore storage failures; the fallback button still works.
    }

    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(PWA_AUTH_CHANNEL);
      channel.postMessage(redirectTo);
      channel.close();
    }

    globalThis.location.replace(redirectTo);
  }, [redirectTo]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md space-y-4 rounded-2xl border bg-card p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-foreground">Returning to TruckFull</h1>
        <p className="text-sm text-muted-foreground">
          If your installed app does not reopen automatically, tap below to continue.
        </p>
        <Button asChild className="w-full">
          <Link href={redirectTo}>Return to the app</Link>
        </Button>
      </div>
    </main>
  );
}
