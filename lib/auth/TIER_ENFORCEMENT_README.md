# Subscription Tier Enforcement System

## 🔒 Overview

The tier enforcement system prevents free users from accessing paid features, ensuring proper monetization while maintaining a great free tier experience.

**Status**: ✅ Fully Implemented (Infrastructure Ready)

---

## 📊 Subscription Tiers

### Free Tier (Default)

**Price**: $0/month

**Features**:

- ✅ Full manual truck editing (location, hours, menu, photos)
- ✅ Event scheduling and special events
- ✅ Basic menu management with prices, allergens, dietary info
- ✅ Photo uploads
- ✅ Basic dashboard access
- ✅ View basic stats (truck views, favorites)

### Starter Tier

**Price**: $50/month (TBD)

**All Free Features PLUS**:

- ✅ **Automated updates** from social media (2x/week)
- ✅ Basic business analytics and insights
- ✅ Push notifications to customers
- ✅ Favorites tracking and visit stats
- ✅ Live GPS location updates
- ✅ Event location and timing automation

### Pro Tier

**Price**: $100/month (TBD)

**All Starter Features PLUS**:

- ✅ **AI Event Research Advisor** - Automatic event discovery and research
- ✅ **Advanced Analytics** - Revenue optimization, peak hours analysis
- ✅ Historical foot traffic analysis
- ✅ Event vetting and recommendations
- ✅ Social media hotspot suggestions
- ✅ Priority support

---

## 🛠️ Implementation

### Core Files

1. **`lib/auth/tierMiddleware.ts`** - Tier enforcement logic
2. **`app/api/field-guide/nodes/route.ts`** - Example Pro tier endpoint

### Feature Mapping

```typescript
import { TIER_FEATURES } from '@/lib/auth/tierMiddleware';

// Free tier features
TIER_FEATURES.manual_truck_editing === 'free';
TIER_FEATURES.basic_menu_management === 'free';
TIER_FEATURES.event_scheduling === 'free';

// Starter tier features
TIER_FEATURES.automated_updates === 'starter';
TIER_FEATURES.push_notifications === 'starter';

// Pro tier features
TIER_FEATURES.ai_event_research === 'pro';
TIER_FEATURES.advanced_analytics === 'pro';
TIER_FEATURES.revenue_optimization === 'pro';
```

---

## 📝 Usage Examples

### Protecting an API Route

```typescript
// app/api/owner/premium-feature/route.ts
import { NextResponse } from 'next/server';
import { withTierProtection } from '@/lib/auth/tierMiddleware';

async function handler(request: Request, userId: string) {
  // This code only runs if user has required tier
  return NextResponse.json({ data: 'Premium feature data' });
}

// Protect route - requires 'starter' tier or higher
export const GET = withTierProtection(handler, 'starter');
```

### Checking Tier in Server Components

```typescript
import { getUserTier, checkUserTier } from '@/lib/auth/tierMiddleware';

// Get user's tier
const userTier = await getUserTier(userId);
console.log('User tier:', userTier); // 'free', 'starter', 'pro', or 'enterprise'

// Check if user has specific tier
const hasStarterAccess = await checkUserTier(userId, 'starter');
if (hasStarterAccess) {
  // Show starter features
}
```

### Checking Feature Access

```typescript
import { checkFeatureAccess } from '@/lib/auth/tierMiddleware';

// Check if user can access a specific feature
const canUseAutomatedUpdates = await checkFeatureAccess(userId, 'automated_updates');
if (!canUseAutomatedUpdates) {
  // Show upgrade prompt
}
```

### Client-Side Tier Checking (UI Only)

```typescript
import { checkTierClientSide } from '@/lib/auth/tierMiddleware';

// Check tier for UI display (NOT for security enforcement)
const hasProAccess = await checkTierClientSide(userId, 'pro');
if (hasProAccess) {
  // Show pro features in UI
} else {
  // Show upgrade button
}
```

⚠️ **Important**: Client-side checks are for UI only. Always enforce server-side!

---

## 🔐 Security Architecture

### Two-Layer Protection

1. **API Route Protection** (Primary)
   - `withTierProtection()` wrapper validates tier before executing handler
   - Returns 403 with upgrade information if insufficient tier
   - Cannot be bypassed client-side

2. **Database RLS** (Defense-in-Depth)
   - Subscription tier stored in `profiles` table
   - Updated automatically by Stripe webhooks
   - RLS policies prevent direct manipulation

### Error Responses

When a user tries to access a feature above their tier:

```json
{
  "error": "Insufficient subscription tier",
  "message": "This feature requires starter tier or higher. Your current tier: free",
  "required_tier": "starter",
  "current_tier": "free",
  "upgrade_url": "/owner-dashboard/billing"
}
```

**Status Code**: `403 Forbidden`

---

## ✅ Testing Tier Enforcement

### Manual Testing Steps

1. **Create test accounts with different tiers**:

   ```sql
   -- Free tier user (default)
   INSERT INTO profiles (id, subscription_tier) VALUES ('user-1', 'free');

   -- Starter tier user
   INSERT INTO profiles (id, subscription_tier) VALUES ('user-2', 'starter');

   -- Pro tier user
   INSERT INTO profiles (id, subscription_tier) VALUES ('user-3', 'pro');
   ```

