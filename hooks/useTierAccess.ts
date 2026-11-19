import { useEffect } from 'react';
import {
  type SubscriptionTier,
  type ActiveTier,
  normalizeTier,
  getMaxTrucks,
  canAccessAnalytics,
  canAccessAdvancedAnalytics,
  canAccessAutoUpdates,
  canExportReports,
  getTierDisplayInfo,
  getUpgradePath,
  TIER_FEATURES,
} from '@/lib/auth/tierCheck';
import { UserRole } from '@/lib/auth/roles';
import { useSafeAuth } from '@/lib/auth/useSafeAuth';
import { useProfileAccessStore } from '@/lib/stores/userAccessStores';
import { isUserResourceLoading } from '@/lib/stores/userResourceStore';

interface UseTierAccessReturn {
  tier: SubscriptionTier;
  isLoading: boolean;
  error: string | null;
  tierDisplay: ReturnType<typeof getTierDisplayInfo>;
  features: (typeof TIER_FEATURES)[ActiveTier];
  canAccess: {
    analytics: boolean;
    advancedAnalytics: boolean;
    autoUpdates: boolean;
    exportReports: boolean;
  };
  maxTrucks: number;
  upgradePath: SubscriptionTier | null;
  refresh: (showLoading?: boolean) => Promise<void>;
  role: UserRole | null;
  isOwner: boolean;
  subscriptionEndsAt: string | null;
  stripeSubscriptionId: string | null;
}

export function useTierAccess(): UseTierAccessReturn {
  const { user, loading: authLoading } = useSafeAuth();
  const userId = user?.id;
  const profile = useProfileAccessStore((s) => (s.userId === userId ? s.data : undefined));
  const isLoading = useProfileAccessStore((s) => isUserResourceLoading(s, userId, authLoading));
  const error = useProfileAccessStore((s) => (s.userId === userId ? s.error : undefined));
  const ensureLoaded = useProfileAccessStore((s) => s.ensureLoaded);
  const reload = useProfileAccessStore((s) => s.reload);

  useEffect(() => {
    if (!authLoading) void ensureLoaded(userId);
  }, [authLoading, userId, ensureLoaded]);

  const tier = (profile?.subscriptionTier as SubscriptionTier | null) ?? 'free';
  const role = profile?.role ?? null;
  const subscriptionEndsAt = profile?.subscriptionEndsAt ?? null;
  const stripeSubscriptionId = profile?.stripeSubscriptionId ?? null;
  const fetchUserTier = (showLoading = true): Promise<void> =>
    userId == undefined ? Promise.resolve() : reload(userId, showLoading);

  return {
    tier,
    isLoading,
    error: error ?? null,
    tierDisplay: getTierDisplayInfo(tier),
    features: TIER_FEATURES[normalizeTier(tier)],
    canAccess: {
      analytics: canAccessAnalytics(tier),
      advancedAnalytics: canAccessAdvancedAnalytics(tier),
      autoUpdates: canAccessAutoUpdates(tier),
      exportReports: canExportReports(tier),
    },
    maxTrucks: getMaxTrucks(tier),
    upgradePath: getUpgradePath(tier),
    refresh: fetchUserTier,
    role: (role as UserRole) ?? null,
    isOwner: role === 'food_truck_owner' || role === 'admin',
    subscriptionEndsAt,
    stripeSubscriptionId,
  };
}

/**
 * Simple hook to just check if user can access a specific feature
 * Usage: const canUseAnalytics = useFeatureAccess('analytics');
 */
export function useFeatureAccess(
  feature: 'analytics' | 'advancedAnalytics' | 'autoUpdates' | 'exportReports',
): boolean {
  const { canAccess, isLoading } = useTierAccess();

  if (isLoading) {
    return false; // Default to no access while loading
  }

  return canAccess[feature];
}
