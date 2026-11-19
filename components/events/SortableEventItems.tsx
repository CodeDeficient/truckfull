'use client';

import { useState, type JSX, type ReactNode } from 'react';
import {
  sortEventEntries,
  type EventSortMode,
  type SortableEventEntry,
} from '@/lib/events/eventSort';

export interface SortableEventItem extends SortableEventEntry {
  readonly node: ReactNode;
}

interface SortableEventItemsProps {
  readonly items: readonly SortableEventItem[];
  readonly listClassName: string;
}

const MODES: readonly { readonly mode: EventSortMode; readonly label: string }[] = [
  { mode: 'date', label: 'Soonest' },
  { mode: 'az', label: 'A–Z' },
];

export function SortableEventItems({ items, listClassName }: SortableEventItemsProps): JSX.Element {
  const [mode, setMode] = useState<EventSortMode>('date');
  const sorted = sortEventEntries(items, mode);

  return (
    <>
      <div role="group" aria-label="Sort events" className="mb-2 flex justify-end gap-2">
        {MODES.map((option) => (
          <button
            key={option.mode}
            type="button"
            aria-pressed={mode === option.mode}
            onClick={() => setMode(option.mode)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-colors ${
              mode === option.mode
                ? 'border-red-500 bg-red-500 text-white'
                : 'border-white/30 text-white/70 hover:border-white hover:text-white'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      <ul className={listClassName}>{sorted.map((item) => item.node)}</ul>
    </>
  );
}
