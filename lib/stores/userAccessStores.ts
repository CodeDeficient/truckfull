import { getSupabase } from '@/lib/supabase/client';
import { createUserResourceStore } from '@/lib/stores/userResourceStore';

export interface ProfileAccess {
  readonly subscriptionTier: string | null;
  readonly role: string | null;
  readonly subscriptionEndsAt: string | null;
  readonly stripeSubscriptionId: string | null;
}

interface ProfileAccessRow {
  readonly subscription_tier?: string | null;
  readonly role?: string | null;
  readonly subscription_ends_at?: string | null;
  readonly stripe_subscription_id?: string | null;
}

async function loadProfileAccess(userId: string): Promise<ProfileAccess> {
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('subscription_tier, role, subscription_ends_at, stripe_subscription_id')
    .eq('id', userId)
    .single();
  if (error) throw new Error('Failed to load subscription tier');
  const row = data as ProfileAccessRow | null;
  return {
    subscriptionTier: row?.subscription_tier ?? null,
    role: row?.role ?? null,
    subscriptionEndsAt: row?.subscription_ends_at ?? null,
    stripeSubscriptionId: row?.stripe_subscription_id ?? null,
  };
}

async function loadOrganizerStatus(): Promise<boolean> {
  const response = await fetch('/api/organizer');
  if (response.status === 401) return false;
  if (!response.ok) throw new Error('Failed to fetch organizer status');
  const body = (await response.json()) as { is_organizer?: boolean };
  return body.is_organizer ?? false;
}

const ACCESS_MAX_AGE_MS = 30_000;

export const useProfileAccessStore = createUserResourceStore(loadProfileAccess, {
  maxAgeMs: ACCESS_MAX_AGE_MS,
});

export const useOrganizerStatusStore = createUserResourceStore(() => loadOrganizerStatus(), {
  maxAgeMs: ACCESS_MAX_AGE_MS,
});

export function refreshProfileAccess(): Promise<void> {
  const { userId, reload } = useProfileAccessStore.getState();
  return userId == undefined ? Promise.resolve() : reload(userId, false);
}
