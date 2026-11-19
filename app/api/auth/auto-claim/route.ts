import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/utils/server';
import { findMatchingUnclaimedTruck, claimTruckForUser } from '@/lib/services/claimService';
import { logError } from '@/lib/logging';
import { z } from 'zod';

// Zod schema for POST body validation
const ClaimBodySchema = z.object({
  truckId: z.string().min(1, 'truckId is required'),
  action: z.string().optional(),
});

// --- Server-side session cache (5 min TTL) ---
// Cache key strategy: Use user_id instead of email for automatic invalidation
// on email changes. User ID is stable across email updates (triggered by
// auth.users AFTER UPDATE), ensuring cache consistency.
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX_SIZE = 1000;

interface CacheEntry {
  result: unknown;
  expiresAt: number;
}

const matchingTruckCache = new Map<string, CacheEntry>();

function getCached(userId: string): unknown | undefined {
  const entry = matchingTruckCache.get(userId);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    matchingTruckCache.delete(userId);
    return undefined;
  }
  return entry.result;
}

function setCache(userId: string, result: unknown): void {
  if (matchingTruckCache.size >= CACHE_MAX_SIZE) {
    const firstKey = matchingTruckCache.keys().next().value;
    if (firstKey) matchingTruckCache.delete(firstKey);
  }
  matchingTruckCache.set(userId, {
    result,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

function invalidateCache(userId: string): void {
  matchingTruckCache.delete(userId);
}

/**
 * GET: Check if there's a matching unclaimed truck for the authenticated user
 * Results are cached for 5 minutes per user_id (stable identifier).
 */
export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || !user.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const cached = getCached(user.id);
    if (cached !== undefined) {
      return NextResponse.json({ matchingTruck: cached, cached: true });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role === 'food_truck_owner') {
      setCache(user.id, null);
      return NextResponse.json({ matchingTruck: null });
    }

    const matchingTruck = await findMatchingUnclaimedTruck(user.email);

    setCache(user.id, matchingTruck);

    return NextResponse.json({ matchingTruck });
  } catch (error) {
    logError('Error checking for matching truck:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST: Claim a matching truck
 * Invalidates the cache for the claiming user by user_id.
 */
export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Validate request body with Zod
    const body = await request.json();
    const parseResult = ClaimBodySchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { truckId } = parseResult.data;

    if (!user.email) {
      return NextResponse.json({ error: 'User email required' }, { status: 400 });
    }

    const result = await claimTruckForUser(truckId, user.id, user.email);

    if (!result.success) {
      if (result.error === 'Email does not match truck contact email') {
        return NextResponse.json({ error: result.error }, { status: 403 });
      }
      if (result.error === 'Truck not found or already claimed') {
        return NextResponse.json({ error: 'Truck is already claimed' }, { status: 409 });
      }
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    invalidateCache(user.id);

    return NextResponse.json({
      success: true,
      message: 'Truck claimed successfully!',
      newRole: 'food_truck_owner',
      trialStarted: result.trialStarted ?? false,
    });
  } catch (error) {
    logError('Error in auto-claim endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
