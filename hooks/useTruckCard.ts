import type { FoodTruck, PublicFoodTruck } from '@/lib/types';
import { getPopularItems, getPriceRange, getTodayHours } from '@/lib/utils/foodTruckHelpers';
import { convertToDomain } from '@/lib/utils/foodTruckUtils';

export const useTruckCard = (truck: FoodTruck | PublicFoodTruck) => {
  // Convert to FoodTruckDomain type for helper functions
  const truckDomain = convertToDomain(truck);

  const popularItems = getPopularItems(truckDomain);
  const priceRange = getPriceRange(truckDomain);
  const todayHours = getTodayHours(truckDomain);

  return {
    popularItems,
    priceRange,
    todayHours,
  };
};
