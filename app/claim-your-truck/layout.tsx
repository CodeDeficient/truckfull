import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Claim Your Truck — TruckFull',
  description:
    'Search unclaimed food trucks and start the verification process to claim ownership of your business listing on TruckFull.',
};

export default function ClaimYourTruckLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return children;
}
