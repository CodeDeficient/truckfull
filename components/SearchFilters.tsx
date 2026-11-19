'use client';

import { Card, CardContent } from '@/components/ui/card';
import { SearchFilterContent } from './search/SearchFilterContent'; // Import the new component

interface SearchFiltersProps {
  readonly onSearch?: () => void;
  readonly loading?: boolean;
}

export function SearchFilters({ onSearch, loading }: SearchFiltersProps) {
  return (
    <Card className="dark:bg-slate-800 dark:border-slate-700">
      <CardContent className="p-2">
        <SearchFilterContent onSearch={onSearch} loading={loading} />
      </CardContent>
    </Card>
  );
}
