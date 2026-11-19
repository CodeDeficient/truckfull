'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { logError, logWarning } from '@/lib/logging';

const EXPECTED_REGISTRATION_ERROR = /serviceworkercontainer\.register|securityerror/i;

function isExpectedServiceWorkerRegistrationError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const text = `${error.name} ${error.message}`;
  return EXPECTED_REGISTRATION_ERROR.test(text);
}

function handleSerwistRegistrationError(error: unknown): void {
  if (isExpectedServiceWorkerRegistrationError(error)) {
    logWarning('Serwist service worker registration was not available in this browser', {
      message: error instanceof Error ? error.message : String(error),
    });
    return;
  }

  logError('Unexpected Serwist service worker registration failure', error);
}

const DynamicSerwistProvider = dynamic(
  () =>
    import('@serwist/turbopack/react').then((mod) => {
      function SerwistRegistrationController() {
        const hasRegistered = useRef(false);
        const { serwist } = mod.useSerwist();

        useEffect(() => {
          if (!serwist || hasRegistered.current) return;
          hasRegistered.current = true;

          serwist.register().catch(handleSerwistRegistrationError);
        }, [serwist]);

        return null;
      }

      return {
        default: ({ children }: { children: ReactNode }) => (
          <mod.SerwistProvider swUrl="/serwist/sw.js" register={false}>
            {children}
            <SerwistRegistrationController />
          </mod.SerwistProvider>
        ),
      };
    }),
  {
    ssr: false,
  },
);

export default function SerwistRegistration({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      {children}
      {mounted && <DynamicSerwistProvider>{null}</DynamicSerwistProvider>}
    </>
  );
}
