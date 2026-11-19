export interface FeaturedEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  participants: number;
  status: 'upcoming' | 'active' | 'past';
}

export interface FeaturedOffer {
  id: string;
  title: string;
  description: string;
  validUntil: string;
  badgeText: string;
  badgeColor: string;
}

const FEATURED_EVENTS: readonly FeaturedEvent[] = [
  {
    id: '1',
    title: 'Food Truck Festival',
    description: 'Annual celebration of mobile cuisine',
    date: 'June 15-16, Downtown Park',
    location: 'Downtown Park',
    participants: 25,
    status: 'upcoming',
  },
  {
    id: '2',
    title: 'Summer Night Market',
    description: 'Evening food market with special trucks',
    date: 'July 20, Riverside Plaza',
    location: 'Riverside Plaza',
    participants: 18,
    status: 'upcoming',
  },
];

const FEATURED_OFFERS: readonly FeaturedOffer[] = [
  {
    id: '1',
    title: 'Happy Hour Discount',
    description: '20% off all orders from 2-5pm',
    validUntil: 'Dec 31, 2024',
    badgeText: 'ACTIVE',
    badgeColor: 'bg-blue-500',
  },
  {
    id: '2',
    title: 'First Order Free Delivery',
    description: 'Free delivery on your first order',
    validUntil: 'Jan 15, 2025',
    badgeText: 'NEW',
    badgeColor: 'bg-green-500',
  },
];

export function getFeaturedEvents(limit: number): FeaturedEvent[] {
  return FEATURED_EVENTS.slice(0, limit);
}

export function getFeaturedOffers(limit: number): FeaturedOffer[] {
  return FEATURED_OFFERS.slice(0, limit);
}
