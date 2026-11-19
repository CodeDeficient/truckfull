import { describe, it, expect } from '@jest/globals';
import { mergeLLMWithDeterministic } from '@/lib/research/llmClaimVerifier';
import type { SourceVerificationResult } from '@/lib/research/claimVerification';
import type { LLMVerificationResult } from '@/lib/research/llmClaimVerifier';

function makeDeterministic(overrides: Partial<SourceVerificationResult> = {}): SourceVerificationResult {
  return {
    claimsVerified: {
      name: { status: 'supported', score: 1, evidence: 'Spring Food Festival' },
      venue: { status: 'not_mentioned', score: 0, evidence: null },
      date: { status: 'partial', score: 0.5, evidence: 'May' },
    },
    criticalSupported: 1,
    criticalPartial: 1,
    totalScore: 0.5,
    supportingQuotes: ['Spring Food Festival'],
    ...overrides,
  };
}

describe('mergeLLMWithDeterministic', () => {
  it('upgrades not_mentioned to partial when LLM says supported', () => {
    const deterministic = makeDeterministic();
    const llmResults: LLMVerificationResult[] = [
      { claim: 'venue', status: 'supported', reason: 'Venue mentioned', quote: 'Asheville Mall' },
    ];

    const result = mergeLLMWithDeterministic(deterministic, llmResults);

    expect(result.claimsVerified['venue']?.status).toBe('partial');
    expect(result.claimsVerified['venue']?.score).toBeGreaterThanOrEqual(0.4);
    expect(result.claimsVerified['venue']?.evidence).toBe('Asheville Mall');
  });

  it('upgrades partial to supported when LLM says supported', () => {
    const deterministic = makeDeterministic();
    const llmResults: LLMVerificationResult[] = [
      { claim: 'date', status: 'supported', reason: 'Date matches', quote: 'May 1, 2026' },
    ];

    const result = mergeLLMWithDeterministic(deterministic, llmResults);

    expect(result.claimsVerified['date']?.status).toBe('supported');
    expect(result.claimsVerified['date']?.score).toBeGreaterThanOrEqual(0.7);
  });

  it('sets refuted when LLM says refuted', () => {
    const deterministic = makeDeterministic();
    const llmResults: LLMVerificationResult[] = [
      { claim: 'name', status: 'refuted', reason: 'Different event', quote: null },
    ];

    const result = mergeLLMWithDeterministic(deterministic, llmResults);

    expect(result.claimsVerified['name']?.status).toBe('refuted');
    expect(result.claimsVerified['name']?.score).toBe(0);
  });

  it('keeps supported when LLM says supported', () => {
    const deterministic = makeDeterministic();
    const llmResults: LLMVerificationResult[] = [
      { claim: 'name', status: 'supported', reason: 'Confirmed', quote: null },
    ];

    const result = mergeLLMWithDeterministic(deterministic, llmResults);

    expect(result.claimsVerified['name']?.status).toBe('supported');
    expect(result.claimsVerified['name']?.score).toBe(1);
  });

  it('skips claims not in deterministic result', () => {
    const deterministic = makeDeterministic();
    const llmResults: LLMVerificationResult[] = [
      { claim: 'phone', status: 'supported', reason: 'Phone found', quote: '828-555-1234' },
    ];

    const result = mergeLLMWithDeterministic(deterministic, llmResults);

    expect(result.claimsVerified['phone']).toBeUndefined();
  });

  it('adds LLM quotes to supporting quotes', () => {
    const deterministic = makeDeterministic();
    const llmResults: LLMVerificationResult[] = [
      { claim: 'venue', status: 'supported', reason: 'Found', quote: 'At the Asheville Mall venue' },
    ];

    const result = mergeLLMWithDeterministic(deterministic, llmResults);

    expect(result.supportingQuotes).toContain('At the Asheville Mall venue');
    expect(result.supportingQuotes).toContain('Spring Food Festival');
  });

  it('deduplicates supporting quotes', () => {
    const deterministic = makeDeterministic({
      supportingQuotes: ['Spring Food Festival', 'May 1, 2026'],
    });
    const llmResults: LLMVerificationResult[] = [
      { claim: 'venue', status: 'supported', reason: 'Found', quote: 'Spring Food Festival' },
      { claim: 'date', status: 'supported', reason: 'Found', quote: 'May 1, 2026' },
    ];

    const result = mergeLLMWithDeterministic(deterministic, llmResults);

    const uniqueQuotes = new Set(result.supportingQuotes);
    expect(result.supportingQuotes.length).toBe(uniqueQuotes.size);
  });

  it('limits supporting quotes to 5', () => {
    const deterministic = makeDeterministic({
      supportingQuotes: ['q1', 'q2', 'q3', 'q4', 'q5'],
    });
    const llmResults: LLMVerificationResult[] = [
      { claim: 'venue', status: 'supported', reason: 'Found', quote: 'q6' },
    ];

    const result = mergeLLMWithDeterministic(deterministic, llmResults);

    expect(result.supportingQuotes.length).toBeLessThanOrEqual(5);
  });

  it('recalculates total score correctly', () => {
    const deterministic = makeDeterministic();
    const llmResults: LLMVerificationResult[] = [
      { claim: 'venue', status: 'supported', reason: 'Found', quote: 'Asheville Mall' },
    ];

    const result = mergeLLMWithDeterministic(deterministic, llmResults);

    const expectedScore = (
      result.claimsVerified['name']!.score +
      result.claimsVerified['venue']!.score +
      result.claimsVerified['date']!.score
    ) / 3;

    expect(result.totalScore).toBeCloseTo(expectedScore, 5);
  });

  it('returns unchanged result for empty LLM results', () => {
    const deterministic = makeDeterministic();
    const result = mergeLLMWithDeterministic(deterministic, []);

    expect(result.claimsVerified).toEqual(deterministic.claimsVerified);
    expect(result.totalScore).toBe(deterministic.totalScore);
  });

  it('handles LLM refuted on already refuted claim', () => {
    const deterministic = makeDeterministic({
      claimsVerified: {
        name: { status: 'refuted', score: 0, evidence: 'Contradicts' },
      },
    });
    const llmResults: LLMVerificationResult[] = [
      { claim: 'name', status: 'refuted', reason: 'Also refuted', quote: null },
    ];

    const result = mergeLLMWithDeterministic(deterministic, llmResults);

    expect(result.claimsVerified['name']?.status).toBe('refuted');
  });

  it('does not upgrade refuted claim when LLM says supported', () => {
    const deterministic = makeDeterministic({
      claimsVerified: {
        name: { status: 'refuted', score: 0, evidence: 'Wrong event' },
      },
    });
    const llmResults: LLMVerificationResult[] = [
      { claim: 'name', status: 'supported', reason: 'Found match', quote: 'Spring Festival' },
    ];

    const result = mergeLLMWithDeterministic(deterministic, llmResults);

    expect(result.claimsVerified['name']?.status).toBe('refuted');
  });

  it('filters out invalid claim types from LLM', () => {
    const deterministic = makeDeterministic();
    const llmResults: LLMVerificationResult[] = [
      { claim: 'invalid_type', status: 'supported', reason: 'Ignore', quote: 'something' },
    ];

    const result = mergeLLMWithDeterministic(deterministic, llmResults);

    expect(result.claimsVerified['invalid_type']).toBeUndefined();
    expect(result.totalScore).toBe(deterministic.totalScore);
  });

  it('respects custom claimTypes option', () => {
    const deterministic = makeDeterministic();
    const customTypes = new Set(['name']);
    const llmResults: LLMVerificationResult[] = [
      { claim: 'venue', status: 'supported', reason: 'Found', quote: 'Asheville Mall' },
    ];

    const result = mergeLLMWithDeterministic(deterministic, llmResults, { claimTypes: customTypes });

    expect(result.claimsVerified['venue']?.status).toBe('not_mentioned');
  });

  it('recalculates critical counts after merge', () => {
    const deterministic = makeDeterministic();
    expect(deterministic.criticalSupported).toBe(1);
    expect(deterministic.criticalPartial).toBe(1);

    const llmResults: LLMVerificationResult[] = [
      { claim: 'venue', status: 'supported', reason: 'Found', quote: 'Asheville Mall' },
      { claim: 'date', status: 'supported', reason: 'Date matches', quote: 'May 1, 2026' },
    ];

    const result = mergeLLMWithDeterministic(deterministic, llmResults);

    expect(result.criticalSupported).toBe(2);
    expect(result.criticalPartial).toBe(1);
  });

  it('preserves existing quotes when LLM has no quote', () => {
    const deterministic = makeDeterministic({
      claimsVerified: {
        name: { status: 'partial', score: 0.5, evidence: 'Spring Fest' },
      },
      supportingQuotes: ['Spring Fest'],
    });
    const llmResults: LLMVerificationResult[] = [
      { claim: 'name', status: 'supported', reason: 'Confirmed', quote: null },
    ];

    const result = mergeLLMWithDeterministic(deterministic, llmResults);

    expect(result.claimsVerified['name']?.status).toBe('supported');
    expect(result.claimsVerified['name']?.evidence).toBe('Spring Fest');
  });
});
