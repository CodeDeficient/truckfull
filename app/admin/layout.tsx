import { notFound, redirect } from 'next/navigation';
import { checkAdminAccessServer } from '@/lib/auth/adminAuthHelpers';
import { AdminLayoutClient } from './_components/AdminLayoutClient';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { readonly children: React.ReactNode }) {
  const authResult = await checkAdminAccessServer();

  if (!authResult.success) {
    if (authResult.userId === undefined) {
      redirect('/?auth=open');
    }
    notFound();
  }

  return (
    <AdminLayoutClient
      userEmail={authResult.email ?? 'Unknown'}
      userRole={authResult.role ?? 'admin'}
    >
      {children}
    </AdminLayoutClient>
  );
}
