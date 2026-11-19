'use client';

import React, { useState } from 'react';
import Link from '@/components/navigation/IntentLink';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import type { Provider } from '@supabase/supabase-js';
import { buildOAuthCallbackUrl, isStandalonePwa } from '@/lib/auth/pwaOAuth';

interface AuthOAuthFormProps {
  readonly isLoading?: boolean;
  readonly onOAuthSignIn?: (provider: Provider) => void;
  readonly redirectTo?: string;
  readonly showFacebookButton?: boolean;
}

export const AuthOAuthForm: React.FC<AuthOAuthFormProps> = ({
  isLoading = false,
  onOAuthSignIn,
  redirectTo,
  showFacebookButton = false,
}) => {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [internalLoading, setInternalLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    if (!termsAccepted) {
      return; // Safety check
    }

    if (onOAuthSignIn) {
      onOAuthSignIn('google');
    } else {
      // Default OAuth flow using Supabase
      setInternalLoading(true);
      const { getSupabase } = await import('@/lib/supabase/client');
      const supabase = getSupabase();
      const oauthRedirectTo = buildOAuthCallbackUrl(
        globalThis.location.origin,
        redirectTo ?? '/',
        isStandalonePwa(),
      );
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: oauthRedirectTo,
        },
      });
    }
  };

  const handleFacebookSignIn = async () => {
    if (!termsAccepted) {
      return; // Safety check
    }

    if (onOAuthSignIn) {
      onOAuthSignIn('facebook');
    } else {
      // Default OAuth flow using Supabase
      setInternalLoading(true);
      const { getSupabase } = await import('@/lib/supabase/client');
      const supabase = getSupabase();
      const oauthRedirectTo = buildOAuthCallbackUrl(
        globalThis.location.origin,
        redirectTo ?? '/',
        isStandalonePwa(),
      );
      await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: oauthRedirectTo,
          scopes: 'public_profile',
        },
      });
    }
  };

  const loading = isLoading || internalLoading;

  return (
    <div className="space-y-3">
      {/* Terms checkbox - must be checked before OAuth */}
      <div className="flex items-start space-x-2">
        <input
          id="oauth-terms-agreement"
          type="checkbox"
          checked={termsAccepted}
          onChange={(e) => setTermsAccepted(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          disabled={loading}
        />
        <label htmlFor="oauth-terms-agreement" className="text-sm text-muted-foreground">
          I agree to the{' '}
          <Link href="/terms" className="text-blue-400 hover:underline">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-blue-400 hover:underline">
            Privacy Policy
          </Link>
        </label>
      </div>

      <Button
        variant="outline"
        className="w-full flex items-center gap-2 bg-background border-0 text-foreground hover:bg-card"
        onClick={handleGoogleSignIn}
        disabled={loading || !termsAccepted}
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
        )}
        Continue with Google
      </Button>

      {showFacebookButton && (
        <Button
          variant="outline"
          className="w-full flex items-center gap-2 bg-[#1877F2] border-[#1877F2] text-white hover:bg-[#166FE5] hover:border-[#166FE5]"
          onClick={handleFacebookSignIn}
          disabled={loading || !termsAccepted}
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <svg className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          )}
          Continue with Facebook
        </Button>
      )}

      {!termsAccepted && (
        <p className="text-xs text-muted-foreground text-center">
          Please accept the Terms and Privacy Policy to continue
        </p>
      )}
    </div>
  );
};
