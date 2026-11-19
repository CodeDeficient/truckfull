/**
 * DELETE /api/account/delete
 *
 * Authenticated User Self-Deletion Endpoint
 *
 * Handles account deletion requests from authenticated users who want to delete
 * their own accounts. This is NOT the Facebook Data Deletion Callback.
 *
 * For Facebook Data Deletion Callback (required for App Review compliance),
 * see POST /api/facebook/deletion
 */
import { type NextRequest, NextResponse } from 'next/server';
import { getRequestUserId } from '@/lib/auth/requestUser.server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { checkRateLimited, authLimiter, getClientIp } from '@/lib/middleware/rateLimit';
import { logError, logMessage } from '@/lib/logging';
import { resolveSiteUrl } from '@/lib/utils/siteUrl';
import { releaseOwnedTrucks } from '@/lib/services/accountDeletion.server';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params: _params }: { params: Promise<Record<string, string>> },
) {
  const ip = getClientIp(request);
  const rateLimitResult = await checkRateLimited(`account-delete:${ip}`, authLimiter);

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests', retryAfter: rateLimitResult.retryAfter },
      { status: 429 },
    );
  }

  const userId = await getRequestUserId();

  if (userId === null) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseAdmin = getSupabaseAdmin();

  try {
    await releaseOwnedTrucks(userId);
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      logError('Failed to delete user account', { userId, error: deleteError });
      return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
    }

    logMessage(`User ${userId} account deleted via self-deletion`);

    const siteUrl = resolveSiteUrl(process.env);
    return NextResponse.json({ url: `${siteUrl}/account-deleted` });
  } catch (error) {
    logError('Unexpected error during account deletion', { userId, error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
