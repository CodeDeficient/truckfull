import type { EventClaim } from './claimExtractor';
import type { SourceVerificationResult } from './claimVerification';
import type { ResearchSource } from './types';
import type { PhoneVerificationResult } from './verifyPhone';

export type SourceTag = 'relevant' | 'mentioned' | 'off-topic';

export interface TaggedSource {
  source: ResearchSource;
  tag: SourceTag;
  verification: SourceVerificationResult;
  fullContentFetched: boolean;
}

export interface EvidenceAggregate {
  taggedSources: TaggedSource[];
  overallConfidence: number;
  criticalClaimsCoverage: number;
  phoneVerification: PhoneVerificationResult | null;
  emailVerification: PhoneVerificationResult | null;
  websiteVerification: PhoneVerificationResult | null;
  droppedSourceCount: number;
  isNameFragment: boolean;
}

function tagSource(
  verification: SourceVerificationResult,
  claims: EventClaim[],
): SourceTag {
  const criticalClaims = claims.filter((c) => c.severity === 'critical');
  if (criticalClaims.length === 0) return verification.totalScore > 0.2 ? 'mentioned' : 'off-topic';

  const hasNameMatch = verification.claimsVerified['name']?.status === 'supported'
    || verification.claimsVerified['name']?.status === 'partial';

  if (verification.criticalSupported >= 1 && hasNameMatch) return 'relevant';

  if (verification.criticalPartial >= 1 || verification.totalScore > 0.15) return 'mentioned';

  return 'off-topic';
}

function computeConfidence(tagged: TaggedSource[], claims: EventClaim[]): number {
  const relevant = tagged.filter((s) => s.tag === 'relevant').length;
  const mentioned = tagged.filter((s) => s.tag === 'mentioned').length;
  const criticalClaims = claims.filter((c) => c.severity === 'critical');
  const totalCritical = criticalClaims.length;
  if (totalCritical === 0) return tagged.length > 0 ? 0.2 : 0;

  const uniqueCriticalVerified = new Set<string>();
  for (const ts of tagged) {
    if (ts.tag === 'off-topic') continue;
    for (const claim of criticalClaims) {
      const v = ts.verification.claimsVerified[claim.type];
      if (v && (v.status === 'supported' || v.status === 'partial')) {
        uniqueCriticalVerified.add(claim.type);
      }
    }
  }

  const criticalCoverage = uniqueCriticalVerified.size / totalCritical;
  const sourceMultiplier = relevant + mentioned === 0
    ? 0
    : Math.min(1, (relevant * 0.4 + mentioned * 0.15) + 0.1);

  return Math.min(1, criticalCoverage * 0.7 + sourceMultiplier * 0.3);
}

export function aggregateEvidence(
  sources: Array<{
    source: ResearchSource;
    verification: SourceVerificationResult;
    fullContentFetched: boolean;
  }>,
  claims: EventClaim[],
  phoneVerification: PhoneVerificationResult | null,
  isNameFragment = false,
  emailVerification: PhoneVerificationResult | null = null,
  websiteVerification: PhoneVerificationResult | null = null,
): EvidenceAggregate {
  const tagged: TaggedSource[] = sources.map((s) => ({
    source: s.source,
    tag: tagSource(s.verification, claims),
    verification: s.verification,
    fullContentFetched: s.fullContentFetched,
  }));

  tagged.sort((a, b) => {
    const order: Record<SourceTag, number> = { relevant: 0, mentioned: 1, 'off-topic': 2 };
    return order[a.tag] - order[b.tag];
  });

  const rawCoverage = computeCriticalCoverage(tagged, claims);
  const cappedCoverage = isNameFragment ? Math.min(rawCoverage, 0.6) : rawCoverage;

  return {
    taggedSources: tagged,
    overallConfidence: computeConfidence(tagged, claims),
    criticalClaimsCoverage: cappedCoverage,
    phoneVerification,
    emailVerification,
    websiteVerification,
    droppedSourceCount: tagged.filter((s) => s.tag === 'off-topic').length,
    isNameFragment,
  };
}

function computeCriticalCoverage(tagged: TaggedSource[], claims: EventClaim[]): number {
  const criticalClaims = claims.filter((c) => c.severity === 'critical');
  if (criticalClaims.length === 0) return 0;

  const matched = new Set<string>();
  for (const ts of tagged) {
    if (ts.tag === 'off-topic') continue;
    for (const claim of criticalClaims) {
      const v = ts.verification.claimsVerified[claim.type];
      if (v && (v.status === 'supported' || v.status === 'partial')) {
        matched.add(claim.type);
      }
    }
  }

  return matched.size / criticalClaims.length;
}
