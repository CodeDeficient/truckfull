import { describe, it, expect } from '@jest/globals';
import { aggregateEvidence } from '@/lib/research/aggregateEvidence';
import type { EventClaim } from '@/lib/research/claimExtractor';
import type { SourceVerificationResult } from '@/lib/research/claimVerification';
import type { ResearchSource } from '@/lib/research/types';

function makeSource(overrides: Partial<ResearchSource> = {}): ResearchSource {
  return {
    title: 'Test Event Source',
    url: 'https://example.com/event',
    snippet: 'Spring Food Festival at Asheville Mall on May 1',
    engines: ['google'],
    ...overrides,
  };
}

function makeVerification(overrides: Partial<SourceVerificationResult> = {}): SourceVerificationResult {
  return {
    claimsVerified: {},
    criticalSupported: 0,
    criticalPartial: 0,
    totalScore: 0,
    supportingQuotes: [],
    ...overrides,
  };
}

function makeClaims(overrides: Partial<EventClaim>[] = []): EventClaim[] {
  return [
    { type: 'name', severity: 'critical', canonicalValue: 'spring food festival', matchPatterns: ['spring', 'food', 'festival'] },
    { type: 'venue', severity: 'critical', canonicalValue: 'asheville mall', matchPatterns: ['asheville', 'mall'] },
    { type: 'date', severity: 'critical', canonicalValue: '2026-05-01', matchPatterns: ['may 1', 'may', '2026'] },
    { type: 'phone', severity: 'major', canonicalValue: '8285551234', matchPatterns: ['8285551234'] },
    { type: 'food_truck', severity: 'major', canonicalValue: 'food truck vendor', matchPatterns: ['food truck', 'vendor'] },
    ...overrides,
  ];
}

