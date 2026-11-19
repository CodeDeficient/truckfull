import { useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/database.remote.types';
import type { Json } from '@/lib/database.remote.types';
import type { OperatingHours } from '@/lib/foodTruckTypes';

/**
 * Best-effort metadata truck-count invalidation after registration.
 * Fire-and-forget: registration already succeeded, so failures are swallowed
 * and the 180-day TTL ceiling covers any missed invalidation.
 */
function invalidateTruckCountBestEffort(truckId: string): void {
  fetch('/api/owner/invalidate-truck-count', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ truckId }),
  }).catch(() => {
    /* best-effort: registration already succeeded */
  });
}

export type DayKey = keyof OperatingHours;
export type HoursField = 'open' | 'close' | 'closed';

export interface FormData {
  readonly name: string;
  readonly description: string;
  readonly phone: string;
  readonly email: string;
  readonly website: string;
  readonly facebook: string;
  readonly instagram: string;
  readonly twitter: string;
  readonly address: string;
  readonly city: string;
  readonly state: string;
  readonly zip: string;
  readonly lat: number | undefined;
  readonly lng: number | undefined;
  readonly cuisineTypes: string[];
  readonly operatingHours: OperatingHours;
  readonly facebookPageId: string;
  readonly facebookPageName: string;
}

function calculateDataQualityScore(data: FormData): number {
  let score = 0;
  const totalFields = 12;
  if (data.name.length > 0) score++;
  if (data.description.length > 0) score++;
  if (data.phone.length > 0 || data.email.length > 0) score++;
  if (data.website.length > 0) score++;
  if (data.address.length > 0 && data.city.length > 0 && data.state.length > 0) score++;
  if (data.lat != undefined && data.lng != undefined) score++;
  if (data.cuisineTypes.length > 0) score++;
  if (
    (
      ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as DayKey[]
    ).some((day) => data.operatingHours[day]?.closed === false)
  )
    score++;
  if (data.facebook.length > 0 || data.instagram.length > 0 || data.twitter.length > 0) score++;
  return score / totalFields;
}

export function useTruckRegistrationForm(userId: string | undefined) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    phone: '',
    email: '',
    website: '',
    facebook: '',
    instagram: '',
    twitter: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    lat: undefined,
    lng: undefined,
    cuisineTypes: [],
    operatingHours: {
      monday: { open: '09:00', close: '17:00', closed: false },
      tuesday: { open: '09:00', close: '17:00', closed: false },
      wednesday: { open: '09:00', close: '17:00', closed: false },
      thursday: { open: '09:00', close: '17:00', closed: false },
      friday: { open: '09:00', close: '17:00', closed: false },
      saturday: { open: '09:00', close: '17:00', closed: false },
      sunday: { open: '09:00', close: '17:00', closed: false },
    },
    facebookPageId: '',
    facebookPageName: '',
  });

  const handleCuisineChange = (cuisine: string, checked: boolean): void => {
    setFormData((prev) => ({
      ...prev,
      cuisineTypes: checked
        ? [...prev.cuisineTypes, cuisine]
        : prev.cuisineTypes.filter((c) => c !== cuisine),
    }));
  };

  const handleHoursChange = (day: DayKey, field: HoursField, value: string | boolean): void => {
    setFormData((prev) => ({
      ...prev,
      operatingHours: {
        ...prev.operatingHours,
        [day]: {
          ...(prev.operatingHours[day] ?? { open: '09:00', close: '17:00', closed: false }),
          [field]: value as never,
        },
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: Database['public']['Tables']['food_trucks']['Insert'] = {
        name: formData.name,
        description: formData.description.length > 0 ? formData.description : undefined,
        cuisine_type: formData.cuisineTypes,
        contact_info: {
          phone: formData.phone,
          email: formData.email,
          website: formData.website,
        } as unknown as Json,
        social_media: {
          facebook: formData.facebook,
          instagram: formData.instagram,
          twitter: formData.twitter,
        } as unknown as Json,
        current_location: {
          address: `${formData.address}, ${formData.city}, ${formData.state} ${formData.zip}`,
          lat: formData.lat,
          lng: formData.lng,
        } as unknown as Json,
        operating_hours: formData.operatingHours as unknown as Json,
        owner_id: userId,
        verification_status: 'pending',
        data_quality_score: calculateDataQualityScore(formData),
        ...(formData.facebookPageId.length > 0 && {
          facebook_page_id: formData.facebookPageId,
        }),
        ...(formData.facebookPageName.length > 0 && {
          facebook_page_name: formData.facebookPageName,
        }),
      };
      const { data: inserted, error } = await getSupabase()
        .from('food_trucks')
        .insert([payload])
        .select('id')
        .single();
      if (error) throw error;

      // Best-effort metadata truck-count invalidation. The insert created a
      // newly-counted active truck (is_active defaults true). Registration has
      // already succeeded; an invalidation failure is swallowed so the user
      // never redoes registration, and the 180-day TTL ceiling covers misses.
      const truckId = inserted?.id;
      if (typeof truckId === 'string' && truckId.length > 0) {
        invalidateTruckCountBestEffort(truckId);
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    formData,
    setFormData,
    handleSubmit,
    handleCuisineChange,
    handleHoursChange,
  } as const;
}
