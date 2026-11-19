'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase/client';
import { buildOAuthCallbackUrl, isStandalonePwa } from '@/lib/auth/pwaOAuth';
import { clearSupabaseAuthCookies } from '@/lib/auth/cookieHelpers';
import { logError } from '@/lib/logging';

interface UseAuthHandlersReturn {
  handleEmailLogin: (e: React.FormEvent) => Promise<void>;
  handleGoogleLogin: () => Promise<void>;
  handleFacebookLogin: () => Promise<void>;
  handleLogout: () => Promise<void>;
  loading: boolean;
  error: string | undefined;
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
}

/**
 * Provides authentication handlers for email and Google login.
 * @example
 * useAuthHandlers('/dashboard')
 * {
 *   handleEmailLogin: [Function],
 *   handleGoogleLogin: [Function],
 *   loading: false,
 *   error: undefined,
 *   email: '',
 *   setEmail: [Function],
 *   password: '',
 *   setPassword: [Function],
 * }
 * @param {string} redirectTo - URL to redirect upon successful login.
 * @returns {UseAuthHandlersReturn} Contains handlers and state variables related to authentication.
 * @description
 *   - Employs Supabase for authentication tasks.
 *   - Utilizes React's `useState` hook for managing local component state.
 *   - Customizes redirection based on user role retrieved from the 'profiles' table.
 */
export function useAuthHandlers(redirectTo: string): UseAuthHandlersReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleEmailLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        setLoading(true);
        setError(undefined);

        const supabase = getSupabase();
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          throw signInError;
        }

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (user) {
          // First, try to get the user's profile
          const { data: initialProfile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

          let profile = initialProfile;

          // If profile doesn't exist, create it
          if (profileError || !profile) {
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert({
                id: user.id,
                updated_at: new Date().toISOString(),
                full_name: user.email?.split('@')[0] ?? user.id,
                avatar_url: undefined,
                role: 'customer', // Default role for new users
                email: user.email,
              })
              .select('role')
              .single();

            if (createError) {
              logError('Error creating profile:', createError);
              throw createError;
            } else {
              profile = newProfile;
            }
          }

          // Role-based redirects
          switch (profile?.role) {
            case 'admin': {
              router.push(redirectTo.startsWith('/admin') ? redirectTo : '/admin');
              break;
            }
            case 'food_truck_owner': {
              router.push('/owner-dashboard');
              break;
            }
            case 'customer': {
              router.push('/user-dashboard');
              break;
            }
            default: {
              router.push('/access-denied');
            }
          }
        }
      } catch (error_: unknown) {
        logError('Login error:', error_);
        setError(error_ instanceof Error ? error_.message : 'An error occurred during login');
      } finally {
        setLoading(false);
      }
    },
    [email, password, router, redirectTo],
  );

  const handleGoogleLogin = useCallback(async () => {
    try {
      setLoading(true);
      setError(undefined);

      const supabase = getSupabase();
      const oauthCallbackUrl = buildOAuthCallbackUrl(
        globalThis.location.origin,
        redirectTo,
        isStandalonePwa(),
      );
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: oauthCallbackUrl,
          queryParams: { prompt: 'select_account' },
        },
      });

      if (signInError) {
        throw signInError;
      }
    } catch (error_: unknown) {
      logError('Login error:', error_);
      setError(error_ instanceof Error ? error_.message : 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  }, [redirectTo]);

  const handleFacebookLogin = useCallback(async () => {
    try {
      setLoading(true);
      setError(undefined);

      const supabase = getSupabase();
      const oauthCallbackUrl = buildOAuthCallbackUrl(
        globalThis.location.origin,
        redirectTo,
        isStandalonePwa(),
      );
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: oauthCallbackUrl,
          queryParams: { prompt: 'select_account' },
        },
      });

      if (signInError) {
        throw signInError;
      }
    } catch (error_: unknown) {
      logError('Login error:', error_);
      setError(error_ instanceof Error ? error_.message : 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  }, [redirectTo]);

  const handleLogout = useCallback(async () => {
    try {
      setLoading(true);
      setError(undefined);

      const supabase = getSupabase();
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        throw signOutError;
      }

      // Clear any additional cookies that might persist
      clearSupabaseAuthCookies();

      // Redirect to home page
      router.push('/');
    } catch (error_: unknown) {
      logError('Logout error:', error_);
      setError(error_ instanceof Error ? error_.message : 'An error occurred during logout');
    } finally {
      setLoading(false);
    }
  }, [router]);

  return {
    handleEmailLogin,
    handleGoogleLogin,
    handleFacebookLogin,
    handleLogout,
    loading,
    error,
    email,
    setEmail,
    password,
    setPassword,
  };
}
