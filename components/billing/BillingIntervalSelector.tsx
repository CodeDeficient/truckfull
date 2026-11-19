import * as React from 'react';

export type BillingInterval = 'monthly' | 'yearly' | 'weekly';

export interface BillingIntervalSelectorProps {
  // Map of interval -> Stripe Price ID. Omit to disable that option in the UI.
  readonly priceIds: Readonly<Partial<Record<BillingInterval, string>>>;
  // Current selection (optional). If not provided, internal state is used.
  readonly value?: BillingInterval;
  // Callback when selection changes. Exposes the key and resolved priceId (if available).
  readonly onChange?: (interval: BillingInterval, priceId?: string) => void;
  // Optional: customize labels
  readonly labels?: Readonly<Partial<Record<BillingInterval, string>>>;
  // Optional: compact rendering for tight spaces
  readonly compact?: boolean;
}

const defaultLabels: Record<BillingInterval, string> = {
  monthly: 'Monthly',
  yearly: 'Yearly',
  weekly: 'Weekly',
};

export function BillingIntervalSelector(props: Readonly<BillingIntervalSelectorProps>) {
  const { priceIds, value, onChange, labels, compact } = props;

  const intervals: BillingInterval[] = ['monthly', 'yearly', 'weekly'];
  const [selected, setSelected] = React.useState<BillingInterval>(value ?? 'monthly');

  React.useEffect(() => {
    if (value != undefined && value !== selected) setSelected(value);
  }, [value, selected]);

  const handleSelect = (interval: BillingInterval) => {
    setSelected(interval);
    onChange?.(interval, priceIds[interval]);
  };

  return (
    <div
      role="group"
      aria-label="Billing interval"
      className={compact === true ? 'flex gap-2' : 'flex gap-3'}
    >
      {intervals.map((interval) => {
        const isAvailable = Boolean(priceIds[interval]);
        const label = labels?.[interval] ?? defaultLabels[interval];
        const isSelected = selected === interval;
        return (
          <button
            key={interval}
            type="button"
            onClick={() => handleSelect(interval)}
            disabled={!isAvailable}
            aria-pressed={isSelected}
            className={[
              'rounded-md border px-3 py-1 text-sm',
              isSelected ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-transparent',
              isAvailable
                ? 'hover:bg-black/5 dark:hover:bg-white/10'
                : 'opacity-50 cursor-not-allowed',
            ].join(' ')}
            title={isAvailable ? undefined : 'Not configured yet'}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
