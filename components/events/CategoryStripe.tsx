import type { JSX } from 'react';

interface CategoryStripeProps {
  readonly label: string;
  readonly color: string;
}

export function CategoryStripe({ label, color }: CategoryStripeProps): JSX.Element {
  return (
    <div className="inline-flex items-center gap-2 text-white">
      <span aria-hidden style={{ backgroundColor: color, width: '8px', height: '24px' }} />
      <span className="text-xs font-semibold uppercase tracking-widest">{label}</span>
    </div>
  );
}