'use client';

import { useState, useEffect } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import type { Session } from '@supabase/supabase-js';
import { logDebug } from '@/lib/logging';

export default function AuthDebug() {
  const [session, setSession] = useState<Session | undefined | null>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const checkSession = async () => {
      try {
        setLoading(true);
        const supabase = getSupabase();

        // Check current session
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          setError(sessionError.message);
        } else {
          setSession(data.session);
        }

        // Listen for auth changes
        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
          // For debugging purposes in development
          if (
            typeof globalThis !== 'undefined' &&
            globalThis.process?.env?.NODE_ENV === 'development'
          ) {
            logDebug('Auth state change:', _event, session);
          }
          setSession(session);
        });

        return () => {
          authListener.subscription.unsubscribe();
        };
      } catch (error_) {
        setError(error_ instanceof Error ? error_.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    void checkSession();
  }, []);

  if (loading) {
    return <div className="p-4">Loading authentication state...</div>;
  }

  if (error != undefined) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="p-4 bg-gray-100 rounded">
      <h2 className="text-xl font-bold mb-2">Authentication Debug Info</h2>
      {session ? (
        <div>
          <p>
            <strong>Status:</strong> Authenticated ✅
          </p>
          <p>
            <strong>User ID:</strong> {session.user.id}
          </p>
          <p>
            <strong>Email:</strong> {session.user.email ?? 'No email'}
          </p>
          <p>
            <strong>Token Expires:</strong>{' '}
            {session.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : 'Unknown'}
          </p>
          <p>
            <strong>Token Type:</strong> {session.token_type ?? 'Unknown'}
          </p>
        </div>
      ) : (
        <p>
          <strong>Status:</strong> Not authenticated ❌
        </p>
      )}
    </div>
  );
}
