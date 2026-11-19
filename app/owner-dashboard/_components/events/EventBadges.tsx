import { Badge } from '@/components/ui/badge';
import { getSourceDisplay, getSourceCategory } from '@/lib/events/sourceDisplay';
import { getTrafficLight } from '@/lib/events/trafficLightBadge';
import { classifyEvent } from '@/lib/events/eventCategories';

export interface EventBadgeData {
  source?: string | null;
  source_type?: string | null;
  vetting_score?: number | null;
  relevance_score?: number | null;
  verification_badge?: string | null;
  traffic_level?: 'high' | 'medium' | 'low' | 'none' | null;
  vendor_fee?: number | null;
  event_source?: 'platform' | 'external';
  name?: string;
  description?: string | null;
}

const TRAFFIC_CONFIG = {
  high: {
    label: 'High Traffic',
    cls: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  },
  medium: {
    label: 'Moderate Traffic',
    cls: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
  },
  low: {
    label: 'Low Traffic',
    cls: 'bg-zinc-500/10 border-zinc-500/30 text-zinc-400',
  },
} as const;

function getRelevanceDisplay(score: number): { label: string; cls: string } | null {
  if (score === 0) return null;
  if (score >= 7)
    return {
      label: 'Highly Relevant',
      cls: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    };
  if (score >= 4)
    return {
      label: 'Somewhat Relevant',
      cls: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    };
  return { label: 'Low Relevance', cls: 'bg-zinc-500/10 border-zinc-500/30 text-zinc-500' };
}

export function EventBadges({
  event,
  compact = false,
  omitTrafficLight = false,
}: {
  event: EventBadgeData;
  compact?: boolean;
  omitTrafficLight?: boolean;
}) {
  const src = getSourceDisplay(event.source, event.source_type);
  const cat = classifyEvent(event.name ?? '', event.description ?? '');
  const light = omitTrafficLight
    ? null
    : getTrafficLight({
        vettingScore: event.vetting_score,
        relevanceScore: event.relevance_score,
        verificationBadge: event.verification_badge,
        sourceCategory: getSourceCategory(event.source_type ?? null),
      });
  const traffic =
    event.traffic_level && event.traffic_level !== 'none'
      ? TRAFFIC_CONFIG[event.traffic_level]
      : null;
  const relevance = getRelevanceDisplay(event.relevance_score ?? 0);

  const badgeCls = compact ? 'text-[10px] py-0 px-1.5' : 'text-xs px-1.5 py-0.5';

  return (
    <div className="flex items-center flex-wrap gap-1">
      <Badge variant="outline" className={`${badgeCls} gap-1`}>
        <span>{src.icon}</span>
        <span>
          {src.category === 'official'
            ? 'Official'
            : src.category === 'platform'
              ? 'Eventbrite'
              : src.label}
        </span>
      </Badge>
      {cat.category !== 'other' && (
        <span className={`inline-flex items-center gap-1 ${badgeCls} rounded border ${cat.color}`}>
          {cat.icon} {cat.label}
        </span>
      )}
      {event.event_source === 'platform' && event.vendor_fee != null && event.vendor_fee > 0 && (
        <Badge variant="default" className={badgeCls}>
          ${event.vendor_fee}
        </Badge>
      )}
      {event.event_source === 'external' && event.vendor_fee != null && event.vendor_fee > 0 && (
        <Badge variant="default" className={badgeCls}>
          ${event.vendor_fee}
        </Badge>
      )}
      {light && light.level !== 'none' && (
        <span
          className={`inline-flex items-center gap-1 ${badgeCls} rounded border ${light.bgClass}`}
        >
          {light.emoji} {light.label}
        </span>
      )}
      {traffic && (
        <span
          className={`inline-flex items-center gap-1 ${badgeCls} rounded border ${traffic.cls}`}
        >
          🚗 {traffic.label}
        </span>
      )}
      {relevance && (
        <span
          className={`inline-flex items-center gap-1 ${badgeCls} rounded border ${relevance.cls}`}
        >
          🎯 {relevance.label}
        </span>
      )}
    </div>
  );
}
