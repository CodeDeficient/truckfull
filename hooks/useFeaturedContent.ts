import { useState, useEffect } from 'react';
import { FeaturedService } from '@/lib/services/featuredService';
import type { FeaturedContent } from '@/lib/services/featuredService';
import { logError } from '@/lib/logging';
import { useFiltersStore } from '@/lib/stores/useFiltersStore';

export function useFeaturedContent() {
  const [featuredContent, setFeaturedContent] = useState<FeaturedContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get user location from filters store (shared with other components)
  const userLocation = useFiltersStore((state) => state.userLocation);
  const radiusMiles = useFiltersStore((state) => state.radiusMiles);

  useEffect(() => {
    const fetchFeaturedContent = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Pass location and radius to filter featured trucks by distance
        const content = await FeaturedService.getFeaturedContent(
          userLocation ?? undefined,
          radiusMiles ?? 30, // Default to 30 miles if not set
        );
        setFeaturedContent(content);
      } catch (error_) {
        logError('Error fetching featured content:', error_);
        setError(error_ instanceof Error ? error_.message : 'Failed to load featured content');
      } finally {
        setIsLoading(false);
      }
    };

    void fetchFeaturedContent();
  }, [userLocation, radiusMiles]); // Re-fetch when location or radius changes

  return {
    featuredContent,
    isLoading,
    error,
  };
}
