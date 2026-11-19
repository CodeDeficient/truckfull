'use client';

import { useEffect, useState, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  const checkStandalone = useCallback(() => {
    if (globalThis.window === undefined) return false;
    return (
      globalThis.matchMedia('(display-mode: standalone)').matches ||
      // @ts-expect-error - navigator standalone is available on iOS
      globalThis.navigator.standalone === true
    );
  }, []);

  useEffect(() => {
    setIsStandalone(checkStandalone());

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    if (globalThis.window !== undefined && 'serviceWorker' in navigator) {
      globalThis.addEventListener('beforeinstallprompt', handler);
    }

    return () => {
      if (globalThis.window !== undefined) {
        globalThis.removeEventListener('beforeinstallprompt', handler);
      }
    };
  }, [checkStandalone]);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;

    await deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;

    if (choiceResult.outcome === 'accepted') {
      setDeferredPrompt(null);
      setCanInstall(false);
      return true;
    }
    return false;
  }, [deferredPrompt]);

  return {
    canInstall: canInstall && !isStandalone,
    isStandalone,
    install,
  };
}
