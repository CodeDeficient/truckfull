import { redirect } from 'next/navigation';
import UserDashboardClient from './_components/UserDashboardClient';

export const dynamic = 'force-dynamic';

export default async function UserDashboardPage() {
  // Dynamically import to avoid static graph resolution quirks
  const { verifyRoleFromCookies } = await import('@/lib/auth/authHelpers');

  const { ok } = await verifyRoleFromCookies(['customer', 'admin']);
  if (!ok) {
    redirect('/unauthorized');
  }
  return <UserDashboardClient />;
}
