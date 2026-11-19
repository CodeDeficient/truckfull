import { callLLM, DEFAULT_LLM_CONFIG } from '@/lib/utils/callLLM';
import { logError, logMessage } from '@/lib/logging';
import type { EventClaim } from './claimExtractor';
import type { ClaimVerification, SourceVerificationResult } from './claimVerification';

const JSON_CODE_FENCE = /```json?\n?/g;
const TRAILING_CODE_FENCE = /```$/g;

export interface LLMVerificationResult {
  claim: string;
  status: 'supported' | 'refuted' | 'partial' | 'not_mentioned';
  reason: string;
  quote: string | null;
}

interface LLMResponse {
  verifications: Array<{
    claim: string;
    status: 'supported' | 'refuted' | 'partial' | 'not_mentioned';
    reason: string;
    quote: string | null;
  }>;
}

function buildVerificationPrompt(
  claims: EventClaim[],
  sourceTitle: string,
  sourceContent: string,
): string {
  const claimDescriptions = claims
    .map((c) => `  - ${c.type} (${c.severity}): "${c.canonicalValue}"`)
    .join('\n');

  const truncatedContent = sourceContent.length > 4000
    ? sourceContent.slice(0, 4000) + '...(truncated)'
    : sourceContent;

  return `You are verifying whether a web source corroborates specific claims about an event.

Event claims to verify:
${claimDescriptions}

Source title: "${sourceTitle}"

Source content:
"""
${truncatedContent}
"""

For each claim, determine if this source ACTUALLY corroborates it. Be strict:
- "supported" = the source explicitly mentions this specific information about THIS event
- "partial" = the source mentions something related but not a direct match
- "refuted" = the source contradicts this claim
- "not_mentioned" = the source does not mention this at all

IMPORTANT RULES:
- A city name appearing in a source does NOT corroborate an event. Thousands of events happen in any city.
- "Asheville" in a restaurant review is NOT evidence for "Asheville Food Festival".
- A date appearing in a source does NOT corroborate an event unless it's in the context of the same event.
- Only mark "supported" if the source clearly references THE SAME event with matching specifics.

Return ONLY JSON:
{
  "verifications": [
    { "claim": "<claim_type>", "status": "<status>", "reason": "<brief>", "quote": "<exact quote or null>" }
  ]
}`;
}

const KNOWN_CLAIM_TYPES = new Set(['name', 'venue', 'date', 'phone', 'food_truck', 'website']);

export function mergeLLMWithDeterministic(
  deterministic: SourceVerificationResult,
  llmResults: LLMVerificationResult[],
  options?: { claimTypes?: Set<string>; criticalClaims?: Set<string> },
): SourceVerificationResult {
  const validTypes = options?.claimTypes ?? KNOWN_CLAIM_TYPES;
  const criticalClaims = options?.criticalClaims ?? new Set(['name', 'venue', 'date']);
  const merged = { ...deterministic };
  merged.claimsVerified = { ...deterministic.claimsVerified };

  let newCriticalSupported = 0;
  let newCriticalPartial = 0;
  const newQuotes = [...deterministic.supportingQuotes];

  for (const llm of llmResults) {
    if (!validTypes.has(llm.claim)) continue;
    const existing = merged.claimsVerified[llm.claim];
    if (!existing) continue;

    if (llm.status === 'supported' && existing.status === 'not_mentioned') {
      merged.claimsVerified[llm.claim] = {
        status: 'partial',
        score: Math.max(existing.score, 0.4),
        evidence: llm.quote ?? existing.evidence,
      };
    } else if (llm.status === 'refuted' && existing.status !== 'refuted') {
      merged.claimsVerified[llm.claim] = {
        status: 'refuted',
        score: 0,
        evidence: llm.quote ?? existing.evidence,
      };
    } else if (llm.status === 'supported' && existing.status === 'partial') {
      merged.claimsVerified[llm.claim] = {
        status: 'supported',
        score: Math.max(existing.score, 0.7),
        evidence: llm.quote ?? existing.evidence,
      };
    }

    if (llm.quote && !newQuotes.includes(llm.quote)) {
      newQuotes.push(llm.quote);
    }
  }

  const claimsArray = Object.entries(merged.claimsVerified) as Array<[string, ClaimVerification]>;
  let totalScore = 0;
  for (const [claimType, v] of claimsArray) {
    totalScore += v.score;
    if (criticalClaims.has(claimType)) {
      if (v.status === 'supported') newCriticalSupported++;
      if (v.status === 'partial') newCriticalPartial++;
    }
  }

  merged.criticalSupported = newCriticalSupported;
  merged.criticalPartial = newCriticalPartial;
  merged.totalScore = claimsArray.length > 0 ? totalScore / claimsArray.length : 0;
  merged.supportingQuotes = [...new Set(newQuotes)].slice(0, 5);

  return merged;
}

export async function llmDeepVerify(
  claims: EventClaim[],
  sourceTitle: string,
  sourceContent: string,
  deterministicResult: SourceVerificationResult,
): Promise<SourceVerificationResult> {
  if (claims.length === 0 || !sourceContent.trim()) {
    return deterministicResult;
  }

  const hasPartialOrUnverified = Object.values(deterministicResult.claimsVerified).some(
    (v) => v.status === 'partial' || v.status === 'not_mentioned',
  );

  if (!hasPartialOrUnverified) {
    return deterministicResult;
  }

  try {
    const response = await callLLM(
      [
        { role: 'system', content: buildVerificationPrompt(claims, sourceTitle, sourceContent) },
        { role: 'user', content: 'Verify each claim against this source.' },
      ],
      DEFAULT_LLM_CONFIG,
    );

    if (!response.success || !response.data) {
      logError('llmDeepVerify: OpenRouter call failed');
      return deterministicResult;
    }

    let jsonText = response.data.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replaceAll(JSON_CODE_FENCE, '').replaceAll(TRAILING_CODE_FENCE, '').trim();
    }

    const parsed = JSON.parse(jsonText) as LLMResponse;
    if (!parsed.verifications || !Array.isArray(parsed.verifications)) {
      logError('llmDeepVerify: Invalid response structure');
      return deterministicResult;
    }

    logMessage(`llmDeepVerify: Got ${parsed.verifications.length} LLM verifications for "${sourceTitle}"`);
    return mergeLLMWithDeterministic(deterministicResult, parsed.verifications);
  } catch (error) {
    logError('llmDeepVerify: Failed:', error);
    return deterministicResult;
  }
}
