export type EventSource = 'platform' | 'external';

export type VettingBadgeColor = 'green' | 'yellow' | 'gray';

export interface ExternalEventFields {
  vetting_score: number | null;
  vetting_result: {
    score: number;
    factors: {
      trafficScore: number;
      footTrafficScore: number;
      researchConfidence: number;
      historyScore: number;
      previouslyOccurredScore: number;
    };
    recommendation: string;
    reasoning: string;
    sources: string[];
    locationType?: 'precise' | 'approximate';
  } | null;
  source_url: string | null;
  source: string;
  is_saved?: boolean;
}

export interface PlatformEvent {
  id: string;
  name: string;
  description: string;
  location_data: {
    lat: number;
    lng: number;
    address?: string;
    city?: string;
    state?: string;
  };
  start_date: string | null;
  end_date: string | null;
  status: string;
  vendor_fee: number | null;
  max_vendors: number | null;
  organizer: {
    business_name: string;
    rating_avg: number | null;
    rating_count: number;
    verification_status: string;
    user_id?: string;
  };
  applications_count?: number;
  event_source: 'platform';
  vetting_score: number | null;
}

export interface ExternalEvent {
  id: string;
  name: string;
  description: string | null;
  location_data: {
    lat: number | null;
    lng: number | null;
    address?: string;
    city: string;
    state: string;
  };
  start_date: string | null;
  end_date: string | null;
  status: string;
  vendor_fee: number | null;
  max_vendors: number | null;
  organizer: {
    business_name: string | null;
    rating_avg: number | null;
    rating_count: number | null;
    verification_status: string | null;
  };
  applications_count?: number;
  event_source: 'external';
  vetting_score: number | null;
  vetting_result: ExternalEventFields['vetting_result'];
  source_url: string | null;
  source: string;
  is_saved: boolean;
}

export type UnifiedEvent = PlatformEvent | ExternalEvent;

export interface EventVettingResult {
  score: number;
  factors: {
    trafficScore: number;
    footTrafficScore: number;
    researchConfidence: number;
    historyScore: number;
    previouslyOccurredScore: number;
  };
  recommendation: string;
  reasoning: string;
  sources: string[];
  locationType?: 'precise' | 'approximate';
}

export function getVettingBadgeColor(score: number | null): VettingBadgeColor {
  if (score === null || score < 40) return 'gray';
  if (score >= 70) return 'green';
  return 'yellow';
}

export function getVettingBadgeLabel(score: number | null): string {
  if (score === null || score < 40) return 'Low confidence';
  if (score >= 70) return 'High confidence';
  return 'Moderate';
}

export function isExternalEvent(event: UnifiedEvent): event is ExternalEvent {
  return event.event_source === 'external';
}

export function isPlatformEvent(event: UnifiedEvent): event is PlatformEvent {
  return event.event_source === 'platform';
}
