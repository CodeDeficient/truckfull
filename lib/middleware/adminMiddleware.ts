// lib/middleware/adminMiddleware.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { verifyAdminAccess } from '@/lib/auth/helpers';
import { logError } from '@/lib/logging';

/**
 * Middleware to protect admin routes
 * @param request - The incoming request
 * @returns NextResponse that either continues to the route or redirects
 */
export async function adminMiddleware(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // Get user session
    const {
      data: { session },
      error,
    } = await supabaseAdmin.auth.getSession();

    if (error || !session?.user) {
      // No valid session, redirect to login
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Check if user has admin access
    const isAdmin = await verifyAdminAccess(session.user.id);

    if (!isAdmin) {
      // User doesn't have admin access, redirect to access denied
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }

    // User is authenticated and has admin access, continue
    return NextResponse.next();
  } catch (error) {
    logError('Admin middleware error:', error);
    // On error, redirect to access denied
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }
}
