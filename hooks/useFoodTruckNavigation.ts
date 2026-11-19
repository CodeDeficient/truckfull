import type { FoodTruck } from '@/lib/types';
import { trackTruckView } from '@/lib/utils/analytics';

/**
 * Hook for handling food truck navigation between mobile components
 */
export function useFoodTruckNavigation({
  onTruckSelect,
  onBack,
}: {
  onTruckSelect?: (truck: FoodTruck) => void;
  onBack?: () => void;
}) {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      globalThis.history.back();
    }
  };

  const handleTruckSelect = (truck: FoodTruck) => {
    // Track view in analytics
    if (truck.id) {
      trackTruckView(truck.id);
      // Also increment view count in database
      import('@/lib/supabase/services/foodTruckService.client').then(({ FoodTruckService }) => {
        FoodTruckService.incrementView(truck.id);
      });
    }

    if (onTruckSelect) {
      onTruckSelect(truck);
    }
  };

  return {
    handleBack,
    handleTruckSelect,
  };
}
