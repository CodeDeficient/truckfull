'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getSupabase } from '@/lib/supabase/client';
import { fromProfileRow } from '@/lib/mappers/domain';
import { DashboardHeader } from '../../_components/dashboard/header';
import { DashboardSidebar } from '../../_components/dashboard/sidebar';
import type { FoodTruck } from '@/lib/supabase/types';
import type { OperatingHours } from '@/lib/foodTruckTypes';
import type { UserProfileDomain } from '@/lib/types';
import type { Database } from '@/lib/database.remote.types';
import { FormData, TruckForm, TruckFormLayout } from '@/components/owner/TruckFormSections';
import { logDebug, logError, logWarning } from '@/lib/logging';

// Define helper types for strong typing of hours manipulation
type DayKey = keyof import('@/lib/foodTruckTypes').OperatingHours;
type HoursField = 'open' | 'close' | 'closed';

// Default operating hours for new trucks or when data is missing
const DEFAULT_OPERATING_HOURS = {
  monday: { open: '09:00', close: '17:00', closed: false },
  tuesday: { open: '09:00', close: '17:00', closed: false },
  wednesday: { open: '09:00', close: '17:00', closed: false },
  thursday: { open: '09:00', close: '17:00', closed: false },
  friday: { open: '09:00', close: '17:00', closed: false },
  saturday: { open: '09:00', close: '17:00', closed: false },
  sunday: { open: '09:00', close: '17:00', closed: false },
} as const;

// Component props interface
interface EditTruckClientProps {
  readonly truck: FoodTruck;
}

// Function to extract and initialize form data from truck data
function initializeFormDataFromTruck(truck: FoodTruck): FormData {
  // IMPORTANT: Prefer dedicated address fields over current_location.address
  // This ensures we don't lose the permanent address when GPS is active

  // Try dedicated fields first
  let streetAddress = truck.street_address ?? '';
  let city = truck.city ?? '';
  let state = truck.state ?? '';
  let zip = truck.zip ?? '';
  let lat = truck.default_lat ?? undefined;
  let lng = truck.default_lng ?? undefined;

  // Only fall back to parsing current_location.address if dedicated fields are empty
  if (!streetAddress && !city && !state) {
    const location =
      typeof truck.current_location === 'object' && truck.current_location !== null
        ? (truck.current_location as { address?: string; lat?: number; lng?: number })
        : { address: '', lat: undefined, lng: undefined };

    if (location.address) {
      // Parse address to extract street, city, state, zip
      // Expected format: "123 Main St, City Name, STATE 12345"
      const parts = location.address.split(', ');
      if (parts.length >= 3) {
        // parts[0] = street address
        // parts[1] = city
        // parts[2] = "STATE ZIP"
        streetAddress = parts[0] ?? '';
        city = parts[1] ?? '';
        const stateZip = (parts[2] ?? '').split(' ');
        state = stateZip[0] ?? '';
        zip = stateZip.slice(1).join(' ') ?? ''; // Handle multi-part zip codes
      } else if (parts.length === 2) {
        // Fallback: "Street, City STATE ZIP"
        streetAddress = parts[0] ?? '';
        const remainder = (parts[1] ?? '').split(' ');
        city = remainder.slice(0, -2).join(' ') ?? '';
        state = remainder.at(-2) ?? '';
        zip = remainder.at(-1) ?? '';
      } else {
        // Can't parse, just use full address as street
        streetAddress = location.address;
      }
    }

    // Use coordinates from current_location if dedicated fields don't have them
    if (lat === undefined || lng === undefined) {
      lat = location.lat;
      lng = location.lng;
    }
  }

  // Extract contact info
  logDebug('🔍 FORM INIT - Raw contact_info from truck:', truck.contact_info);
  const contactInfo =
    typeof truck.contact_info === 'object' && truck.contact_info !== null
      ? (truck.contact_info as { phone?: string; email?: string; website?: string })
      : { phone: '', email: '', website: '' };
  logDebug('🔍 FORM INIT - Parsed contactInfo:', contactInfo);

  // Extract social media
  const socialMedia =
    typeof truck.social_media === 'object' && truck.social_media !== null
      ? (truck.social_media as {
          facebook?: string;
          instagram?: string;
          twitter?: string;
          photo_url?: string;
        })
      : { facebook: '', instagram: '', twitter: '' };

  // Extract operating hours
  const operatingHours =
    typeof truck.operating_hours === 'object' && truck.operating_hours !== null
      ? (truck.operating_hours as OperatingHours)
      : DEFAULT_OPERATING_HOURS;

  return {
    name: truck.name ?? '',
    description: truck.description ?? '',
    phone: contactInfo.phone ?? '',
    email: contactInfo.email ?? '',
    website: contactInfo.website ?? '',
    facebook: socialMedia.facebook ?? '',
    instagram: socialMedia.instagram ?? '',
    twitter: socialMedia.twitter ?? '',
    photo_url: socialMedia.photo_url ?? '',
    address: streetAddress, // Street address only (not full address)
    city,
    state,
    zip,
    lat,
    lng,
    cuisineTypes: Array.isArray(truck.cuisine_type) ? truck.cuisine_type : [],
    operatingHours,
  };
}

