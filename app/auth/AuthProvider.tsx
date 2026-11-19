'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User, Session } from '@supabase/supabase-js';
import {
  PWA_AUTH_CHANNEL,
  PWA_AUTH_STORAGE_KEY,
  sanitizeRelativeRedirectPath,
} from '@/lib/auth/pwaOAuth';
import { getSupabase } from '@/lib/supabase/client';
import { logError, setUserContext, resetUserContext } from '@/lib/logging';
import { runWhenIdle } from '@/lib/utils/runWhenIdle';

export interface AuthContextType {
  user: User | undefined;
  loading: boolean;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export async function signOut() {
  try {
    const supabase = getSupabase();
    await supabase.auth.signOut();
  } catch {
    // Error is handled silently as the user is being signed out
  }
}

/**
 * Provides authentication context for React application.
 * @example
 * AuthProvider({ children: <SomeComponent /> })
 * Returns an AuthContext.Provider wrapping the children.
 * @param {Object} { children: React.ReactNode } - React nodes to be wrapped by the provider.
 * @returns {JSX.Element} Returns a JSX element which provides authentication context.
 * @description
 *   - Uses Supabase for authentication management.
 *   - Initializes user state from current session and listens for authentication state changes.
 *   - Unsubscribes from authentication state change listeners on unmount.
 */
export function AuthProvider({ children }: { readonly children: React.ReactNode }) {
  const [user, setUser] = useState<User | undefined>();
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const signedOutRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    const applyPwaRedirect = (rawTarget: string | null | undefined) => {
      const target = sanitizeRelativeRedirectPath(rawTarget);
      router.replace(target);
      router.refresh();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== PWA_AUTH_STORAGE_KEY || typeof event.newValue !== 'string') {
        return;
      }

      applyPwaRedirect(event.newValue);
    };

    globalThis.addEventListener('storage', handleStorage);

    const channel =
      typeof BroadcastChannel === 'undefined' ? undefined : new BroadcastChannel(PWA_AUTH_CHANNEL);

    channel?.addEventListener('message', (event: MessageEvent<unknown>) => {
      if (typeof event.data !== 'string') {
        return;
      }

      applyPwaRedirect(event.data);
    });

    return () => {
      globalThis.removeEventListener('storage', handleStorage);
      channel?.close();
    };
  }, [router]);

  useEffect(() => {
    mountedRef.current = true;
    let subscription: { unsubscribe: () => void } | undefined;
    let cancelIdleCheck: (() => void) | undefined;

    const handleAuthStateChange = async (event: string, session: Session | null) => {
      const supabase = getSupabase();
      try {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          const {
            data: { user: userData },
          } = await supabase.auth.getUser();
          if (mountedRef.current) {
            setUser(userData ?? undefined);
            if (userData?.id) setUserContext({ id: userData.id });
          }
        } else if (event === 'SIGNED_OUT') {
          signedOutRef.current = true;
          if (mountedRef.current) {
            setUser(undefined);
            resetUserContext();
          }
        } else {
          if (mountedRef.current) {
            setUser(session?.user);
            if (session?.user?.id) setUserContext({ id: session.user.id });
          }
        }
      } catch (error: unknown) {
        logError('Error getting user data:', error);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };

    const verifyUserInBackground = (): void => {
      getSupabase().auth.getUser().then(({ data: { user } }) => {
        if (mountedRef.current && !signedOutRef.current) {
          setUser(user ?? undefined);
          if (user?.id) setUserContext({ id: user.id });
        }
      }).catch((error) => {
        logError('Background getUser failed:', error);
      });
    };

    const initAuth = async () => {
      try {
        const supabase = getSupabase();

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (mountedRef.current) {
          setUser(session?.user ?? undefined);
          setLoading(false);
        }

        const {
          data: { subscription: authSubscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
          handleAuthStateChange(event, session);
        });

        subscription = authSubscription;

        cancelIdleCheck = runWhenIdle(verifyUserInBackground);
      } catch {
        if (mountedRef.current) setLoading(false);
      }
    };

    void initAuth();

    return () => {
      mountedRef.current = false;
      cancelIdleCheck?.();
      if (subscription != undefined) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const value = {
    user,
    loading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context == undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
