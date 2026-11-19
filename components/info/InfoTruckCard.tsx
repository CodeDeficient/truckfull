import React from 'react';
import { type FoodTruck as DatabaseFoodTruck } from '@/lib/types';
import { BaseInfoTruckCard, type InfoTruckCardFoodTruck } from './BaseInfoTruckCard';

/**
 * Renders a food truck information card including its schedule and upcoming events.
 *
 * @example
 * InfoTruckCard({ truck: sampleTruck })
 * Renders a card component displaying the name, cuisine type, description, schedule, and events of the food truck.
 *
 * @param {Object} props - Component props
 * @param {InfoTruckCardFoodTruck | DatabaseFoodTruck} props.truck - Food truck object containing details to be displayed on the card.
 *
 * @returns {JSX.Element} A JSX element representing a styled card with food truck information.
 *
 * @description
 *   - The function uses conditional rendering to display active days in bold and with the primary color.
 *   - It includes a section to list up to three upcoming events, if available, with each event's title, date, and optional location address.
 */
const InfoTruckCard: React.FC<{ truck: InfoTruckCardFoodTruck | DatabaseFoodTruck }> = ({
  truck,
}) => {
  return <BaseInfoTruckCard truck={truck} />;
};

export default InfoTruckCard;