describe('aggregateEvidence', () => {
  it('tags source as relevant when name + critical claim supported', () => {
    const claims = makeClaims();
    const result = aggregateEvidence(
      [{
        source: makeSource(),
        verification: makeVerification({
          claimsVerified: {
            name: { status: 'supported', score: 1, evidence: 'Spring Food Festival' },
            venue: { status: 'supported', score: 1, evidence: 'Asheville Mall' },
            date: { status: 'supported', score: 1, evidence: 'May 1' },
          },
          criticalSupported: 3,
          totalScore: 0.8,
          supportingQuotes: ['Spring Food Festival', 'Asheville Mall'],
        }),
        fullContentFetched: true,
      }],
      claims,
      null,
    );

    expect(result.taggedSources[0].tag).toBe('relevant');
    expect(result.overallConfidence).toBeGreaterThan(0.5);
  });

  it('tags source as mentioned when only partial critical matches', () => {
    const claims = makeClaims();
    const result = aggregateEvidence(
      [{
        source: makeSource({ snippet: 'Events in Asheville this May' }),
        verification: makeVerification({
          claimsVerified: {
            venue: { status: 'partial', score: 0.5, evidence: 'Asheville' },
            date: { status: 'supported', score: 1, evidence: 'May' },
          },
          criticalPartial: 1,
          criticalSupported: 0,
          totalScore: 0.3,
          supportingQuotes: ['Asheville'],
        }),
        fullContentFetched: false,
      }],
      claims,
      null,
    );

    expect(result.taggedSources[0].tag).toBe('mentioned');
  });

  it('tags source as off-topic when no critical matches', () => {
    const claims = makeClaims();
    const result = aggregateEvidence(
      [{
        source: makeSource({ snippet: 'Best restaurants in North Carolina' }),
        verification: makeVerification({
          claimsVerified: {
            name: { status: 'not_mentioned', score: 0, evidence: null },
            venue: { status: 'not_mentioned', score: 0, evidence: null },
            date: { status: 'not_mentioned', score: 0, evidence: null },
          },
          totalScore: 0,
          supportingQuotes: [],
        }),
        fullContentFetched: false,
      }],
      claims,
      null,
    );

    expect(result.taggedSources[0].tag).toBe('off-topic');
    expect(result.droppedSourceCount).toBe(1);
  });

  it('sorts sources relevant > mentioned > off-topic', () => {
    const claims = makeClaims();
    const result = aggregateEvidence(
      [
        {
          source: makeSource({ snippet: 'NC restaurants' }),
          verification: makeVerification({ totalScore: 0 }),
          fullContentFetched: false,
        },
        {
          source: makeSource({ snippet: 'Spring Food Festival at Asheville Mall' }),
          verification: makeVerification({
            claimsVerified: {
              name: { status: 'supported', score: 1, evidence: null },
              venue: { status: 'supported', score: 1, evidence: null },
            },
            criticalSupported: 2,
            totalScore: 0.8,
          }),
          fullContentFetched: true,
        },
        {
          source: makeSource({ snippet: 'Events in Asheville May' }),
          verification: makeVerification({
            claimsVerified: {
              venue: { status: 'partial', score: 0.5, evidence: null },
            },
            criticalPartial: 1,
            totalScore: 0.3,
          }),
          fullContentFetched: false,
        },
      ],
      claims,
      null,
    );

    expect(result.taggedSources[0].tag).toBe('relevant');
    expect(result.taggedSources[1].tag).toBe('mentioned');
    expect(result.taggedSources[2].tag).toBe('off-topic');
  });

  it('computes overall confidence from critical claim coverage', () => {
    const claims = makeClaims();
    const result = aggregateEvidence(
      [{
        source: makeSource(),
        verification: makeVerification({
          claimsVerified: {
            name: { status: 'supported', score: 1, evidence: null },
            venue: { status: 'supported', score: 1, evidence: null },
            date: { status: 'supported', score: 1, evidence: null },
          },
          criticalSupported: 3,
          totalScore: 0.8,
        }),
        fullContentFetched: true,
      }],
      claims,
      null,
    );

    expect(result.overallConfidence).toBeCloseTo(0.82, 1);
    expect(result.criticalClaimsCoverage).toBe(1);
  });

  it('returns zero confidence for empty sources', () => {
    const result = aggregateEvidence([], makeClaims(), null);

    expect(result.overallConfidence).toBe(0);
    expect(result.criticalClaimsCoverage).toBe(0);
    expect(result.taggedSources).toHaveLength(0);
    expect(result.droppedSourceCount).toBe(0);
  });

  it('returns zero confidence for empty claims', () => {
    const result = aggregateEvidence(
      [{
        source: makeSource(),
        verification: makeVerification({ totalScore: 0.5 }),
        fullContentFetched: true,
      }],
      [],
      null,
    );

    expect(result.overallConfidence).toBe(0.2);
    expect(result.criticalClaimsCoverage).toBe(0);
  });

  it('includes phone verification in result', () => {
    const claims = makeClaims();
    const phoneResult = {
      status: 'validated' as const,
      venueName: 'Asheville Mall',
      carrier: 'Verizon',
    };

    const result = aggregateEvidence(
      [{
        source: makeSource(),
        verification: makeVerification({
          claimsVerified: {
            name: { status: 'supported', score: 1, evidence: null },
          },
          criticalSupported: 1,
          totalScore: 0.5,
        }),
        fullContentFetched: true,
      }],
      claims,
      phoneResult,
    );

    expect(result.phoneVerification).toEqual(phoneResult);
  });

  it('computes partial critical coverage across multiple sources', () => {
    const claims = makeClaims();
    const result = aggregateEvidence(
      [
        {
          source: makeSource(),
          verification: makeVerification({
            claimsVerified: {
              name: { status: 'supported', score: 1, evidence: null },
              venue: { status: 'supported', score: 1, evidence: null },
            },
            criticalSupported: 2,
            totalScore: 0.6,
          }),
          fullContentFetched: false,
        },
        {
          source: makeSource(),
          verification: makeVerification({
            claimsVerified: {
              name: { status: 'supported', score: 1, evidence: null },
              date: { status: 'supported', score: 1, evidence: null },
            },
            criticalSupported: 2,
            totalScore: 0.7,
          }),
          fullContentFetched: true,
        },
      ],
      claims,
      null,
    );

    expect(result.criticalClaimsCoverage).toBe(1);
    expect(result.taggedSources).toHaveLength(2);
    expect(result.taggedSources.every((s) => s.tag === 'relevant')).toBe(true);
  });

  it('handles relevant source without name match as mentioned', () => {
    const claims = makeClaims();
    const result = aggregateEvidence(
      [{
        source: makeSource(),
        verification: makeVerification({
          claimsVerified: {
            name: { status: 'not_mentioned', score: 0, evidence: null },
            venue: { status: 'supported', score: 1, evidence: null },
            date: { status: 'supported', score: 1, evidence: null },
          },
          criticalSupported: 2,
          totalScore: 0.6,
        }),
        fullContentFetched: true,
      }],
      claims,
      null,
    );

    expect(result.taggedSources[0].tag).toBe('mentioned');
  });

  it('caps criticalClaimsCoverage at 0.6 when isNameFragment is true', () => {
    const claims = makeClaims();
    const result = aggregateEvidence(
      [{
        source: makeSource(),
        verification: makeVerification({
          claimsVerified: {
            name: { status: 'supported', score: 1, evidence: null },
            venue: { status: 'supported', score: 1, evidence: null },
            date: { status: 'supported', score: 1, evidence: null },
          },
          criticalSupported: 3,
          totalScore: 0.8,
        }),
        fullContentFetched: true,
      }],
      claims,
      null,
      true,
    );

    expect(result.criticalClaimsCoverage).toBeLessThanOrEqual(0.6);
    expect(result.isNameFragment).toBe(true);
  });

  it('does not cap coverage when isNameFragment is false', () => {
    const claims = makeClaims();
    const result = aggregateEvidence(
      [{
        source: makeSource(),
        verification: makeVerification({
          claimsVerified: {
            name: { status: 'supported', score: 1, evidence: null },
            venue: { status: 'supported', score: 1, evidence: null },
            date: { status: 'supported', score: 1, evidence: null },
          },
          criticalSupported: 3,
          totalScore: 0.8,
        }),
        fullContentFetched: true,
      }],
      claims,
      null,
      false,
    );

    expect(result.criticalClaimsCoverage).toBe(1);
    expect(result.isNameFragment).toBe(false);
  });
});
