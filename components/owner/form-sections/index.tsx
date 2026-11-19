import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CUISINE_TYPES, OperatingHours } from '@/lib/foodTruckTypes';
import type { ReactNode } from 'react';
import { useState } from 'react';
import LocationPickerMap from '@/components/owner/LocationPickerMap';
import { MapPin } from 'lucide-react';

const sanitizeError = (error: string): string => {
  const errorMap: Record<string, string> = {
    duplicate_key: 'This entry already exists.',
    foreign_key_violation: 'Related data not found.',
    check_violation: 'Invalid data provided.',
    not_null_violation: 'Required field is missing.',
    unique_violation: 'This entry already exists.',
    permission_denied: 'You do not have permission to perform this action.',
    unauthorized: 'Please sign in to continue.',
    network_error: 'Unable to connect. Please check your connection.',
    invalid_credentials: 'Invalid email or password.',
    session_expired: 'Your session has expired. Please sign in again.',
  };
  for (const [key, message] of Object.entries(errorMap)) {
    if (error.toLowerCase().includes(key.toLowerCase())) {
      return message;
    }
  }
  return 'An error occurred. Please try again.';
};

// Unified FormData interface that supports both flat and nested structures
export interface UnifiedFormData {
  // Basic information
  name: string;
  description: string;

  // Contact information (can be flat or nested)
  phone?: string;
  email?: string;
  website?: string;
  contact_info?: {
    phone?: string;
    email?: string;
    website?: string;
  };

  // Social media (can be flat or nested)
  facebook?: string;
  instagram?: string;
  twitter?: string;
  photo_url?: string;
  social_media?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    photo_url?: string;
  };

  // Location (can be flat or nested)
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  lat?: number;
  lng?: number;
  current_location?: {
    lat?: number;
    lng?: number;
    address?: string;
    timestamp?: string;
  };

  // Operating data
  cuisineTypes?: string[];
  cuisine_type?: string[];
  operatingHours?: OperatingHours;
  operating_hours?: OperatingHours;

  // Metadata
  id?: string;
}

// Helper functions to access data in a unified way
export const getContactInfo = (data: UnifiedFormData) => {
  return (
    data.contact_info ?? {
      phone: data.phone ?? '',
      email: data.email ?? '',
      website: data.website ?? '',
    }
  );
};

export const getSocialMedia = (data: UnifiedFormData) => {
  const socialMediaData = data.social_media ?? {
    facebook: data.facebook ?? '',
    instagram: data.instagram ?? '',
    twitter: data.twitter ?? '',
    photo_url: '',
  };

  // Handle photo_url from either nested or flat structure
  socialMediaData.photo_url ??= data.photo_url ?? '';

  return socialMediaData;
};

export const getLocation = (data: UnifiedFormData) => {
  if (data.current_location) {
    return data.current_location;
  }
  return {
    address: data.address ?? '',
    lat: data.lat ?? undefined,
    lng: data.lng ?? undefined,
  };
};

export const getCuisineTypes = (data: UnifiedFormData): string[] => {
  return data.cuisineTypes ?? data.cuisine_type ?? [];
};

export const getOperatingHours = (data: UnifiedFormData): OperatingHours => {
  return data.operatingHours ?? data.operating_hours ?? ({} as OperatingHours);
};

// Helper functions to update data in a unified way
export const updateContactInfo = (
  data: UnifiedFormData,
  updates: { phone?: string; email?: string; website?: string },
): UnifiedFormData => {
  if (data.contact_info) {
    return {
      ...data,
      contact_info: { ...data.contact_info, ...updates },
    };
  }
  return {
    ...data,
    ...updates,
  };
};

export const updateSocialMedia = (
  data: UnifiedFormData,
  updates: { facebook?: string; instagram?: string; twitter?: string; photo_url?: string },
): UnifiedFormData => {
  if (data.social_media) {
    return {
      ...data,
      social_media: { ...data.social_media, ...updates },
    };
  }
  return {
    ...data,
    ...updates,
  };
};

export const updateLocation = (
  data: UnifiedFormData,
  updates: { address?: string; lat?: number; lng?: number },
): UnifiedFormData => {
  if (data.current_location) {
    return {
      ...data,
      current_location: { ...data.current_location, ...updates },
    };
  }
  return {
    ...data,
    ...updates,
  };
};

export const updateCuisineTypes = (
  data: UnifiedFormData,
  cuisineTypes: string[],
): UnifiedFormData => {
  return {
    ...data,
    cuisineTypes,
    cuisine_type: cuisineTypes,
  };
};

export const updateOperatingHours = (
  data: UnifiedFormData,
  operatingHours: OperatingHours,
): UnifiedFormData => {
  return {
    ...data,
    operatingHours,
    operating_hours: operatingHours,
  };
};

