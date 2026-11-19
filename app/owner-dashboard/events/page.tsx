import { redirect } from 'next/navigation';
import { verifyOwnerAccessFromCookies } from '@/lib/auth/ownerAccessServer';
import EnhancedOwnerDashboardClient from '../_components/EnhancedOwnerDashboardClient';

// Ensure Node.js lambda on Vercel
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function OwnerDashboardEventsPage() {
  // Owners, admins, or entitled (trial/paid/comped) users may access the
  // owner dashboard; authenticated users without access land on Billing.
  const access = await verifyOwnerAccessFromCookies();

  if (access.outcome === 'unauthenticated') {
    redirect('/?auth=open');
  }
  if (access.outcome === 'authenticated_without_access') {
    redirect('/owner-dashboard/billing');
  }

  // Access verified - render dashboard
  return <EnhancedOwnerDashboardClient />;
}
