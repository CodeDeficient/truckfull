import Link from '@/components/navigation/IntentLink';
import { Truck } from 'lucide-react';

/**
 * Shared empty state for truck-dependent dashboard surfaces. Owner-tool
 * entitlement no longer requires a truck, so entitled truckless users see
 * this guidance instead of authorization errors or silent no-ops.
 */
export function NoTrucksGuidance() {
  return (
    <div className="bg-card rounded-lg py-12 px-6 text-center text-muted-foreground">
      <Truck className="w-12 h-12 mx-auto mb-4 opacity-30" />
      <p className="text-lg font-medium text-foreground">Claim your truck or submit it for review.</p>
      <p className="text-sm mt-1">
        Listing features need a truck linked to your account.
      </p>
      <Link
        href="/claim-your-truck"
        className="inline-flex items-center justify-center gap-2 px-4 py-2 mt-4 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium"
      >
        Claim or submit your truck
      </Link>
    </div>
  );
}