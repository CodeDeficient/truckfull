export type SubscriptionTier = 'free' | 'pro' | 'enterprise' | /** @deprecated */ 'starter';

export type ActiveTier = Exclude<SubscriptionTier, 'starter'>;

export type ActiveSubscriptionTier = 'free' | 'pro' | 'enterprise';

export type HotspotTier = 'free' | 'pro' | 'admin' | /** @deprecated */ 'starter';

export type ActiveHotspotTier = Exclude<HotspotTier, 'starter'>;
