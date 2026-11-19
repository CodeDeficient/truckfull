import { getSupabaseAdmin } from '../admin';
import type { FoodTruck } from '../types/index';
import { handleSupabaseError } from '../utils/index';

export function isValidTruckName(name: unknown): boolean {
  return typeof name === 'string' && name.trim() !== '';
}

export function isValidLocation(loc: FoodTruck['current_location']): boolean {
  return !!(
    loc &&
    typeof loc.lat === 'number' &&
    !Number.isNaN(loc.lat) &&
    typeof loc.lng === 'number' &&
    !Number.isNaN(loc.lng)
  );
}

export function hasContactInfo(contactInfo: FoodTruck['contact_info']): boolean {
  return (
    (typeof contactInfo?.phone === 'string' && contactInfo.phone.trim() !== '') ||
    (typeof contactInfo?.email === 'string' && contactInfo.email.trim() !== '') ||
    (typeof contactInfo?.website === 'string' && contactInfo.website.trim() !== '')
  );
}

export function isValidMenu(menu: FoodTruck['menu']): boolean {
  return Array.isArray(menu) && menu.length > 0;
}

export function hasOperatingHours(operatingHours: FoodTruck['operating_hours']): boolean {
  return operatingHours != undefined;
}

export function calculateBaseScore(truck: FoodTruck): number {
  let score = 0;
  if (isValidTruckName(truck.name)) score += 20;
  if (isValidLocation(truck.current_location)) score += 30;
  if (hasContactInfo(truck.contact_info)) score += 25;
  if (isValidMenu(truck.menu)) score += 15;
  if (hasOperatingHours(truck.operating_hours)) score += 10;
  return score;
}

export const DataQualityService = {
  calculateQualityScore: (truck: FoodTruck) => {
    return { score: Math.min(100, calculateBaseScore(truck)) };
  },

  async updateTruckQualityScore(
    truckId: string,
  ): Promise<{ id: string; data_quality_score: number | null } | { error: string }> {
    const admin = getSupabaseAdmin();
    const { data, error: fetchError } = await admin
      .from('food_trucks')
      .select('name, current_location, contact_info, menu, operating_hours')
      .eq('id', truckId)
      .single();

    if (fetchError) {
      handleSupabaseError(fetchError, 'updateTruckQualityScore:fetch');
      return { error: `Failed to fetch truck with ID ${truckId}.` };
    }
    if (data == undefined) {
      return { error: `Truck with ID ${truckId} not found.` };
    }
    const truck = data as unknown as FoodTruck;

    const { score } = this.calculateQualityScore(truck);

    const { data: updated, error } = await getSupabaseAdmin()
      .from('food_trucks')
      .update({ data_quality_score: score })
      .eq('id', truckId)
      .select('id, data_quality_score')
      .single();

    if (error) {
      handleSupabaseError(error, 'updateTruckQualityScore:update');
      return { error: `Failed to update quality score for truck with ID ${truckId}.` };
    }
    return updated;
  },
};
