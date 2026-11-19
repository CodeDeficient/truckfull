import { getSourceCategory, type SourceCategory } from '@/lib/events/sourceDisplay';

export interface FilterableEvent {
  id: string;
  name: string;
  description?: string;
  start_date: string | null;
  end_date?: string | null;
  event_source: 'platform' | 'external';
  source?: string;
  source_type?: string | null;
  vetting_score?: number | null;
  relevance_score?: number | null;
}

export interface EventFilters {
  startDate: string;
  endDate: string;
  minVettingScore: number;
  minRelevanceScore: number;
  sourceFilter: 'all' | SourceCategory;
  showUnvetted: boolean;
  researchedOnly: boolean;
  relevantOnly: boolean;
}

function matchesSourceFilter(
  sourceFilter: 'all' | SourceCategory,
  event: FilterableEvent,
): boolean {
  if (sourceFilter === 'all') return true;
  const category = getSourceCategory(event.source_type ?? null);
  return category === sourceFilter;
}

export function filterEvents(
  events: FilterableEvent[],
  filters: EventFilters,
  searchQuery: string,
): FilterableEvent[] {
  return events.filter((event) => {
    const matchesSearch =
      event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSource = matchesSourceFilter(filters.sourceFilter, event);
    const hasDate = event.start_date ? new Date(event.start_date) : null;
    const matchesStartDate =
      !filters.startDate || (hasDate && hasDate >= new Date(filters.startDate));
    const matchesEndDate =
      !filters.endDate || (hasDate && hasDate <= new Date(filters.endDate + 'T23:59:59'));
    const vetScore = event.vetting_score;
    const hasResearch = typeof vetScore === 'number' && vetScore > 0;
    const matchesResearchedOnly = !filters.researchedOnly || hasResearch;
    const matchesMinScore =
      filters.minVettingScore === 0 || (vetScore ?? -1) >= filters.minVettingScore;
    const relScore = event.relevance_score;
    const hasRelevance = typeof relScore === 'number' && relScore > 0;
    const matchesRelevantOnly = !filters.relevantOnly || hasRelevance;
    const matchesMinRelevance =
      filters.minRelevanceScore === 0 || (relScore ?? -1) >= filters.minRelevanceScore;
    return (
      matchesSearch &&
      matchesSource &&
      matchesStartDate &&
      matchesEndDate &&
      matchesResearchedOnly &&
      matchesMinScore &&
      matchesRelevantOnly &&
      matchesMinRelevance
    );
  });
}
