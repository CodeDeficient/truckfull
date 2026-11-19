import { getCachedPublicTruckCatalog } from '@/lib/services/publicTruckData.server';
import { logError } from '@/lib/logging';
import { pickCityTruckStrip, type CityTruckStrip } from '@/lib/events/cityTruckStrip';

const EMPTY_STRIP: CityTruckStrip = { trucks: [], totalInCity: 0 };

export async function loadCityTruckStrip(
  cityName: string,
  stateName: string,
): Promise<CityTruckStrip> {
  try {
    return pickCityTruckStrip(await getCachedPublicTruckCatalog(), cityName, stateName);
  } catch (error) {
    logError('City truck strip catalog load failed', error, { extra: { cityName, stateName } });
    return EMPTY_STRIP;
  }
}
