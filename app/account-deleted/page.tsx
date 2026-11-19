/**
 * /account-deleted — Account Deletion Confirmation Page
 * Phase 2.1.2 GREEN — Minimal page to pass RED tests
 *
 * Displayed after user confirms account deletion.
 */
import type { Metadata } from 'next';
import Link from '@/components/navigation/IntentLink';

export const metadata: Metadata = {
  title: 'Account Deleted | TruckFull',
  description: 'Your account has been permanently deleted.',
};

export default function AccountDeletedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">Account Deleted</h1>
        <p className="text-muted-foreground">
          Your account and all associated data have been permanently deleted.
        </p>
        <Link href="/" className="text-primary hover:underline">
          Return to Home
        </Link>
      </div>
    </div>
  );
}
