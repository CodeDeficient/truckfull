'use client';

import { useEffect, useState } from 'react';
import Link from '@/components/navigation/IntentLink';

function setTestCookieSafe(): boolean {
  try {
    // Use navigator.cookieEnabled as a non-invasive capability check
    if (typeof navigator !== 'undefined' && navigator.cookieEnabled !== true) return false;
    // Attempt to write via document.cookie with eslint rule disabled locally
    // eslint-disable-next-line unicorn/no-document-cookie
    document.cookie = 'cookie_test=1; Path=/; SameSite=Lax';

    return document.cookie.includes('cookie_test=1');
  } catch {
    return false;
  }
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [testPassed, setTestPassed] = useState<boolean | undefined>();

  useEffect(() => {
    try {
      const consent = globalThis.localStorage?.getItem('cookie_consent') ?? '';
      if (consent === '') {
        setVisible(true);
      }
    } catch {
      // Fallback: Show consent prompt if localStorage is disabled/throws
      setVisible(true);
    }
  }, []);

  const accept = () => {
    try {
      globalThis.localStorage?.setItem('cookie_consent', 'true');
    } catch {
      // Ignore localStorage write error
    }
    const ok = setTestCookieSafe();
    setTestPassed(ok);
    if (ok) {
      setVisible(false);
    }
  };

  if (!visible) return null;

  return (
    <div
      style={{ position: 'fixed', bottom: 0, left: 0, right: 0 }}
      className="z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      <div className="mx-auto max-w-screen-xl px-4 py-3 flex items-center justify-between gap-4">
        <div className="text-sm">
          We use essential first‑party cookies to sign you in and keep your account secure. These
          are required for basic features like saving favorites.
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 text-sm rounded border" onClick={accept}>
            Accept
          </button>
          <Link className="px-3 py-1.5 text-sm underline" href="/privacy">
            Learn more
          </Link>
        </div>
      </div>
      {testPassed === false && (
        <div className="mx-auto max-w-screen-xl px-4 pb-3 text-xs text-red-600">
          Your browser blocked cookies. Please enable cookies for this site to sign in.
        </div>
      )}
    </div>
  );
}
