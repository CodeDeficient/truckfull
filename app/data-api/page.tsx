import type { Metadata } from 'next';
import { SeoPageShell } from '@/components/ui/organisms/SeoPageShell';
import { ApiWaitlistForm } from '@/components/waitlist/ApiWaitlistForm';

export const metadata: Metadata = {
  title: 'TruckFull API Waitlist',
  description: 'A paid API for TruckFull data is coming. Join the waitlist.',
};

export default function DataApiPage(): React.JSX.Element {
  return (
    <SeoPageShell>
      <div className="container mx-auto max-w-xl px-4 py-12">
        <h1 className="mb-3 text-3xl font-bold text-foreground">TruckFull API</h1>
        <p className="mb-6 text-muted-foreground">
          A paid API for TruckFull data is coming. Join the waitlist and we will email you when it
          opens.
        </p>
        <ApiWaitlistForm />
      </div>
    </SeoPageShell>
  );
}