2. **Test API endpoint access**:

   ```bash
   # Free user accessing starter feature (should fail)
   curl -H "Authorization: Bearer <free-user-token>" \
     http://localhost:3000/api/owner/premium-feature
   # Expected: 403 Forbidden

   # Starter user accessing starter feature (should work)
   curl -H "Authorization: Bearer <starter-user-token>" \
     http://localhost:3000/api/owner/premium-feature
   # Expected: 200 OK with data

   # Starter user accessing pro feature (should fail)
   curl -H "Authorization: Bearer <starter-user-token>" \
     http://localhost:3000/api/field-guide/nodes
   # Expected: 403 Forbidden
   ```

3. **Verify Stripe integration**:
   - Upgrade user via Stripe checkout
   - Verify webhook updates `subscription_tier`
   - Verify new features become accessible

### Automated Testing (Future)

```typescript
// __tests__/tier-enforcement.test.ts
describe('Tier Enforcement', () => {
  it('blocks free users from starter features', async () => {
    const response = await fetch('/api/owner/premium-feature', {
      headers: { Authorization: `Bearer ${freeUserToken}` },
    });
    expect(response.status).toBe(403);
  });

  it('allows starter users to access starter features', async () => {
    const response = await fetch('/api/owner/premium-feature', {
      headers: { Authorization: `Bearer ${starterUserToken}` },
    });
    expect(response.status).toBe(200);
  });
});
```

---

## 🎯 Adding New Tier-Gated Features

### Step 1: Add Feature to Tier Mapping

Edit `lib/auth/tierMiddleware.ts`:

```typescript
export const TIER_FEATURES = {
  // ... existing features

  // Add your new feature
  my_new_feature: 'starter' as SubscriptionTier, // or 'pro'
};
```

### Step 2: Create Protected API Route

```typescript
// app/api/owner/my-new-feature/route.ts
import { NextResponse } from 'next/server';
import { withTierProtection } from '@/lib/auth/tierMiddleware';

async function handler(request: Request, userId: string) {
  // Feature implementation
  return NextResponse.json({ data: 'feature data' });
}

export const GET = withTierProtection(handler, 'starter');
```

### Step 3: Update UI with Feature Access Check

```typescript
// In your component
import { checkTierClientSide } from '@/lib/auth/tierMiddleware';

const hasAccess = await checkTierClientSide(userId, 'starter');

return (
  <div>
    {hasAccess ? (
      <FeatureComponent />
    ) : (
      <UpgradePrompt requiredTier="starter" />
    )}
  </div>
);
```

---

## 📋 Checklist for New Tier-Gated Features

- [ ] Feature added to `TIER_FEATURES` in `tierMiddleware.ts`
- [ ] API route created with `withTierProtection()` wrapper
- [ ] UI updated with client-side tier check (for UX only)
- [ ] Server-side enforcement verified (cannot be bypassed)
- [ ] Error messages include upgrade URL
- [ ] Tested with all tier levels
- [ ] Added to billing page feature comparison

---

## 🚨 Common Pitfalls

### ❌ DON'T: Rely only on client-side checks

```typescript
// WRONG - Can be bypassed
if (userTier === 'pro') {
  await fetch('/api/sensitive-data'); // Anyone can call this!
}
```

### ✅ DO: Always enforce server-side

```typescript
// CORRECT - Server enforces tier
export const GET = withTierProtection(async (req, userId) => {
  // Only runs if user has required tier
  return NextResponse.json({ data: 'protected' });
}, 'pro');
```

### ❌ DON'T: Check tier for every request

```typescript
// WRONG - Unnecessary database queries
async function myFunction(userId: string) {
  const tier = await getUserTier(userId); // Called many times!
  // ... use tier
}
```

### ✅ DO: Check once, pass tier down

```typescript
// CORRECT - Check once at API route level
export const GET = withTierProtection(async (req, userId) => {
  // Tier already verified by wrapper
  await myFunction(userId); // Don't need to check again
}, 'pro');
```

---

## 🔄 Integration with Stripe

Tier enforcement is automatically integrated with Stripe:

1. **User upgrades** via `/owner-dashboard/billing`
2. **Stripe checkout** completes
3. **Webhook** (`/api/stripe/webhook`) receives event
4. **Database updated**: `profiles.subscription_tier` set to new tier
5. **Features unlocked**: User can now access tier-gated features

**Downgrade flow**:

1. **User cancels** subscription in Stripe portal
2. **Webhook** receives `customer.subscription.deleted`
3. **Database updated**: `subscription_tier` set back to 'free'
4. **Features locked**: User loses access to paid features

---

## 📚 References

- **Tier Middleware**: `lib/auth/tierMiddleware.ts`
- **Example Protected Routes**:
  - `app/api/field-guide/nodes/route.ts` (Pro)
- **Stripe Integration**: `app/api/stripe/webhook/route.ts`
- **Billing Page**: `app/owner-dashboard/billing/page.tsx`

---

**Last Updated**: 2025-11-29
**Status**: ✅ Infrastructure complete, ready for feature implementation
