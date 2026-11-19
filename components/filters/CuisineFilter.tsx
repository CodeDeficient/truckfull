'use client';

import { Check, ChevronDown, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CUISINE_TYPES } from '@/lib/filters/types';

interface CuisineFilterProps {
  /** Currently selected cuisines */
  readonly selectedCuisines: string[];
  /** Callback when cuisines change */
  readonly onCuisinesChange: (cuisines: string[]) => void;
  /** Optional CSS classes */
  readonly className?: string;
  /** Whether to show as chips on mobile */
  readonly showChips?: boolean;
}

/**
 * Multi-select filter for cuisine types.
 * Shows as chips on larger screens and dropdown on mobile.
 */
export function CuisineFilter({
  selectedCuisines,
  onCuisinesChange,
  className,
  showChips = true,
}: CuisineFilterProps) {
  const toggleCuisine = (cuisine: string) => {
    if (selectedCuisines.includes(cuisine)) {
      onCuisinesChange(selectedCuisines.filter((c) => c !== cuisine));
    } else {
      onCuisinesChange([...selectedCuisines, cuisine]);
    }
  };

  const clearAll = () => {
    onCuisinesChange([]);
  };

  // Mobile dropdown view
  const DropdownView = () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn('gap-2 justify-between', className)}
          aria-label="Select cuisines"
          aria-expanded="false"
          aria-haspopup="listbox"
        >
          <span>
            {(() => {
              if (selectedCuisines.length === 0) {
                return 'All Cuisines';
              }
              const plural = selectedCuisines.length > 1 ? 's' : '';
              return `${selectedCuisines.length} Cuisine${plural}`;
            })()}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="space-y-1">
          {selectedCuisines.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="w-full justify-start text-xs"
            >
              Clear all
            </Button>
          )}
          <div
            className="max-h-64 overflow-auto space-y-1"
            role="listbox"
            aria-label="Cuisine types"
            aria-multiselectable="true"
          >
            {CUISINE_TYPES.map((cuisine) => {
              const isSelected = selectedCuisines.includes(cuisine);
              return (
                <button
                  key={cuisine}
                  onClick={() => toggleCuisine(cuisine)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    'focus:bg-accent focus:text-accent-foreground focus:outline-none',
                    isSelected && 'bg-accent',
                  )}
                  role="option"
                  aria-selected={isSelected}
                >
                  <span>{cuisine}</span>
                  {isSelected && <Check className="h-4 w-4" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );

  // Desktop chips view
  const ChipsView = () => (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {selectedCuisines.length === 0 ? (
        <Badge variant="secondary" className="text-xs">
          All Cuisines
        </Badge>
      ) : (
        selectedCuisines.map((cuisine) => (
          <Badge key={cuisine} variant="default" className="gap-1 pr-1 text-xs">
            <span>{cuisine}</span>
            <button
              onClick={() => toggleCuisine(cuisine)}
              className="ml-1 rounded-full hover:bg-primary-foreground/20 p-0.5 transition-colors"
              aria-label={`Remove ${cuisine} filter`}
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </Badge>
        ))
      )}
      {selectedCuisines.length > 0 && (
        <Button variant="ghost" size="sm" onClick={clearAll} className="h-6 px-2 text-xs">
          Clear all
        </Button>
      )}
    </div>
  );

  // Responsive rendering
  return (
    <>
      {/* Mobile view */}
      <div className="sm:hidden">
        <DropdownView />
      </div>

      {/* Desktop view */}
      <div className="hidden sm:block">{showChips ? <ChipsView /> : <DropdownView />}</div>
    </>
  );
}
