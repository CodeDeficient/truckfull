export interface SearchFilters {
  query: string;
  cuisine: string;
  openNow: boolean;
  radius: number;
  priceRange?: number;
}
