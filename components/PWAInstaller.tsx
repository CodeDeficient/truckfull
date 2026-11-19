'use client';

import { useEffect, useState, useCallback } from 'react';
import { logDebug, logError } from '@/lib/logging';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  // Function to check if app is running in standalone mode
  const checkStandalone = useCallback(() => {
    return (
      globalThis.matchMedia('(display-mode: standalone)').matches ||
      // @ts-expect-error - navigator standalone is available on iOS
      globalThis.navigator.standalone === true
    );
  }, []);

  useEffect(() => {
    setIsClient(true);
    setIsStandalone(checkStandalone());

    const handler = (e: Event) => {
      logDebug('beforeinstallprompt event fired');
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallButton(true); // Show our custom install button
    };

    // Check if the PWA install prompt is supported
    if ('serviceWorker' in navigator) {
      // Listen for the beforeinstallprompt event
      globalThis.addEventListener('beforeinstallprompt', handler);

      // Check if service worker is registered and ready
      navigator.serviceWorker.ready
        .then((registration) => {
          logDebug('Service Worker is ready', registration.scope);
        })
        .catch((error) => {
          logError('Service Worker not ready', error);
        });
    }

    // Add event listener to detect standalone mode changes
    const mediaQuery = globalThis.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = () => {
      setIsStandalone(checkStandalone());
    };

    mediaQuery.addEventListener('change', handleDisplayModeChange);

    // Clean up event listener
    return () => {
      globalThis.removeEventListener('beforeinstallprompt', handler);
      mediaQuery.removeEventListener('change', handleDisplayModeChange);
    };
  }, [checkStandalone]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      logDebug('Showing install prompt');
      // Show the install prompt
      await deferredPrompt.prompt();

      // Wait for the user to respond to the prompt
      const choiceResult = await deferredPrompt.userChoice;
      logDebug('User choice:', choiceResult.outcome);
      if (choiceResult.outcome === 'accepted') {
        logDebug('User accepted the install prompt');
      } else {
        logDebug('User dismissed the install prompt');
      }
      // Reset the deferred prompt
      setDeferredPrompt(null);
      setShowInstallButton(false);
    }
  };

  // Don't show the install button if we're already in a PWA (standalone mode) or if the prompt is not available
  if (!isClient || !showInstallButton || isStandalone) {
    return null;
  }

  return (
    <button
      onClick={handleInstallClick}
      className="fixed bottom-6 right-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 rounded-full shadow-lg z-50 hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
      aria-label="Install PWA"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
        />
      </svg>
      <span className="sr-only">Install App</span>
    </button>
  );
}
