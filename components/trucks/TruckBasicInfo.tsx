import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { FoodTruck } from '@/lib/supabase';

interface TruckBasicInfoProps {
  readonly truck: FoodTruck;
}

/**
 * Renders basic information about a food truck within a styled card component.
 * @example
 * TruckBasicInfo({ truck: { name: "Tasty Truck", description: "Best burgers in town", cuisine_type: "American", price_range: "$$$" } })
 * // Will return a React component displaying the food truck's name, description, cuisine type, and price range in a formatted card layout.
 * @param {object} truck - An object containing food truck information, including name, description, cuisine type, and price range.
 * @returns {JSX.Element} A styled React component displaying the provided food truck information.
 * @description
 *   - Applies styling for both light and dark mode themes.
 *   - Only displays fields if corresponding values are provided within the truck object.
 */
export function TruckBasicInfo({ truck }: Readonly<TruckBasicInfoProps>) {
  return (
    <Card className="dark:bg-slate-800 dark:border-slate-700">
      <CardHeader>
        <CardTitle className="dark:text-gray-100">About</CardTitle>
        <CardDescription className="dark:text-gray-400">Food truck information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</span>
          <p className="text-lg font-semibold dark:text-gray-100">{truck.name}</p>
        </div>

        {truck.description != undefined && (
          <div>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Description
            </span>
            <p className="text-gray-900 dark:text-gray-200">{truck.description}</p>
          </div>
        )}

        {Array.isArray(truck.cuisine_type) && truck.cuisine_type.length > 0 && (
          <div>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Cuisine Type
            </span>
            <p className="text-gray-900 dark:text-gray-200">{truck.cuisine_type.join(', ')}</p>
          </div>
        )}

        {/* Price range removed - not useful in current state */}
      </CardContent>
    </Card>
  );
}
