import type { ParsedPost, QualitySignals, ConfidenceResult } from './types';

// SPAM_WEIGHT = 0: Flag-only mode for data collection
// Spam signals are still calculated and stored, but don't affect scoring
// This allows us to collect real spam data before enabling auto-rejection
const SPAM_WEIGHT = 0;
const CONFLICT_WEIGHT = 0.33;
const FALSE_POSITIVE_WEIGHT = 0.27;
const DATA_QUALITY_WEIGHT = 0.4;

const ACCEPT_THRESHOLD = 0.8;
const REVIEW_THRESHOLD_MIN = 0.4;
const REJECT_THRESHOLD = 0.3;

export function calculateConfidence(post: ParsedPost, signals: QualitySignals): ConfidenceResult {
  const spamScore = SPAM_WEIGHT > 0 ? calculateSpamScore(signals.spam) : 0;
  const conflictScore = calculateConflictScore(signals.conflict);
  const falsePositiveScore = calculateFalsePositiveScore(signals.falsePositive);
  const dataQualityScore = calculateDataQualityScore(signals.dataQuality);

  let totalScore =
    spamScore * SPAM_WEIGHT +
    conflictScore * CONFLICT_WEIGHT +
    falsePositiveScore * FALSE_POSITIVE_WEIGHT +
    dataQualityScore * DATA_QUALITY_WEIGHT;

  const hasHighFalsePositive =
    signals.falsePositive.isFalsePositive && signals.falsePositive.confidence > 0.7;

  if (hasHighFalsePositive) {
    totalScore = Math.min(totalScore, 0.25);
  }

  const highSeverityConflicts = signals.conflict.conflicts.filter(
    (c) => c.severity === 'high',
  ).length;

  if (highSeverityConflicts > 0) {
    totalScore = Math.min(totalScore, 0.65);
  }

  if (signals.falsePositive.confidence > 0.2 && !signals.falsePositive.isFalsePositive) {
    totalScore = Math.min(totalScore, 0.75);
  }

  const action = determineAction(totalScore, signals);

  return {
    score: totalScore,
    action,
    breakdown: {
      spamWeight: spamScore * SPAM_WEIGHT,
      conflictWeight: conflictScore * CONFLICT_WEIGHT,
      falsePositiveWeight: falsePositiveScore * FALSE_POSITIVE_WEIGHT,
      dataQualityWeight: dataQualityScore * DATA_QUALITY_WEIGHT,
    },
  };
}

function calculateSpamScore(spamResult: {
  isSpam: boolean;
  confidence: number;
  reasons: string[];
}): number {
  if (spamResult.isSpam) {
    return 1 - spamResult.confidence;
  }
  return 1;
}

function calculateConflictScore(conflictResult: {
  hasConflict: boolean;
  conflicts: unknown[];
}): number {
  if (!conflictResult.hasConflict || conflictResult.conflicts.length === 0) {
    return 1;
  }

  const conflicts = conflictResult.conflicts as Array<{ severity: 'low' | 'medium' | 'high' }>;

  const highSeverityCount = conflicts.filter((c) => c.severity === 'high').length;
  const mediumSeverityCount = conflicts.filter((c) => c.severity === 'medium').length;
  const lowSeverityCount = conflicts.filter((c) => c.severity === 'low').length;

  let penalty = 0;

  penalty += highSeverityCount * 0.6;
  penalty += mediumSeverityCount * 0.3;
  penalty += lowSeverityCount * 0.1;

  return Math.max(1 - penalty, 0);
}

function calculateFalsePositiveScore(falsePositiveResult: {
  isFalsePositive: boolean;
  confidence: number;
  reasons: string[];
}): number {
  if (falsePositiveResult.isFalsePositive) {
    return 1 - falsePositiveResult.confidence;
  }
  return 1;
}

function calculateDataQualityScore(dataQualityResult: {
  isValid: boolean;
  errors: unknown[];
}): number {
  const errors = dataQualityResult.errors as Array<{ severity: 'error' | 'warning' }>;

  if (errors.length === 0) {
    return 1;
  }

  const errorCount = errors.filter((e) => e.severity === 'error').length;
  const warningCount = errors.filter((e) => e.severity === 'warning').length;

  let score = 1;
  score -= errorCount * 0.4;
  score -= warningCount * 0.1;

  return Math.max(score, 0);
}

function determineAction(score: number, signals: QualitySignals): 'accept' | 'review' | 'reject' {
  if (signals.falsePositive.isFalsePositive && signals.falsePositive.confidence > 0.7) {
    return 'reject';
  }

  if (score < REJECT_THRESHOLD) {
    return 'reject';
  }

  const highSeverityConflicts = signals.conflict.conflicts.filter(
    (c) => c.severity === 'high',
  ).length;

  if (highSeverityConflicts > 0) {
    return 'review';
  }

  const criticalErrors = signals.dataQuality.errors.filter((e) => e.severity === 'error').length;
  if (criticalErrors > 0) {
    return 'review';
  }

  if (signals.falsePositive.confidence > 0.2) {
    return 'review';
  }

  if (score >= ACCEPT_THRESHOLD) {
    return 'accept';
  }

  if (score >= REVIEW_THRESHOLD_MIN) {
    return 'review';
  }

  return 'reject';
}
