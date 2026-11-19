import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Event Organizer Dashboard | TruckFull',
  description: 'Create and manage food truck events. Connect with local food truck vendors.',
};

export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">{children}</div>
  );
}
