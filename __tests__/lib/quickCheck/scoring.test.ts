import { describe, it, expect } from '@jest/globals';
import { calculateRisk, getQuestionSummary } from '@/lib/quickCheck/scoring';

function answersFrom(checkedIds: string[], uncheckedIds: string[] = []): Map<string, boolean> {
  const map = new Map<string, boolean>();
  for (const id of checkedIds) map.set(id, true);
  for (const id of uncheckedIds) map.set(id, false);
  return map;
}

describe('calculateRisk', () => {
  it('returns high risk when any red flag is checked', () => {
    const result = calculateRisk(answersFrom(['payment-method']));
    expect(result.level).toBe('high');
    expect(result.redFlagsFound).toBe(1);
    expect(result.redFlagIds).toContain('payment-method');
    expect(result.reason).toContain('1 red flag');
  });

  it('returns high risk with multiple red flags', () => {
    const result = calculateRisk(answersFrom(['payment-method', 'high-pressure'], ['ghost-identity']));
    expect(result.level).toBe('high');
    expect(result.redFlagsFound).toBe(3);
    expect(result.redFlagIds).toEqual(['payment-method', 'high-pressure', 'ghost-identity']);
    expect(result.reason).toContain('3 red flags');
  });

  it('returns low risk when all items are verified and no red flags', () => {
    const result = calculateRisk(
      answersFrom([
        'ratio-check',
        'exclusivity',
        'social-proof',
        'vendor-feedback',
        'permit-timeline',
        'power-waste',
        'staff-vouchers',
        'refund-policy',
        'direct-contact',
        'distance-vs-fee',
      ]),
    );
    expect(result.level).toBe('low');
    expect(result.redFlagsFound).toBe(0);
    expect(result.greenFlagsFound).toBe(10);
  });

  it('returns medium risk when some items are unverified', () => {
    const result = calculateRisk(answersFrom(['ratio-check', 'exclusivity', 'social-proof', 'vendor-feedback']));
    expect(result.level).toBe('medium');
    expect(result.redFlagsFound).toBe(0);
  });

  it('returns high risk when most items are unverified', () => {
    const result = calculateRisk(answersFrom([]));
    expect(result.level).toBe('high');
    expect(result.redFlagsFound).toBe(0);
    expect(result.reason).toContain('incomplete');
  });

  it('red flag overrides everything else', () => {
    const result = calculateRisk(
      answersFrom(
        ['high-pressure', 'ratio-check', 'exclusivity', 'social-proof', 'vendor-feedback', 'no-contract', 'permit-timeline', 'power-waste', 'staff-vouchers', 'refund-policy', 'direct-contact', 'distance-vs-fee'],
      ),
    );
    expect(result.level).toBe('high');
    expect(result.redFlagsFound).toBe(1);
    expect(result.redFlagIds).toContain('high-pressure');
  });

  it('crowd math unchecked items weigh more than logistics unchecked', () => {
    const onlyCrowdMath = calculateRisk(answersFrom(['permit-timeline', 'power-waste', 'staff-vouchers', 'refund-policy']));
    const onlyLogistics = calculateRisk(answersFrom(['ratio-check', 'exclusivity', 'social-proof', 'vendor-feedback']));

    expect(onlyCrowdMath.level).toBe('high');
    expect(onlyLogistics.level).toBe('medium');
  });

  it('ghost-identity yes is green (inverted), no is red flag', () => {
    const hasIdentity = calculateRisk(answersFrom(['ghost-identity']));
    expect(hasIdentity.redFlagsFound).toBe(0);

    const noIdentity = calculateRisk(answersFrom([], ['ghost-identity']));
    expect(noIdentity.redFlagsFound).toBe(1);
    expect(noIdentity.level).toBe('high');
    expect(noIdentity.redFlagIds).toContain('ghost-identity');
  });

  it('no-contract yes is green (inverted), no is red flag', () => {
    const willing = calculateRisk(answersFrom(['no-contract']));
    expect(willing.redFlagsFound).toBe(0);

    const unwilling = calculateRisk(answersFrom([], ['no-contract']));
    expect(unwilling.redFlagsFound).toBe(1);
    expect(unwilling.level).toBe('high');
    expect(unwilling.redFlagIds).toContain('no-contract');
  });

  it('returns correct totalQuestions', () => {
    const result = calculateRisk(new Map());
    expect(result.totalQuestions).toBe(15);
  });

  it('verified and unverified ids partition correctly', () => {
    const result = calculateRisk(answersFrom(['ratio-check', 'permit-timeline']));
    expect(result.verifiedIds).toEqual(['ratio-check', 'permit-timeline']);
    expect(result.unverifiedIds).not.toContain('ratio-check');
    expect(result.unverifiedIds).not.toContain('permit-timeline');
    expect(result.unverifiedIds.length).toBe(9);
  });
});

describe('getQuestionSummary', () => {
  it('returns summary for known question', () => {
    expect(getQuestionSummary('payment-method')).toBe('P2P-only payment with no in-person alternative');
  });

  it('returns id fallback for unknown question', () => {
    expect(getQuestionSummary('nonexistent')).toBe('nonexistent');
  });
});
