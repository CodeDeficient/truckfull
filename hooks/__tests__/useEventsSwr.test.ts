import { describe, it, expect } from '@jest/globals';

interface ApiPlatformEvent {
  id: string;
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  location_data?: {
    lat?: number;
    lng?: number;
    address?: string;
    city?: string;
    state?: string;
  };
  event_source: string;
  source_url?: string;
  vetting_score?: number | null;
  organizer?: {
    business_name?: string;
    rating_avg?: number | null;
    rating_count?: number | null;
    verification_status?: string | null;
  } | null;
  vendor_fee?: number | null;
  max_vendors?: number | null;
  applications_count?: number;
  status?: string;
}

interface ApiExternalEvent {
  id: string;
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  location_data?: {
    lat?: number;
    lng?: number;
    address?: string;
    city?: string;
    state?: string;
  };
  event_source: string;
  source_type?: string;
  source?: string;
  source_url?: string;
  vetting_score?: number | null;
  relevance_score?: number | null;
  organizer?: {
    business_name?: string;
    rating_avg?: number | null;
    rating_count?: number | null;
    verification_status?: string | null;
  } | null;
  vendor_fee?: number | null;
  max_vendors?: number | null;
  applications_count?: number;
  status?: string;
}

interface MapEvent {
  id: string;
  name: string;
  description: string;
  location_data: {
    lat: number | null;
    lng: number | null;
    address?: string;
    city?: string;
    state?: string;
  };
  start_date: string;
  end_date: string;
  status: string;
  vendor_fee: number | null;
  max_vendors: number | null;
  event_source?: 'platform' | 'external';
  source_type?: string;
  source?: string;
  vetting_score?: number | null;
  relevance_score?: number | null;
  verification_badge?: string | null;
  source_url?: string | null;
  applications_count?: number;
  organizer: {
    business_name?: string;
    rating_avg?: number | null;
    rating_count?: number | null;
    verification_status?: string | null;
  } | null;
}

function transformEvent(event: ApiPlatformEvent | ApiExternalEvent): MapEvent {
  const lat = event.location_data?.lat ?? null;
  const lng = event.location_data?.lng ?? null;
  return {
    id: event.id,
    name: event.name,
    description: event.description ?? '',
    location_data: {
      lat,
      lng,
      address: event.location_data?.address,
      city: event.location_data?.city,
      state: event.location_data?.state,
    },
    start_date: event.start_date ?? '',
    end_date: event.end_date ?? '',
    status: event.status ?? '',
    vendor_fee: event.vendor_fee ?? null,
    max_vendors: event.max_vendors ?? null,
    event_source: event.event_source as MapEvent['event_source'],
    source_type: (event as ApiExternalEvent).source_type,
    source: (event as ApiExternalEvent).source,
    vetting_score: event.vetting_score,
    relevance_score: (event as ApiExternalEvent).relevance_score,
    source_url: event.source_url ?? null,
    applications_count: event.applications_count,
    organizer: event.organizer ?? null,
  };
}

describe('transformEvent', () => {
  it('should transform platform event to MapEvent with location_data', () => {
    const platformEvent: ApiPlatformEvent = {
      id: 'event-1',
      name: 'Food Truck Festival',
      description: 'Annual food truck event',
      start_date: '2026-04-15',
      end_date: '2026-04-17',
      location_data: {
        lat: 32.0809,
        lng: -81.0912,
        address: '123 Main St',
        city: 'Savannah',
        state: 'GA',
      },
      event_source: 'platform',
      source_url: 'https://example.com/event',
      vetting_score: 85,
      organizer: {
        business_name: 'Event Pro LLC',
        verification_status: 'verified',
      },
      vendor_fee: 50,
      max_vendors: 20,
      applications_count: 15,
      status: 'published',
    };

    const result = transformEvent(platformEvent);

    expect(result.id).toBe('event-1');
    expect(result.name).toBe('Food Truck Festival');
    expect(result.description).toBe('Annual food truck event');
    expect(result.location_data.lat).toBe(32.0809);
    expect(result.location_data.lng).toBe(-81.0912);
    expect(result.location_data.address).toBe('123 Main St');
    expect(result.location_data.city).toBe('Savannah');
    expect(result.location_data.state).toBe('GA');
    expect(result.event_source).toBe('platform');
    expect(result.vendor_fee).toBe(50);
    expect(result.status).toBe('published');
    expect(result.organizer?.business_name).toBe('Event Pro LLC');
  });

  it('should transform platform event with missing location_data to null coords', () => {
    const platformEvent: ApiPlatformEvent = {
      id: 'event-2',
      name: 'No Location Event',
      event_source: 'platform',
    };

    const result = transformEvent(platformEvent);

    expect(result.location_data.lat).toBeNull();
    expect(result.location_data.lng).toBeNull();
  });

  it('should transform external event with all fields', () => {
    const externalEvent: ApiExternalEvent = {
      id: 'ext-1',
      name: 'Street Food Fair',
      description: 'Local street food',
      start_date: '2026-04-20',
      end_date: '2026-04-21',
      location_data: {
        lat: 32.0809,
        lng: -81.0912,
        address: '456 Oak Ave',
        city: 'Savannah',
        state: 'GA',
      },
      event_source: 'external',
      source_type: 'eproval',
      source: 'savannah_eproval',
      source_url: 'https://eproval.com/event',
      vetting_score: 90,
      relevance_score: 0.85,
      organizer: null,
      vendor_fee: null,
      max_vendors: null,
    };

    const result = transformEvent(externalEvent);

    expect(result.id).toBe('ext-1');
    expect(result.name).toBe('Street Food Fair');
    expect(result.location_data.lat).toBe(32.0809);
    expect(result.event_source).toBe('external');
    expect(result.source_type).toBe('eproval');
    expect(result.relevance_score).toBe(0.85);
    expect(result.organizer).toBeNull();
    expect(result.vendor_fee).toBeNull();
  });

  it('should default description to empty string when missing', () => {
    const event: ApiPlatformEvent = {
      id: 'event-3',
      name: 'No Desc',
      event_source: 'platform',
    };

    const result = transformEvent(event);

    expect(result.description).toBe('');
  });
});
