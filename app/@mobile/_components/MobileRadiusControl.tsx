'use client';

import React, { useEffect, useState } from 'react';
import { Slider } from '@/components/ui/slider';

interface MobileRadiusControlProps {
  readonly radiusMiles: number;
  readonly onSelect: (radiusMiles: number) => void;
  readonly options: readonly number[];
}

function nearestIndex(options: readonly number[], value: number): number {
  let bestIndex = 0;
  let bestDiff = Number.POSITIVE_INFINITY;
  for (const [index, option] of options.entries()) {
    const diff = Math.abs(option - value);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIndex = index;
    }
  }
  return bestIndex;
}

export function MobileRadiusControl({
  radiusMiles,
  onSelect,
  options,
}: MobileRadiusControlProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [index, setIndex] = useState(() => nearestIndex(options, radiusMiles));

  useEffect(() => {
    setIndex(nearestIndex(options, radiusMiles));
  }, [radiusMiles, options]);

  const selectedMiles = options[index] ?? radiusMiles;

  return (
    <div className="absolute top-4 left-4 z-20 flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label="Change search distance"
        aria-expanded={isOpen}
        className="rounded-full border border-zinc-700 bg-zinc-900/90 px-3 py-1 text-[11px] font-semibold tabular-nums text-white shadow-md backdrop-blur"
      >
        {selectedMiles} mi
      </button>

      {isOpen && (
        <div className="flex flex-col items-center gap-1 rounded-full border border-zinc-700 bg-zinc-900/90 px-2 py-2 shadow-xl backdrop-blur">
          <div className="h-28">
            <Slider
              orientation="vertical"
              value={[index]}
              onValueChange={([next]) => setIndex(next)}
              onValueCommit={([next]) => {
                const miles = options[next];
                if (miles !== undefined) onSelect(miles);
              }}
              min={0}
              max={options.length - 1}
              step={1}
              aria-label="Search distance"
              aria-valuetext={`${selectedMiles} miles`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
