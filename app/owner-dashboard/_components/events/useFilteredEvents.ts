'use client';

import { useMemo } from 'react';
import { getSourceCategory } from '@/lib/events/sourceDisplay';
import type { MapEvent } from '@/components/map/eventMapTypes';

type SourceFilter = 'all' | 'official' | 'platform' | 'community';

interface EventFilters {
  startDate: string;
  endDate: string;
  minVettingScore: number;
  minRelevanceScore: number;
  sourceFilter: SourceFilter;
  showUnvetted: boolean;
  researchedOnly: boolean;
  relevantOnly: boolean;
}

export function filterByDateRange(
  events: MapEvent[],
  startDate: string | null,
  endDate: string | null,
): MapEvent[] {
  if (!startDate && !endDate) return events;
  return events.filter((e) => {
    if (e.start_date == null) return false;
    if (startDate && e.start_date < startDate) return false;
    if (endDate && e.start_date > endDate) return false;
    return true;
  });
}

export function useFilteredEvents(
  events: MapEvent[],
  filters: EventFilters,
  _monthFilter: string,
  searchQuery: string,
  hiddenEventIds: Set<string>,
): MapEvent[] {
  return useMemo(() => {
    let filtered = events.filter(
      (e) =>
        e.location_data?.lat != null &&
        e.location_data?.lng != null &&
        Number.isFinite(e.location_data.lat) &&
        Number.isFinite(e.location_data.lng) &&
        !Number.isNaN(e.location_data.lat) &&
        !Number.isNaN(e.location_data.lng) &&
        Math.abs(e.location_data.lat) <= 90 &&
        Math.abs(e.location_data.lng) <= 180,
    );

    if (hiddenEventIds.size > 0) {
      filtered = filtered.filter((e) => !hiddenEventIds.has(e.id));
    }

    filtered = filterByDateRange(filtered, filters.startDate || null, filters.endDate || null);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          (e.description && e.description.toLowerCase().includes(q)),
      );
    }

    filtered = filtered.filter(
      (e) => !(filters.minVettingScore > 0 && (e.vetting_score ?? 0) < filters.minVettingScore),
    );

    if (filters.sourceFilter !== 'all') {
      filtered = filtered.filter((e) => {
        const category = getSourceCategory(e.source_type ?? null);
        return category === filters.sourceFilter;
      });
    }

    if (filters.researchedOnly) {
      filtered = filtered.filter((e) => typeof e.vetting_score === 'number' && e.vetting_score > 0);
    }

    if (filters.relevantOnly) {
      filtered = filtered.filter(
        (e) => typeof e.relevance_score === 'number' && e.relevance_score > 0,
      );
    }

    if (filters.minRelevanceScore > 0) {
      filtered = filtered.filter((e) => (e.relevance_score ?? 0) >= filters.minRelevanceScore);
    }

    return filtered;
  }, [events, filters, searchQuery, hiddenEventIds]);
}
