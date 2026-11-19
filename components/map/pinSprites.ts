import type { CitySourceType } from '@/lib/events/types';

export type EventSourceType = 'platform' | CitySourceType;

export type VettingBadgeColor = 'green' | 'yellow' | 'gray';

const GOVERNMENT_SOURCES: ReadonlySet<string> = new Set(['eproval', 'civicplus_rss']);

export function getVettingBadgeColor(score: number | null | undefined): VettingBadgeColor {
  if (score == null || score < 40) return 'gray';
  if (score >= 70) return 'green';
  return 'yellow';
}

export type PinShape = 'circle' | 'shield' | 'pin';

export function getPinShape(source: EventSourceType): PinShape {
  if (source === 'platform') return 'circle';
  if (GOVERNMENT_SOURCES.has(source)) return 'shield';
  return 'pin';
}

export function getPinImageId(source: EventSourceType, badgeColor: VettingBadgeColor): string {
  const shape = getPinShape(source);
  return `event-pin-${shape}-${badgeColor}`;
}

export function getEventLayerId(): string {
  return 'event-markers';
}

export function getEventClusterLayerId(): string {
  return 'event-clusters';
}

export function getEventClusterCountLayerId(): string {
  return 'event-cluster-count';
}

export function getEventCircleLayerId(): string {
  return 'event-circle';
}

export function getEventCircleStrokeLayerId(): string {
  return 'event-circle-stroke';
}
