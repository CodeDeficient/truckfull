import { useEffect } from 'react';
import { useSafeAuth } from '@/lib/auth/useSafeAuth';
import { useOrganizerStatusStore } from '@/lib/stores/userAccessStores';
import { isUserResourceLoading } from '@/lib/stores/userResourceStore';

interface UseOrganizerAccessReturn {
  isOrganizer: boolean;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useOrganizerAccess(): UseOrganizerAccessReturn {
  const { user, loading: authLoading } = useSafeAuth();
  const userId = user?.id;
  const isOrganizer = useOrganizerStatusStore((s) => s.userId === userId && s.data === true);
  const isLoading = useOrganizerStatusStore((s) => isUserResourceLoading(s, userId, authLoading));
  const error = useOrganizerStatusStore((s) => (s.userId === userId ? s.error : undefined));
  const ensureLoaded = useOrganizerStatusStore((s) => s.ensureLoaded);
  const reload = useOrganizerStatusStore((s) => s.reload);

  useEffect(() => {
    if (!authLoading) void ensureLoaded(userId);
  }, [authLoading, userId, ensureLoaded]);

  return {
    isOrganizer,
    isLoading,
    error: error ?? null,
    refresh: () => (userId == undefined ? Promise.resolve() : reload(userId)),
  };
}
