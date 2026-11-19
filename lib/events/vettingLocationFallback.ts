import { CITIES } from '@/lib/events/cities';

interface CityCenter {
  lat: number;
  lng: number;
  city: string;
  state: string;
}

export function getCityCenter(city: string, state: string): CityCenter | null {
  for (const config of Object.values(CITIES)) {
    if (
      config.city.toLowerCase() === city.toLowerCase() &&
      config.state.toLowerCase() === state.toLowerCase() &&
      config.latitude != null &&
      config.longitude != null
    ) {
      return {
        lat: config.latitude,
        lng: config.longitude,
        city: config.city,
        state: config.state,
      };
    }
  }
  return null;
}

export function shouldUseCityFallback(event: {
  title: string;
  description?: string | null;
  vetting_score?: number | null;
}): boolean {
  if (!event.title || event.title.trim().length < 10) return false;

  if ((event.vetting_score ?? 0) < 3) return false;

  return !!(event.description && event.description.trim().length > 20);
}
