export type TrafficLightLevel = 'green' | 'yellow' | 'red' | 'none';

export interface TrafficLightInfo {
  level: TrafficLightLevel;
  emoji: string;
  label: string;
  tooltip: string;
  bgClass: string;
}

const GREEN: TrafficLightInfo = {
  level: 'green',
  emoji: '🟢',
  label: 'Promising',
  tooltip: 'Strong research signals. High relevance to food trucks.',
  bgClass: 'bg-green-500/20 text-green-400 border-green-500/30',
};

const YELLOW: TrafficLightInfo = {
  level: 'yellow',
  emoji: '🟡',
  label: 'Caution',
  tooltip: 'Some research signals. Moderate relevance — investigate further.',
  bgClass: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
};

const RED: TrafficLightInfo = {
  level: 'red',
  emoji: '🔴',
  label: 'Low Signal',
  tooltip: 'Weak research signals. Low relevance score. Proceed with caution.',
  bgClass: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const NONE: TrafficLightInfo = {
  level: 'none',
  emoji: '⚪',
  label: 'Unresearched',
  tooltip: 'No research data available for this event.',
  bgClass: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
};

export function getTrafficLight(info: {
  vettingScore: number | null | undefined;
  relevanceScore: number | null | undefined;
  verificationBadge: string | null | undefined;
  sourceCategory: 'official' | 'platform' | 'community';
}): TrafficLightInfo {
  const { vettingScore, relevanceScore, verificationBadge, sourceCategory } = info;
  const vet = vettingScore ?? 0;
  const rel = relevanceScore ?? 0;

  const hasBadge = !!verificationBadge;
  const isOfficial = sourceCategory === 'official';

  let score = 0;
  if (vet >= 25) score += 3;
  else if (vet >= 15) score += 2;
  else if (vet >= 5) score += 1;

  if (rel >= 8) score += 3;
  else if (rel >= 5) score += 2;
  else if (rel >= 3) score += 1;

  if (hasBadge) score += 2;
  if (isOfficial) score += 1;

  if (score === 0 && vet === 0 && rel === 0) return NONE;
  if (score >= 5) return GREEN;
  if (score >= 2) return YELLOW;
  return RED;
}

export function getAreaTrafficLevel(scorePercentile: number | null | undefined): TrafficLightInfo {
  if (scorePercentile == null) return NONE;
  if (scorePercentile >= 60) return GREEN;
  if (scorePercentile >= 30) return YELLOW;
  return RED;
}