// Shared types
type DayKey = keyof OperatingHours;
type HoursField = 'open' | 'close' | 'closed';

interface CommonProps {
  readonly formData: UnifiedFormData;
  readonly onChange: (updates: Partial<UnifiedFormData>) => void;
}

interface TruckFormLayoutProps {
  readonly title: string;
  readonly description: string;
  readonly children: ReactNode;
  readonly submitActions?: ReactNode;
  readonly error?: string | null;
  readonly success?: boolean;
}

export function TruckFormLayout({
  title,
  description,
  children,
  submitActions,
  error,
  success,
}: TruckFormLayoutProps) {
  return (
    <div className="container mx-auto py-4 sm:py-8">
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">{title}</CardTitle>
          <CardDescription className="text-sm">{description}</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <form className="space-y-6">
            {children}
            {error && (
              <div
                role="alert"
                aria-live="assertive"
                aria-atomic="true"
                className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm"
              >
                {sanitizeError(error)}
              </div>
            )}
            {success && (
              <div
                aria-live="polite"
                aria-atomic="true"
                className="mb-4 p-3 bg-green-100 text-green-700 rounded-md font-medium text-sm"
              >
                ✓ Food truck updated successfully!
              </div>
            )}
            {submitActions}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

interface SubmitActionsProps {
  readonly loading: boolean;
  readonly onCancel: () => void;
  readonly submitText?: string;
  readonly cancelText?: string;
}

export function SubmitActions({
  loading,
  onCancel,
  submitText = 'Save Changes',
  cancelText = 'Cancel',
}: SubmitActionsProps) {
  return (
    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-4">
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        disabled={loading}
        className="min-h-[44px] w-full sm:w-auto"
      >
        {cancelText}
      </Button>
      <Button type="submit" disabled={loading} className="min-h-[44px] w-full sm:w-auto">
        {loading ? 'Saving...' : submitText}
      </Button>
    </div>
  );
}

interface TruckFormProps {
  readonly formData: UnifiedFormData;
  readonly setFormData: (data: UnifiedFormData) => void;
  readonly onCuisineChange: (cuisine: string, checked: boolean) => void;
  readonly onHoursChange: (day: DayKey, field: HoursField, value: string | boolean) => void;
  readonly children?: ReactNode;
}

export function TruckForm({
  formData,
  setFormData,
  onCuisineChange,
  onHoursChange,
  children,
}: TruckFormProps) {
  return (
    <>
      <BasicInformationSection
        formData={formData}
        onChange={(updates) => setFormData({ ...formData, ...updates })}
      />
      <ContactInformationSection
        formData={formData}
        onChange={(updates) => setFormData({ ...formData, ...updates })}
      />
      <SocialMediaSection
        formData={formData}
        onChange={(updates) => setFormData({ ...formData, ...updates })}
      />
      <LocationSection
        formData={formData}
        onChange={(updates) => setFormData({ ...formData, ...updates })}
      />
      <CuisineTypesSection formData={formData} onCuisineChange={onCuisineChange} />
      <OperatingHoursSection formData={formData} onHoursChange={onHoursChange} />
      {children}
    </>
  );
}

export function BasicInformationSection({ formData, onChange }: CommonProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Basic Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Truck Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => onChange({ name: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => onChange({ description: e.target.value })}
            rows={3}
          />
        </div>
      </div>
    </div>
  );
}

export function ContactInformationSection({ formData, onChange }: CommonProps) {
  const contactInfo = getContactInfo(formData);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Contact Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            value={contactInfo.phone ?? ''}
            onChange={(e) => onChange(updateContactInfo(formData, { phone: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={contactInfo.email ?? ''}
            onChange={(e) => onChange(updateContactInfo(formData, { email: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            type="url"
            value={contactInfo.website ?? ''}
            onChange={(e) => onChange(updateContactInfo(formData, { website: e.target.value }))}
          />
        </div>
      </div>
    </div>
  );
}

export function SocialMediaSection({ formData, onChange }: CommonProps) {
  const socialMedia = getSocialMedia(formData);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Social Media</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="facebook">Facebook</Label>
          <Input
            id="facebook"
            value={socialMedia.facebook ?? ''}
            onChange={(e) => onChange(updateSocialMedia(formData, { facebook: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="instagram">Instagram</Label>
          <Input
            id="instagram"
            value={socialMedia.instagram ?? ''}
            onChange={(e) => onChange(updateSocialMedia(formData, { instagram: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="twitter">Twitter</Label>
          <Input
            id="twitter"
            value={socialMedia.twitter ?? ''}
            onChange={(e) => onChange(updateSocialMedia(formData, { twitter: e.target.value }))}
          />
        </div>
      </div>
    </div>
  );
}

export function LocationSection({ formData, onChange }: CommonProps) {
  const location = getLocation(formData);
  const [showMapPicker, setShowMapPicker] = useState(false);

  const handleLocationChange = (lat: number, lng: number) => {
    onChange({ lat, lng });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h3 className="text-lg font-medium">Location</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowMapPicker(!showMapPicker)}
          aria-expanded={showMapPicker}
          aria-controls="location-map-picker"
          className="gap-2 bg-blue-500 hover:bg-blue-600 text-white border-blue-600 min-h-[44px] sm:min-h-0 w-full sm:w-auto"
        >
          <MapPin className="h-4 w-4" />
          {showMapPicker ? 'Hide Map' : 'Fine-Tune Location'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            value={location.address ?? ''}
            onChange={(e) => {
              const updated = updateLocation(formData, { address: e.target.value });
              onChange({ ...updated, lat: undefined, lng: undefined });
            }}
            placeholder="123 Main St"
          />
        </div>
        <div>
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={formData.city ?? ''}
            onChange={(e) => onChange({ city: e.target.value, lat: undefined, lng: undefined })}
            placeholder="Augusta"
          />
        </div>
        <div>
          <Label htmlFor="state">State</Label>
          <Input
            id="state"
            value={formData.state ?? ''}
            onChange={(e) => onChange({ state: e.target.value, lat: undefined, lng: undefined })}
            placeholder="GA"
            maxLength={2}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="zip">ZIP Code</Label>
          <Input
            id="zip"
            value={formData.zip ?? ''}
            onChange={(e) => onChange({ zip: e.target.value, lat: undefined, lng: undefined })}
            placeholder="30901"
          />
        </div>
      </div>

      {showMapPicker && (
        <div id="location-map-picker" className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Click anywhere on the map to set the exact location for your truck. The address above
            will be geocoded automatically when you save.
          </p>
          <LocationPickerMap
            latitude={formData.lat}
            longitude={formData.lng}
            onLocationChange={handleLocationChange}
          />
          {formData.lat && formData.lng && (
            <p className="text-xs text-muted-foreground">
              Coordinates: {formData.lat.toFixed(6)}, {formData.lng.toFixed(6)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

interface CuisineTypesSectionProps {
  readonly formData: UnifiedFormData;
  readonly onCuisineChange: (cuisine: string, checked: boolean) => void;
}

export function CuisineTypesSection({ formData, onCuisineChange }: CuisineTypesSectionProps) {
  const cuisineTypes = getCuisineTypes(formData);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Cuisine Types</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {CUISINE_TYPES.map((cuisine) => (
          <label
            key={cuisine}
            htmlFor={`cuisine-${cuisine}`}
            className="flex items-center space-x-2 min-h-[44px] cursor-pointer"
          >
            <Checkbox
              id={`cuisine-${cuisine}`}
              checked={cuisineTypes.includes(cuisine)}
              onCheckedChange={(checked) => onCuisineChange(cuisine, checked === true)}
            />
            <span className="cursor-pointer">{cuisine}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

interface OperatingHoursSectionProps {
  readonly formData: UnifiedFormData;
  readonly onHoursChange: (day: DayKey, field: HoursField, value: string | boolean) => void;
}

export function OperatingHoursSection({ formData, onHoursChange }: OperatingHoursSectionProps) {
  const operatingHours = getOperatingHours(formData);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Operating Hours</h3>
      <div className="space-y-1.5">
        {(
          ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as DayKey[]
        ).map((day) => {
          const hours = operatingHours[day] ?? { open: '09:00', close: '17:00', closed: false };
          const dayLabel = day.toString().charAt(0).toUpperCase() + day.toString().slice(1);
          const isClosed = hours.closed ?? false;

          return (
            <div
              key={day}
              className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-2 sm:p-0 bg-muted/30 sm:bg-transparent rounded-lg sm:rounded-none"
            >
              <div className="w-full sm:w-24">
                <Label className="font-semibold">{dayLabel}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`closed-${day}`}
                  checked={isClosed}
                  onCheckedChange={(checked) => onHoursChange(day, 'closed', checked === true)}
                />
                <Label htmlFor={`closed-${day}`}>Closed</Label>
              </div>
              <div className="flex items-center gap-2 flex-1">
                <Input
                  type="time"
                  value={hours.open ?? ''}
                  onChange={(e) => onHoursChange(day, 'open', e.target.value)}
                  disabled={isClosed}
                  className={`flex-1 ${isClosed ? 'opacity-50' : ''}`}
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  type="time"
                  value={hours.close ?? ''}
                  onChange={(e) => onHoursChange(day, 'close', e.target.value)}
                  disabled={isClosed}
                  className={`flex-1 ${isClosed ? 'opacity-50' : ''}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
