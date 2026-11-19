import { useAuth } from '@/app/auth/AuthProvider';
import type { AuthContextType } from '@/app/auth/AuthProvider';

/**
 * Safe wrapper for useAuth that handles missing AuthProvider context during static generation
 * Returns safe defaults when AuthProvider is not available (during build time)
 */
export function useSafeAuth(): AuthContextType {
  try {
    return useAuth();
  } catch {
    // Return safe defaults when AuthProvider context is missing during static generation
    return {
      user: undefined,
      loading: false,
      signOut: () => Promise.resolve(),
    };
  }
}
