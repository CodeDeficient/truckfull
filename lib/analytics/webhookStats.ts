import { getSupabase } from '@/lib/supabase/client';
import { Database } from '@/lib/database.remote.types';

export interface WebhookStats {
  totalReceived: number;
  parseSuccess: number;
  parseFailed: number;
  avgAccuracy: number;
  avgLatency: number;
  modelPerformance: ModelStats[];
}

export interface ModelStats {
  modelName: string;
  successRate: number;
  avgLatency: number;
  avgConfidence: number;
}

type WebhookEvent = Database['public']['Tables']['facebook_webhook_events']['Row'];

interface ParsedPayload {
  confidence?: number;
  latency?: number;
  model_name?: string;
  [key: string]: unknown;
}

export async function getWebhookStats(timeRange: string): Promise<WebhookStats> {
  const supabase = getSupabase();

  const now = new Date();
  let startDate: Date;

  switch (timeRange) {
    case '24h': {
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    }
    case '7d': {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    }
    case '30d': {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    }
    default: {
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  const { data: webhookEvents, error: webhookError } = await supabase
    .from('facebook_webhook_events')
    .select('event_type, payload')
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: false });

  if (webhookError) {
    throw new Error(`Failed to fetch webhook events: ${webhookError.message}`);
  }

  const events = webhookEvents as WebhookEvent[] | null;

  // Create safe accessors for the payload which is JSONB (unknown in TS)
  const getPayload = (e: WebhookEvent): ParsedPayload => {
    if (!e.payload || typeof e.payload !== 'object') return {};
    return e.payload as ParsedPayload;
  };

  const totalReceived = events?.filter((e) => e.event_type === 'webhook_received').length || 0;
  const parseSuccess = events?.filter((e) => e.event_type === 'parse_success').length || 0;
  const parseFailed = events?.filter((e) => e.event_type === 'parse_failure').length || 0;

  const successEvents = events?.filter((e) => e.event_type === 'parse_success') || [];

  const avgAccuracy =
    successEvents.length > 0
      ? successEvents.reduce((sum, e) => sum + (getPayload(e).confidence || 0), 0) /
        successEvents.length
      : 0;

  const avgLatency =
    successEvents.length > 0
      ? successEvents.reduce((sum, e) => sum + (getPayload(e).latency || 0), 0) /
        successEvents.length
      : 0;

  const modelStats = successEvents.reduce(
    (acc, event) => {
      const payload = getPayload(event);
      const model = payload.model_name || 'unknown';
      if (!acc[model]) {
        acc[model] = { success: 0, totalLatency: 0, totalConfidence: 0, count: 0 };
      }
      acc[model].success += 1;
      acc[model].totalLatency += payload.latency || 0;
      acc[model].totalConfidence += payload.confidence || 0;
      acc[model].count += 1;
      return acc;
    },
    {} as Record<
      string,
      { success: number; totalLatency: number; totalConfidence: number; count: number }
    >,
  );

  const modelPerformance: ModelStats[] = Object.entries(modelStats).map(([modelName, stats]) => ({
    modelName,
    successRate: stats.count > 0 ? stats.success / stats.count : 0,
    avgLatency: stats.count > 0 ? stats.totalLatency / stats.count : 0,
    avgConfidence: stats.count > 0 ? stats.totalConfidence / stats.count : 0,
  }));

  return {
    totalReceived,
    parseSuccess,
    parseFailed,
    avgAccuracy,
    avgLatency,
    modelPerformance,
  };
}
