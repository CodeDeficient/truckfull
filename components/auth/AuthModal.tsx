/* eslint-disable max-lines-per-function -- NOTE: Will break AuthModal into smaller components in a follow-up. */
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

const LOWERCASE_LETTER = /[a-z]/;
const UPPERCASE_LETTER = /[A-Z]/;
const DIGIT = /\d/;
const SYMBOL = /[^\w\s]/;

// OAuth redirect base resolver (module-level to satisfy lint rules and reuse)
// Behavior:
// - If window.origin is available, always use it. This ensures that in local dev we redirect back to localhost
//   so Supabase sets cookies for the correct domain, avoiding "no_session" middleware redirects.
// - Otherwise, fall back to NEXT_PUBLIC_APP_URL, then to production URL.
const getSafeRedirectBase = (): string => {
  const hasWindow = globalThis.window !== undefined && globalThis.location !== undefined;
  const origin = hasWindow ? globalThis.location.origin : '';
  if (origin) {
    return origin;
  }
  const envUrl =
    typeof globalThis === 'undefined' ? undefined : globalThis.process?.env?.NEXT_PUBLIC_APP_URL;
  if (typeof envUrl === 'string' && envUrl.length > 0) {
    return envUrl;
  }
  // Fallback to localhost for development if we're not in production
  if (globalThis.window !== undefined && globalThis.location?.hostname === 'localhost') {
    return globalThis.location.origin;
  }
  return 'http://localhost:3000';
};
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { isSameOriginRelativePath } from '@/lib/auth/oauthPolicy';
import { buildOAuthCallbackUrl, getCurrentRelativeUrl, isStandalonePwa } from '@/lib/auth/pwaOAuth';
import { getSupabase } from '@/lib/supabase/client';
import { Mail, Chrome, AlertCircle } from 'lucide-react';
import type { Provider } from '@supabase/supabase-js';
import { AuthEmailForm } from './AuthEmailForm';
import { AuthOAuthForm } from './AuthOAuthForm';

interface AuthModalProps {
  readonly mounted: boolean;
  readonly resolvedTheme?: string;
  readonly isOpen?: boolean;
  readonly onClose?: () => void;
  readonly onAuthSuccess?: () => void;
  /**
   * Same-origin relative path to navigate to after successful email auth
   * (e.g. '/pricing' from ?returnTo=%2Fpricing). Validated client-side
   * before navigation; OAuth uses the redirectTo pipeline instead.
   */
  readonly returnTo?: string | null;
  readonly rateLimitConfig?: {
    maxAttempts: number;
    windowMs: number;
  };
}

interface AuthError {
  message: string;
  field?: string;
  code?: string;
}

interface AuthState {
  isLoading: boolean;
  error: AuthError | undefined;
  mode: 'signin' | 'signup';
  attempts: number;
  lastAttempt: number;
  isBlocked: boolean;
  showPassword: boolean;
}

// SOTA Security: Password strength validation
interface PasswordStrength {
  score: number; // 0-4
  feedback: string[];
  isValid: boolean;
}

// SOTA Security: Device fingerprinting for security
const generateDeviceFingerprint = (): string => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Device fingerprint', 2, 2);
  }

  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    canvas.toDataURL(),
  ].join('|');

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const codePoint = fingerprint.codePointAt(i) ?? 0;
    hash = (hash << 5) - hash + codePoint;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
};

// SOTA Security: Password strength calculator
const calculatePasswordStrength = (password: string): PasswordStrength => {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) score++;
  else feedback.push('Use at least 8 characters');

  if (LOWERCASE_LETTER.test(password)) score++;
  else feedback.push('Include lowercase letters');

  if (UPPERCASE_LETTER.test(password)) score++;
  else feedback.push('Include uppercase letters');

  if (DIGIT.test(password)) score++;
  else feedback.push('Include numbers');

  if (SYMBOL.test(password)) score++;
  else feedback.push('Include special characters');

  return {
    score: Math.min(score, 4),
    feedback,
    isValid: score >= 3 && password.length >= 8,
  };
};

