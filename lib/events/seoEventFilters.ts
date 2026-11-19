import { horizonDate, todayDate } from '@/lib/events/eventHorizon';

export interface UpcomingEventFilters {
  readonly today: string;
  readonly horizon: string;
  readonly isFoodTruckRelevant: true;
  readonly isHidden: false;
  readonly minimumVettingScore: 30;
}

export function getUpcomingEventFilters(today: Date = new Date()): UpcomingEventFilters {
  return {
    today: todayDate(today),
    horizon: horizonDate(today),
    isFoodTruckRelevant: true,
    isHidden: false,
    minimumVettingScore: 30,
  };
}
