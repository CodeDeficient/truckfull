import { verifyOrganizerFromCookies } from '@/lib/auth/authHelpers';
import { logError } from '@/lib/logging';
import OrganizerDashboardClient from './OrganizerDashboardClient';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function OrganizerDashboardPage() {
  try {
    const { ok } = await verifyOrganizerFromCookies();

    if (!ok) {
      // redirect('/login?redirect=/organizer'); // Allow client to handle auth via API
    }
  } catch (error) {
    // Re-throw Next.js redirects (NEXT_REDIRECT)
    if ((error as Error).message === 'NEXT_REDIRECT') {
      throw error;
    }
    logError('Error verifying organizer access:', error);
    // If real error, default to home with auth modal
    // redirect('/?auth=open'); // Allow client to handle auth
  }

  return <OrganizerDashboardClient />;
}
