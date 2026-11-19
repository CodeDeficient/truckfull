// lib/hooks/useAdminAuth.ts
import { useState, useEffect } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export function isAdminRole(role: string): boolean {
  return role === 'admin' || role === 'superadmin';
}

interface AdminAuthState {
  user: User | undefined;
  isAdmin: boolean;
  loading: boolean;
  error: string | undefined;
}

/**
 * Custom hook for managing admin authentication state in React components
 * @example
 * const { user, isAdmin, loading, error } = useAdminAuth()
 * if (loading) return <div>Loading...</div>
 * if (error) return <div>Error: {error}</div>
 * if (!user) return <div>Please sign in</div>
 * if (!isAdmin) return <div>Access denied</div>
 * return <div>Welcome admin {user.email}</div>
 * @returns {AdminAuthState} Object containing user, admin status, loading state, and error
 */
export function useAdminAuth(): AdminAuthState {
  const [adminAuthState, setAdminAuthState] = useState<AdminAuthState>({
    user: undefined,
    isAdmin: false,
    loading: true,
    error: undefined,
  });

  const supabase = getSupabase();

  useEffect(() => {
    let mounted = true;

    const checkAdminSession = async () => {
      try {
        if (!mounted) return;

        // Get current session
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (sessionError) {
          setAdminAuthState({
            user: undefined,
            isAdmin: false,
            loading: false,
            error: sessionError.message,
          });
          return;
        }

        const user = session?.user ?? undefined;

        if (!user) {
          setAdminAuthState({
            user: undefined,
            isAdmin: false,
            loading: false,
            error: undefined,
          });
          return;
        }

        // Get user profile to check role
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (!mounted) return;

        if (profileError || !profile) {
          setAdminAuthState({
            user,
            isAdmin: false,
            loading: false,
            error: profileError?.message ?? 'Profile not found',
          });
          return;
        }

        // Check admin role
        const isAdmin = profile.role === 'admin' || profile.role === 'superadmin';

        setAdminAuthState({
          user,
          isAdmin,
          loading: false,
          error: undefined,
        });

        // Listen for auth state changes
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_event, session) => {
          if (!mounted) return;

          const currentUser = session?.user ?? undefined;

          if (!currentUser) {
            setAdminAuthState({
              user: undefined,
              isAdmin: false,
              loading: false,
              error: undefined,
            });
            return;
          }

          // Get user profile to check role
          const { data: userProfile, error: userProfileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', currentUser.id)
            .single();

          if (!mounted) return;

          if (userProfileError || !userProfile) {
            setAdminAuthState({
              user: currentUser,
              isAdmin: false,
              loading: false,
              error: userProfileError?.message ?? 'Profile not found',
            });
            return;
          }

          // Check admin role
          const currentUserIsAdmin =
            userProfile.role === 'admin' || userProfile.role === 'superadmin';

          setAdminAuthState({
            user: currentUser,
            isAdmin: currentUserIsAdmin,
            loading: false,
            error: undefined,
          });
        });

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        if (!mounted) return;

        setAdminAuthState({
          user: undefined,
          isAdmin: false,
          loading: false,
          error: error instanceof Error ? error.message : 'An unknown error occurred',
        });
      }
    };

    void checkAdminSession();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  return adminAuthState;
}
