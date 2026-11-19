import type { Json } from '@/lib/database.remote.types';
import type { DedupDecision } from './dedupOrchestrator';
import type { MergeAdviceSuccess, MergeAdviceError } from './dedupLlmAdvisor';

export interface DedupReviewEvidenceAdvisory {
  readonly status: 'success' | 'error';
  readonly recommendation?: 'merge' | 'separate' | 'unsure';
  readonly reasoning?: string;
  readonly keyFactors?: string[];
  readonly error?: string;
  readonly model?: string;
  readonly provider?: string;
}

export interface DedupReviewEvidence {
  readonly componentKey: string;
  readonly componentSize: number;
  readonly canonicalEventId: string | null;
  readonly candidateRowIds: string[];
  readonly deterministicReason: string;
  readonly advisory: DedupReviewEvidenceAdvisory | null;
}

function serializeAdvisory(
  advisory: MergeAdviceSuccess | MergeAdviceError | null,
): Json {
  if (advisory === null) return null;
  if (advisory.status === 'success') {
    return {
      status: 'success',
      recommendation: advisory.recommendation,
      reasoning: advisory.reasoning,
      keyFactors: [...advisory.keyFactors],
      model: advisory.model,
      provider: advisory.provider,
    };
  }
  return {
    status: 'error',
    error: advisory.error,
    model: advisory.model,
    provider: advisory.provider,
  };
}

export function buildQueueInsert(decision: DedupDecision): Json {
  return {
    cluster_key: decision.componentKey,
    candidate_row_ids: [...decision.nonCanonicalEventIds],
    proposed_canonical_row_id: decision.canonicalEventId,
    reasoning: decision.reason,
    evidence: {
      componentKey: decision.componentKey,
      componentSize: decision.componentSize,
      canonicalEventId: decision.canonicalEventId,
      candidateRowIds: [...decision.nonCanonicalEventIds],
      deterministicReason: decision.reason,
      advisory: serializeAdvisory(decision.advisory),
    },
  };
}