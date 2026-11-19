'use client';

import { SearchInputWithIcon } from './SearchInputWithIcon';
import { RadiusFilter } from '@/components/filters/RadiusFilter';
import type { SearchFilters } from '@/lib/search/types';

interface MainSearchSectionProps {
  readonly filters: SearchFilters;
  readonly setFilters: (filters: SearchFilters) => void;
  readonly _loading?: boolean;
  readonly handleSearch: () => void;
  readonly _showAdvanced: boolean;
  readonly _setShowAdvanced: (show: boolean) => void;
  readonly _activeFilterCount: number;
}

/**
 * Renders the main search section with input, button, and advanced filter toggle.
 * @example
 * MainSearchSection({
 *   filters: { query: '' },
 *   setFilters: (filters) => { /* update filters */
export function MainSearchSection({
  filters,
  setFilters,
  _loading,
  handleSearch,
  _showAdvanced,
  _setShowAdvanced,
  _activeFilterCount,
}: MainSearchSectionProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 sm:space-x-2">
      <SearchInputWithIcon
        placeholder="Search food trucks, cuisine, or menu items..."
        value={filters.query}
        onChange={(e) => setFilters({ ...filters, query: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleSearch();
          }
        }}
      />
      <RadiusFilter className="hidden md:flex" />
    </div>
  );
}