export const AuthModal: React.FC<AuthModalProps> = ({
  mounted,
  resolvedTheme,
  isOpen = false,
  onClose,
  onAuthSuccess,
  returnTo,
  rateLimitConfig = { maxAttempts: 5, windowMs: 900_000 }, // 15 minutes
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authState, setAuthState] = useState<AuthState>({
    isLoading: false,
    error: undefined,
    mode: 'signin',
    attempts: 0,
    lastAttempt: 0,
    isBlocked: false,
    showPassword: false,
  });
  const [activeTab, setActiveTab] = useState('email');
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    feedback: [],
    isValid: false,
  });
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileResetSignal, setTurnstileResetSignal] = useState(0);
  const deviceFingerprintRef = useRef<string | undefined>(undefined);
  const router = useRouter();

  /**
   * Navigate to the returnTo target after successful auth. Accepts only a
   * same-origin relative path — absolute URLs, protocol-relative URLs, and
   * scheme-carrying strings fall back to staying on the current page.
   */
  function navigateToReturnTarget(): void {
    if (!returnTo) return;
    if (!isSameOriginRelativePath(returnTo, globalThis.location.origin)) return;
    router.push(returnTo);
  }

  // Get the supabase client
  const supabase = getSupabase();

  // SOTA Security: Initialize device fingerprint on mount
  useEffect(() => {
    if (mounted && deviceFingerprintRef.current == null) {
      deviceFingerprintRef.current = generateDeviceFingerprint();
    }
  }, [mounted]);

  // SOTA Security: Rate limiting check
  const isRateLimited = useCallback(() => {
    const now = Date.now();
    const { attempts, lastAttempt } = authState;

    if (now - lastAttempt > rateLimitConfig.windowMs) {
      return false; // Reset window
    }

    return attempts >= rateLimitConfig.maxAttempts;
  }, [authState, rateLimitConfig]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setPassword('');
      setAuthState({
        isLoading: false,
        error: undefined,
        mode: 'signin',
        attempts: 0,
        lastAttempt: 0,
        isBlocked: false,
        showPassword: false,
      });
      setActiveTab('email');
      setPasswordStrength({ score: 0, feedback: [], isValid: false });
      setTurnstileToken('');
      setTurnstileResetSignal(0);
    }
  }, [isOpen]);

  // SOTA Security: Password strength monitoring
  useEffect(() => {
    if (password && authState.mode === 'signup') {
      setPasswordStrength(calculatePasswordStrength(password));
    }
  }, [password, authState.mode]);

  // SOTA Security: Handle attempts and rate limiting
  const recordAttempt = useCallback(() => {
    setAuthState((prev) => ({
      ...prev,
      attempts: prev.attempts + 1,
      lastAttempt: Date.now(),
      isBlocked: isRateLimited(),
    }));
  }, [isRateLimited]);

  // Use the recordAttempt function in the handleEmailAuth function
  const handleEmailAuthWithRateLimiting = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check rate limiting
    if (isRateLimited()) {
      setAuthState((prev) => ({
        ...prev,
        isBlocked: true,
        error: { message: 'Too many attempts. Please try again later.' },
      }));
      return;
    }

    // Record this attempt
    recordAttempt();

    // Proceed with authentication
    await handleEmailAuth(e);
  };

  const togglePasswordVisibility = useCallback(() => {
    setAuthState((prev) => ({ ...prev, showPassword: !prev.showPassword }));
  }, []);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      setAuthState((prev) => ({
        ...prev,
        error: { message: 'Email and password are required' },
      }));
      return;
    }

    setAuthState((prev) => ({ ...prev, isLoading: true, error: undefined }));

    try {
      if (authState.mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
          setAuthState((prev) => ({
            ...prev,
            isLoading: false,
            error: { message: error.message },
          }));
          return;
        }

        // Success
        setAuthState((prev) => ({ ...prev, isLoading: false }));
        onAuthSuccess?.();
        navigateToReturnTarget();
        router.refresh();
        onClose?.();
        return;
      }

      // Signup goes through the server boundary so Turnstile can be verified
      // server-side and the response never carries session tokens.
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, turnstileToken }),
      });

      // A proxy/platform failure could return non-JSON (HTML error page).
      // Treat it as an unexpected failure and reset the widget; a consumed
      // token must never be left stale.
      const text = await response.text();
      let result: {
        ok?: boolean;
        confirmationRequired?: boolean;
        error?: string;
        message?: string;
      } = {};
      try {
        const parsed = text ? JSON.parse(text) : {};
        result = parsed && typeof parsed === 'object' ? parsed : {};
      } catch {
        setTurnstileResetSignal((prev) => prev + 1);
        setAuthState((prev) => ({
          ...prev,
          isLoading: false,
          error: { message: 'Signup is temporarily unavailable. Please try again.' },
        }));
        return;
      }

      if (!response.ok || !result.ok) {
        // The proxy (429/503) and the signup route (400/429/503) use
        // different body shapes: the proxy 429 is { error, message }, the
        // proxy 503 is { error }, and the route is { ok, error }. Prefer the
        // friendlier `message` when present, then `error`.
        const message = result.message ?? result.error ?? 'Unable to create account. Please try again.';

        // Only reset the widget when the failure could have consumed the
        // token. 429 and proxy/availability 503s happen before Turnstile
        // verification, so the current token is still valid. A siteverify
        // timeout/network 503 may or may not have consumed the token — the
        // retry is safe either way (worst case it 400s and resets). 400
        // covers both validation failures (pre-verification) and captcha
        // failures (post-verification, token consumed) — the client cannot
        // distinguish them, so resetting on 400 is the safe choice.
        if (response.status !== 429 && response.status !== 503) {
          setTurnstileResetSignal((prev) => prev + 1);
        }
        setAuthState((prev) => ({
          ...prev,
          isLoading: false,
          error: { message },
        }));
        return;
      }

      if (result.confirmationRequired) {
        // The token was consumed by this request; bumping the reset signal
        // forces SignupTurnstile to re-render a fresh challenge and clear the
        // stale token, so a second submit never reuses it.
        setTurnstileResetSignal((prev) => prev + 1);
        setAuthState((prev) => ({
          ...prev,
          isLoading: false,
          error: { message: 'Check your email to confirm your account!' },
        }));
        return;
      }

      // Immediate session (local autoconfirm): the server client wrote the
      // auth cookies; sync the browser client so AuthProvider updates.
      try {
        await supabase.auth.refreshSession();
      } catch {
        // Best-effort sync; the server cookies are already set.
      }

      setAuthState((prev) => ({ ...prev, isLoading: false }));
      onAuthSuccess?.();
      navigateToReturnTarget();
      router.refresh();
      onClose?.();
    } catch {
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: { message: 'An unexpected error occurred' },
      }));
    }
  };

  const handleOAuthSignIn = async (provider: Provider) => {
    if (!mounted) return;

    setAuthState((prev) => ({ ...prev, isLoading: true, error: undefined }));

    try {
      const redirectBase = getSafeRedirectBase();
      // returnTo, when present and valid, takes precedence over the current
      // page (which is '/' or the origin root when the modal is opened via
      // ?auth=open on a redirect landing).
      const isValidReturnTarget =
        returnTo != undefined && isSameOriginRelativePath(returnTo, redirectBase);
      const oauthTarget = isValidReturnTarget ? returnTo : getCurrentRelativeUrl();
      const oauthRedirectTo = buildOAuthCallbackUrl(
        redirectBase,
        oauthTarget,
        isStandalonePwa(),
      );
      const oauthOptions =
        provider === 'facebook'
          ? {
              redirectTo: oauthRedirectTo,
              scopes: 'public_profile',
            }
          : {
              redirectTo: oauthRedirectTo,
            };

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: oauthOptions,
      });

      if (error) {
        setAuthState((prev) => ({
          ...prev,
          isLoading: false,
          error: { message: error.message },
        }));
        return;
      }

      // OAuth redirect will handle success
      setAuthState((prev) => ({ ...prev, isLoading: false }));
    } catch {
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: { message: 'OAuth sign-in failed' },
      }));
    }
  };

  const toggleMode = () => {
    setAuthState((prev) => ({
      ...prev,
      mode: prev.mode === 'signin' ? 'signup' : 'signin',
      error: undefined,
    }));
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setAuthState((prev) => ({
        ...prev,
        error: { message: 'Please enter your email address first', field: 'email' },
      }));
      return;
    }

    setAuthState((prev) => ({ ...prev, isLoading: true, error: undefined }));

    try {
      const redirectBase = getSafeRedirectBase();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${redirectBase}/auth/callback?type=recovery`,
      });

      if (error) {
        setAuthState((prev) => ({
          ...prev,
          isLoading: false,
          error: { message: error.message },
        }));
        return;
      }

      // Success - show message
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: { message: 'Check your email for a password reset link!' },
      }));
    } catch {
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: { message: 'Failed to send reset email' },
      }));
    }
  };

  return (
    <Dialog open={isOpen && mounted} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            {authState.mode === 'signin' ? 'Sign In' : 'Create Account'}
          </DialogTitle>
        </DialogHeader>

        {authState.error && (
          <div className="flex items-center gap-2 p-3 text-sm text-red-400 bg-red-500/10 rounded-md">
            <AlertCircle className="size-4 shrink-0" />
            <span>{authState.error.message}</span>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="size-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="oauth" className="flex items-center gap-2">
              <Chrome className="size-4" />
              Social
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email">
            <AuthEmailForm
              email={email}
              password={password}
              isLoading={authState.isLoading}
              mode={authState.mode}
              error={authState.error}
              showPassword={authState.showPassword}
              passwordStrength={passwordStrength}
              turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
              turnstileToken={turnstileToken}
              turnstileResetSignal={turnstileResetSignal}
              theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
              onEmailChange={setEmail}
              onPasswordChange={setPassword}
              onTurnstileTokenChange={setTurnstileToken}
              onSubmit={(e) => {
                void handleEmailAuthWithRateLimiting(e);
              }}
              onToggleMode={toggleMode}
              onTogglePasswordVisibility={togglePasswordVisibility}
              onForgotPassword={() => {
                void handleForgotPassword();
              }}
            />
          </TabsContent>

          <TabsContent value="oauth">
            <AuthOAuthForm
              isLoading={authState.isLoading}
              showFacebookButton={true}
              onOAuthSignIn={(provider) => {
                void handleOAuthSignIn(provider);
              }}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
