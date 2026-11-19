'use client';

import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFiltersStore } from '@/lib/stores/useFiltersStore';
import { RADIUS_OPTIONS_GUEST, RADIUS_OPTIONS_AUTHENTICATED } from '@/lib/filters/types';
import { useSafeAuth } from '@/lib/auth/useSafeAuth';

interface RadiusFilterProps {
  readonly className?: string;
}

export function RadiusFilter({ className }: RadiusFilterProps) {
  const { radiusMiles, setRadiusMiles } = useFiltersStore();
  const { user } = useSafeAuth();
  const [selectedRadius, setSelectedRadius] = useState<string>(radiusMiles.toString());

  // Determine which radius options to use based on authentication status
  const radiusOptions = user ? RADIUS_OPTIONS_AUTHENTICATED : RADIUS_OPTIONS_GUEST;

  // Sync local state with store when store value changes
  useEffect(() => {
    setSelectedRadius(radiusMiles.toString());
  }, [radiusMiles]);

  const handleRadiusChange = (value: string) => {
    const radius = Number(value);
    if (Number.isNaN(radius)) {
      return;
    }
    setSelectedRadius(value);
    setRadiusMiles(radius);
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-sm text-gray-700 dark:text-gray-300 hidden sm:inline">Within:</span>
      <Select value={selectedRadius} onValueChange={handleRadiusChange}>
        <SelectTrigger className="w-24 h-8 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {radiusOptions.map((option) => (
            <SelectItem key={option} value={option.toString()}>
              {option} mi
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
