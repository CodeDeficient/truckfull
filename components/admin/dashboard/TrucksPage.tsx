import React, { useEffect, useState } from 'react';
import TruckCardPrimitive from '@/components/primitives/TruckCardPrimitive';
import type { FoodTruck } from '@/lib/types'; // Import from actual types file
import { tempTrucks } from './tempTruckData';

/**
 * Loads and displays a list of trucks on the dashboard.
 * @example
 * TrucksPage()
 * Returns a container with truck cards or a loading message.
 * @returns {JSX.Element} A container with truck cards or a loading message.
 * @description
 *   - Uses temporary truck data, which should be replaced with real truck loading logic.
 *   - Employs useState to manage the array of trucks.
 *   - Displays 'Loading trucks...' message when truck data is unavailable.
 */
const AdminTrucksPage = () => {
  const [trucks, setTrucks] = useState<FoodTruck[]>([]);

  useEffect(() => {
    // Placeholder: Integrate actual truck loading logic here
    setTrucks(tempTrucks);
  }, []);

  return (
    <div className="trucks-container">
      {trucks.length > 0 ? (
        trucks.map((truck) => (
          <TruckCardPrimitive
            key={truck.id}
            title={truck.name}
            price={truck.price_range ?? ''}
            reviews={truck.review_count ?? 0}
            image_url={'/placeholder-logo.png'}
            rating={truck.average_rating ?? 0}
          />
        ))
      ) : (
        <p>Loading trucks...</p>
      )}
    </div>
  );
};

export default AdminTrucksPage;