function SubmitActions({
  loading,
  onCancel,
  onSave,
}: {
  readonly loading: boolean;
  readonly onCancel: () => void;
  readonly onSave: () => Promise<void>;
}) {
  const handleSaveClick = async (): Promise<void> => {
    try {
      await onSave();
    } catch (error) {
      logError('Save operation failed:', error);
    }
  };

  return (
    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-4">
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        disabled={loading}
        className="min-h-[44px] w-full sm:w-auto"
      >
        Cancel
      </Button>
      <Button
        type="button"
        onClick={() => {
          void handleSaveClick();
        }}
        disabled={loading}
        className="min-h-[44px] w-full sm:w-auto"
      >
        {loading ? 'Saving...' : 'Save Changes'}
      </Button>
    </div>
  );
}

export default function EditTruckClient({ truck }: EditTruckClientProps) {
  const router = useRouter();
  const [user, setUser] = useState<UserProfileDomain | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
    operatingHours: DEFAULT_OPERATING_HOURS,
  });

  // Load user profile (server already verified auth, we just need profile for display)
  useEffect(() => {
    async function loadUser() {
      const supabase = getSupabase();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single<Database['public']['Tables']['profiles']['Row']>();

        if (profileData) {
          setUser(fromProfileRow(profileData));
        }
      }
    }
    void loadUser();
  }, []);

  // Initialize form data from the truck data
  useEffect(() => {
    if (truck) {
      try {
        setFormData(initializeFormDataFromTruck(truck));
      } catch (error_) {
        logError('Error initializing form data:', error_);
        setError('Failed to load truck data. Please try again.');
      }
    }
  }, [truck]);

  const handleCuisineChange = (cuisine: string, checked: boolean): void => {
    setFormData((prev) => ({
      ...prev,
      cuisineTypes: checked
        ? [...(prev.cuisineTypes ?? []), cuisine]
        : (prev.cuisineTypes ?? []).filter((c) => c !== cuisine),
    }));
  };

  const handleHoursChange = (day: DayKey, field: HoursField, value: string | boolean): void => {
    setFormData((prev) => {
      const currentHours = prev.operatingHours ?? DEFAULT_OPERATING_HOURS;
      const dayHours = currentHours[day as keyof typeof currentHours] ?? {
        open: '09:00',
        close: '17:00',
        closed: false,
      };

      return {
        ...prev,
        operatingHours: {
          ...currentHours,
          [day]: {
            ...dayHours,
            [field]: value as never,
          },
        },
      };
    });
  };

  const calculateDataQualityScore = (data: FormData): number => {
    let score = 0;
    const totalFields = 12;
    if (data.name && data.name.length > 0) score++;
    if (data.description && data.description.length > 0) score++;
    if ((data.phone && data.phone.length > 0) || (data.email && data.email.length > 0)) score++;
    if (data.website && data.website.length > 0) score++;
    if (
      data.address &&
      data.address.length > 0 &&
      data.city &&
      data.city.length > 0 &&
      data.state &&
      data.state.length > 0
    )
      score++;
    if (data.lat !== undefined && data.lng !== undefined) score++;
    if (data.cuisineTypes && data.cuisineTypes.length > 0) score++;
    if (
      (
        ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as DayKey[]
      ).some((day) => data.operatingHours?.[day]?.closed === false)
    )
      score++;
    if (
      (data.facebook && data.facebook.length > 0) ||
      (data.instagram && data.instagram.length > 0) ||
      (data.twitter && data.twitter.length > 0)
    )
      score++;
    return score / totalFields;
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Extract address from individual fields
      const fullAddress = `${formData.address}, ${formData.city}, ${formData.state} ${formData.zip}`;

      // Use coordinates if available (from map picker); otherwise geocode from address
      let geocodedLat = formData.lat;
      let geocodedLng = formData.lng;

      // Geocode when coordinates are missing (address changed or never set)
      if ((!geocodedLat || !geocodedLng) && formData.address && formData.city && formData.state) {
        logDebug('🗺️ No manual coordinates found, geocoding address:', fullAddress);
        try {
          const geocodeResponse = await fetch('/api/geocode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              street: formData.address,
              city: `${formData.city}, ${formData.state} ${formData.zip}`,
            }),
          });

          if (geocodeResponse.ok) {
            const geocodeResult = (await geocodeResponse.json()) as {
              lat?: number;
              lng?: number;
              success?: boolean;
            };
            if (geocodeResult.success && geocodeResult.lat && geocodeResult.lng) {
              geocodedLat = geocodeResult.lat;
              geocodedLng = geocodeResult.lng;
              logDebug('🗺️ Geocoding successful:', { lat: geocodedLat, lng: geocodedLng });
            } else {
              logWarning('🗺️ Geocoding returned no results');
            }
          } else {
            logWarning('🗺️ Geocoding request failed');
          }
        } catch (geocodeError) {
          logWarning('🗺️ Geocoding error:', geocodeError);
        }
      } else if (geocodedLat && geocodedLng) {
        logDebug('🗺️ Using manual coordinates from map picker:', {
          lat: geocodedLat,
          lng: geocodedLng,
        });
      }

      // Prepare the payload with dedicated address fields
      const payload: Partial<FoodTruck> & {
        street_address?: string;
        city?: string;
        state?: string;
        zip?: string;
        default_lat?: number;
        default_lng?: number;
      } = {
        name: formData.name,
        description: formData.description.length > 0 ? formData.description : null,
        cuisine_type: formData.cuisineTypes, // Database uses singular 'cuisine_type'
        contact_info: {
          phone: formData.phone,
          email: formData.email,
          website: formData.website,
        },
        social_media: {
          facebook: formData.facebook,
          instagram: formData.instagram,
          twitter: formData.twitter,
          ...(formData.photo_url ? { photo_url: formData.photo_url } : {}),
        },
        // Save to dedicated address fields (permanent, never overwritten by GPS)
        street_address: formData.address,
        city: formData.city,
        state: formData.state,
        zip: formData.zip,
        default_lat: geocodedLat,
        default_lng: geocodedLng,
        // Also update current_location for backwards compatibility
        current_location: {
          address: fullAddress,
          lat: geocodedLat,
          lng: geocodedLng,
        },
        operating_hours: formData.operatingHours,
        data_quality_score: calculateDataQualityScore(formData),
      };

      logDebug('💾 Saving truck with payload:', payload);

      // Call the API to update the truck
      const response = await fetch(`/api/trucks/${truck.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      logDebug('💾 Response status:', response.status);

      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error ?? 'Failed to update truck');
      }

      const result = await response.json();
      logDebug('💾 Save successful:', result);

      setSuccess(true);
      // Don't redirect - let user see the success message and continue editing if they want
    } catch (error_) {
      logError('💾 Error saving truck:', error_);
      setError(
        error_ instanceof Error
          ? (error_.message ?? 'Failed to update truck. Please try again.')
          : 'Failed to update truck. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="flex h-screen">
      <DashboardSidebar className="hidden md:block" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader
          user={user as UserProfileDomain | undefined}
          onSignOut={() => router.push('/?auth=open')}
          backLink={{ href: '/owner-dashboard/trucks', label: 'Back to My Trucks' }}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-background">
          <div className="max-w-4xl mx-auto">
            <TruckFormLayout
              title="Edit Food Truck"
              description="Update your food truck information"
              error={error}
              success={success}
              submitActions={
                <SubmitActions loading={loading} onCancel={handleCancel} onSave={handleSave} />
              }
            >
              <TruckForm
                formData={formData}
                setFormData={(data) => setFormData(data as FormData)}
                onCuisineChange={handleCuisineChange}
                onHoursChange={handleHoursChange}
              />
            </TruckFormLayout>
          </div>
        </main>
      </div>
    </div>
  );
}
