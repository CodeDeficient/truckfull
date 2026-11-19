import type { Metadata } from 'next';

export function generateMetadata(): Metadata {
  return {
    title: {
      template: '%s | TruckFull Blog',
      default: 'TruckFull Blog',
    },
  };
}

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      {children}
    </main>
  );
}
