/* eslint-disable max-lines-per-function -- NOTE: Extract preset list and slider into subcomponents later. */
'use client';

import { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { RADIUS_OPTIONS_GUEST, RADIUS_OPTIONS_AUTHENTICATED } from '@/lib/filters/types';
import { useSafeAuth } from '@/lib/auth/useSafeAuth';
import { useDebounce } from '@/hooks/useDebounce';

interface RadiusControlProps {
  /** Current radius value in miles */
  readonly value: number;
  /** Callback when radius changes */
  readonly onChange: (value: number) => void;
  /** Whether location is available */
  readonly hasLocation?: boolean;
  /** Optional CSS classes */
  readonly className?: string;
  /** Minimum radius in miles */
  readonly min?: number;
  /** Maximum radius in miles */
  readonly max?: number;
  /** Step increment */
  readonly step?: number;
  /** Whether to debounce the onChange callback */
  readonly debounce?: boolean;
  /** Debounce delay in milliseconds */
  readonly debounceDelay?: number;
  /** Callback when slider is being dragged (immediate feedback) */
  readonly onImmediateChange?: (value: number) => void;
}

/**
 * Slider control for setting search radius with numeric readout.
 * Includes visual feedback, debouncing, and accessibility features.
 *
 * Features:
 * - Adjustable radius from 1-50 miles (configurable)
 * - Live miles label that updates immediately
 * - Debounced onChange callback to prevent excessive API calls
 * - Preset quick-select buttons
 * - Visual feedback for location availability
 */
export function RadiusControl({
  value,
  onChange,
  hasLocation = true,
  className,
  min = 1,
  max, // Will be determined dynamically
  step = 1,
  debounce = true,
  debounceDelay = 500,
  onImmediateChange,
}: RadiusControlProps) {
  const { user } = useSafeAuth();

  // Check if user is admin by role
  const isAdmin = user?.role === 'admin' || user?.email?.endsWith('@truckfull.com');

  // Determine max radius and options based on authentication/admin status
  const radiusOptions = (() => {
    if (isAdmin) {
      return [5, 10, 25, 50, 100, 200, 300, 500, 1000, 10_000];
    } else if (user) {
      return RADIUS_OPTIONS_AUTHENTICATED;
    } else {
      return RADIUS_OPTIONS_GUEST;
    }
  })();

  const maxRadius = (() => {
    if (isAdmin) {
      return 10_000;
    } else if (user) {
      return 300;
    } else {
      return 30;
    }
  })();
  const effectiveMax = max ?? maxRadius;

  // Local state for immediate UI feedback
  const [localValue, setLocalValue] = useState(value);

  // Debounced value for API calls
  const debouncedValue = useDebounce(localValue, debounce ? debounceDelay : 0);

  // Sync external value changes to local state
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Trigger onChange when debounced value changes
  useEffect(() => {
    if (debouncedValue !== value) {
      onChange(debouncedValue);
    }
  }, [debouncedValue, value, onChange]);

  const handleSliderChange = (values: number[]) => {
    const newValue = values[0];
    setLocalValue(newValue);

    // Immediate feedback callback (for UI updates)
    if (onImmediateChange) {
      onImmediateChange(newValue);
    }

    // If debouncing is disabled, call onChange immediately
    if (!debounce) {
      onChange(newValue);
    }
  };

  const handlePresetClick = (presetValue: number) => {
    setLocalValue(presetValue);
    onChange(presetValue); // Preset clicks trigger immediate change
  };

  // Find nearest preset option for highlighting (use localValue for immediate feedback)
  let nearestOption: number = radiusOptions[0];
  let minDiff = Math.abs(nearestOption - localValue);

  for (const option of radiusOptions) {
    const diff = Math.abs(option - localValue);
    if (diff < minDiff) {
      minDiff = diff;
      nearestOption = option;
    }
  }

  // Determine if we're currently updating (for loading indicator)
  const isUpdating = debounce && localValue !== value;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Label and value display */}
      <div className="flex items-center justify-between">
        <label htmlFor="radius-slider" className="flex items-center gap-2 text-sm font-medium">
          <MapPin className="h-4 w-4" aria-hidden="true" />
          <span>Search Radius</span>
        </label>
        <div className="flex items-baseline gap-1">
          <span
            className={cn(
              'text-lg font-semibold tabular-nums transition-opacity',
              isUpdating && 'opacity-60',
            )}
            aria-live="polite"
            aria-atomic="true"
          >
            {localValue}
          </span>
          <span className="text-sm text-muted-foreground">
            {localValue === 1 ? 'mile' : 'miles'}
            {isUpdating && <span className="ml-1 text-xs">(updating...)</span>}
          </span>
        </div>
      </div>

      {/* Slider */}
      <div className="px-2">
        <Slider
          id="radius-slider"
          value={[localValue]}
          onValueChange={handleSliderChange}
          min={min}
          max={effectiveMax}
          step={step}
          disabled={!hasLocation}
          className={cn(!hasLocation && 'opacity-50')}
          aria-label="Search radius in miles"
          aria-valuemin={min}
          aria-valuemax={effectiveMax}
          aria-valuenow={localValue}
          aria-valuetext={`${localValue} ${localValue === 1 ? 'mile' : 'miles'}`}
        />

        {/* Min and Max labels */}
        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
          <span>{min} mi</span>
          <span>{effectiveMax} mi</span>
        </div>
      </div>

      {/* Preset options */}
      <div className="flex justify-between px-2">
        {radiusOptions
          .filter((opt) => opt >= min && opt <= effectiveMax)
          .map((option) => (
            <button
              key={option}
              onClick={() => handlePresetClick(option)}
              disabled={!hasLocation}
              className={cn(
                'text-xs px-2 py-1 rounded transition-all',
                'hover:bg-secondary focus:bg-secondary focus:outline-none',
                option === nearestOption
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground',
                !hasLocation && 'cursor-not-allowed opacity-50',
              )}
              aria-label={`Set radius to ${option} miles`}
            >
              {option}mi
            </button>
          ))}
      </div>

      {/* Location warning */}
      {!hasLocation && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <MapPin className="h-3 w-3" aria-hidden="true" />
          Location required for radius filtering
        </p>
      )}
    </div>
  );
}
