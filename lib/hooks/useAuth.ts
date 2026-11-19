// lib/hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | undefined;
  loading: boolean;
  error: string | undefined;
}

/**
 * Custom hook for managing authentication state in React components
 * @example
 * const { user, loading, error } = useAuth()
 * if (loading) return <div>Loading...</div>
 * if (error) return <div>Error: {error}</div>
 * if (!user) return <div>Please sign in</div>
 * return <div>Hello {user.email}</div>
 * @returns {AuthState} Object containing user, loading state, and error
 */
export function useAuth(): AuthState {
  const [authState, setAuthState] = useState<AuthState>({
    user: undefined,
    loading: true,
    error: undefined,
  });

  const supabase = getSupabase();

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        if (!mounted) return;

        // Get current session
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (sessionError) {
          setAuthState({
            user: undefined,
            loading: false,
            error: sessionError.message,
          });
          return;
        }

        setAuthState({
          user: session?.user ?? undefined,
          loading: false,
          error: undefined,
        });

        // Listen for auth state changes
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!mounted) return;

          setAuthState({
            user: session?.user ?? undefined,
            loading: false,
            error: undefined,
          });
        });

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        if (!mounted) return;

        setAuthState({
          user: undefined,
          loading: false,
          error: error instanceof Error ? error.message : 'An unknown error occurred',
        });
      }
    };

    void checkSession();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  return authState;
}
