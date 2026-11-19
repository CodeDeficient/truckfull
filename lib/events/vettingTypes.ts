export type {
  EventSource,
  EventVettingRequest,
  EventVettingResult,
  FactorScores,
} from '@/lib/events/eventVetting';

export interface VetResult {
  vetted: number;
  skipped: number;
  failed: number;
  duration_ms: number;
}
