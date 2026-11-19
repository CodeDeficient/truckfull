export type ConfidenceTier = 'strong_signals' | 'under_review';

export interface ConfidenceBadge {
  readonly tier: ConfidenceTier;
  readonly label: string;
  readonly color: string;
  readonly pillBg: string;
  readonly pillFg: string;
}

const STRONG_SIGNALS: ConfidenceBadge = {
  tier: 'strong_signals',
  label: 'Strong Signals',
  color: 'text-amber-600 dark:text-amber-400',
  pillBg: '#d97706',
  pillFg: '#ffffff',
};

const UNDER_REVIEW: ConfidenceBadge = {
  tier: 'under_review',
  label: 'Under Review',
  color: 'text-gray-500 dark:text-gray-400',
  pillBg: '#9ca3af',
  pillFg: '#ffffff',
};

export function getConfidenceBadge(vettingScore: number): ConfidenceBadge {
  return vettingScore >= 50 ? STRONG_SIGNALS : UNDER_REVIEW;
}
