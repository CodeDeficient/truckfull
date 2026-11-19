/**
 * Keyword and FAQ generators for event landing pages.
 */

import type { EventPageData } from '@/lib/events/eventPageData';
import type { NearbyCity } from '@/lib/events/nearbyCities';
import { getCurrentMonthYear } from '@/lib/seo/keywords';
import type { FaqItem } from '@/lib/seo/keywords';

function dedupe(arr: string[]): string[] {
  return [...new Set(arr.filter(Boolean))];
}

/** Event-specific keywords for the event detail page meta keywords tag. */
export function generateEventKeywords(
  event: EventPageData,
  nearbyCities: readonly NearbyCity[] = [],
): string[] {
  const city = event.city;
  const state = event.state;
  const monthYear = event.eventStartDate
    ? new Date(`${event.eventStartDate}T12:00:00Z`).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      })
    : getCurrentMonthYear();

  const titleLower = event.title.toLowerCase();
  const hasFestival = titleLower.includes('festival') || titleLower.includes('fest');
  const hasMarket = titleLower.includes('market') || titleLower.includes('bazaar');

  const base = [
    `${event.title} ${city}`,
    `${event.title} ${city} ${state}`,
    `food truck events ${city} ${state}`,
    `food truck events ${monthYear}`,
    `food truck festival ${city} ${state}`,
    `${city} food truck events ${monthYear}`,
    `${city} events ${monthYear}`,
    `things to do ${city} ${state} ${monthYear}`,
  ];

  if (hasFestival) base.push(`food truck festival ${city} ${monthYear}`);
  if (hasMarket) base.push(`food truck market ${city} ${state}`);

  for (const nearbyCity of nearbyCities.slice(0, 10)) {
    base.push(`${nearbyCity.city}, ${nearbyCity.state} food truck events`);
  }

  return dedupe(base);
}

/** City-hub-level event keywords (broader than per-event). */
export function buildEventKeywords(city: string, state: string, eventCount: number): string[] {
  const monthYear = getCurrentMonthYear();
  return dedupe([
    `food truck events ${city} ${state}`,
    `${city} food truck festivals`,
    `${city} events ${monthYear}`,
    `food truck festival ${city}`,
    `things to do in ${city} ${state}`,
    `${eventCount} food truck events ${city}`,
    `food truck vendors ${city} ${state}`,
  ]);
}

/** FAQ Q&As about food truck events in a city (for city hub pages). */
export function generateCityEventFaq(
  city: string,
  state: string,
  eventCount: number,
  topEventTypes: string[],
): FaqItem[] {
  const types = topEventTypes.length > 0 ? topEventTypes.slice(0, 3) : ['festivals', 'markets'];
  const typesList = types.join(', ');

  return [
    {
      question: `What food truck events are happening in ${city}, ${state}?`,
      answer: `TruckFull is tracking ${eventCount} upcoming food truck events in ${city}, ${state}, including ${typesList}. Browse the list above for dates, locations, and participating food trucks.`,
    },
    {
      question: `How do I find food trucks at events in ${city}?`,
      answer: `Each ${city} event page on TruckFull lists confirmed food trucks as the event date approaches. Check the event detail page for vendor lists, or visit the original listing for the latest updates.`,
    },
    {
      question: `Are food truck events in ${city} free to attend?`,
      answer: `Many food truck events in ${city} are free to attend — you pay only for what you buy from the trucks. Some festivals and ticketed events charge admission; check the event listing for details.`,
    },
    {
      question: `How do I book a food truck for my event in ${city}?`,
      answer: `Browse food trucks in ${city} on TruckFull and contact them directly for catering and event bookings. Many trucks offer corporate catering, private parties, and community event service.`,
    },
    {
      question: `How often is the ${city} events list updated?`,
      answer: `TruckFull refreshes the ${city} events list regularly from official city calendars, Eventbrite, and tourism sources. New events appear as they are discovered and vetted.`,
    },
  ];
}

/** Event-specific FAQ for an event detail page. */
export function generateEventFaq(event: EventPageData): FaqItem[] {
  const date = event.eventStartDate
    ? new Date(`${event.eventStartDate}T12:00:00Z`).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      })
    : 'the scheduled date';

  return [
    {
      question: `When and where is ${event.title}?`,
      answer: `${event.title} takes place on ${date} in ${event.city}, ${event.state}${
        event.locationAddress ? ` at ${event.locationAddress}.` : '.'
      } See the event details above for the full address and directions.`,
    },
    {
      question: `Will there be food trucks at ${event.title}?`,
      answer: `${event.title} is tracked by TruckFull as a food-truck-relevant event. Food trucks are confirmed when the organizer publishes a vendor list — check back closer to the event date for the latest.`,
    },
    {
      question: `Is ${event.title} free to attend?`,
      answer: `Many food truck events are free to attend, with attendees paying only for food purchases. Check the original event listing for admission details and any ticket requirements.`,
    },
    {
      question: `How do I get to ${event.title}?`,
      answer: `Use the "Get Directions" button above to open Google Maps with the event's coordinates. Parking and transit information may be available on the original event listing.`,
    },
    {
      question: `I'm a food truck owner — can I vend at ${event.title}?`,
      answer: `Food truck vending opportunities at ${event.title} depend on the event organizer. Join TruckFull to unlock event research, traffic estimates, and historical occurrence data to assess this and other ${event.city} events.`,
    },
  ];
}
