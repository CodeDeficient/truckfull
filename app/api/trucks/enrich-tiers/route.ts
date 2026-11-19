import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logError } from '@/lib/logging';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { checkRateLimited, getClientIp, standardLimiter } from '@/lib/middleware/rateLimit';

export const dynamic = 'force-dynamic';

const RequestSchema = z.object({
  ownerIds: z.array(z.string().uuid()).max(500),
});

type EnrichTiersResponse = {
  tiers: Record<string, string | null>;
};

/**
 * POST /api/trucks/enrich-tiers
 *
 * Resolves subscription_tier for a batch of owner_ids by querying the profiles
 * table with the admin client. Anon-key clients cannot read profiles due to
 * RLS ("Users can view their own profile"), so this server endpoint is the
 * only path for the public client to obtain tier data.
 *
 * Body: { ownerIds: string[] }
 * Response: { tiers: Record<ownerId, subscriptionTier | null> }
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimitResult = await checkRateLimited(`enrich-tiers:${ip}`, standardLimiter);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests', retryAfter: rateLimitResult.retryAfter },
      { status: 429, headers: { 'Retry-After': String(rateLimitResult.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'ownerIds must be an array of up to 500 UUIDs' },
      { status: 400 },
    );
  }

  const { ownerIds } = parsed.data;
  if (ownerIds.length === 0) {
    return NextResponse.json<EnrichTiersResponse>({ tiers: {} });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, subscription_tier')
    .in('id', ownerIds);

  if (error) {
    logError('Error fetching profiles for tier enrichment:', error);
    return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
  }

  const tiers: Record<string, string | null> = {};
  for (const ownerId of ownerIds) {
    tiers[ownerId] = null;
  }
  for (const profile of data ?? []) {
    tiers[profile.id] = profile.subscription_tier;
  }

  return NextResponse.json<EnrichTiersResponse>({ tiers });
}
