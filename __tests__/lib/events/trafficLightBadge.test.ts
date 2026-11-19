import { describe, it, expect } from '@jest/globals';
import { getTrafficLight, getAreaTrafficLevel } from '@/lib/events/trafficLightBadge';

describe('getTrafficLight', () => {
  it('returns GREEN for high vetting + high relevance + official source', () => {
    const result = getTrafficLight({
      vettingScore: 30,
      relevanceScore: 9,
      verificationBadge: null,
      sourceCategory: 'official',
    });
    expect(result.level).toBe('green');
  });

  it('returns GREEN for high vetting + verification badge', () => {
    const result = getTrafficLight({
      vettingScore: 30,
      relevanceScore: 5,
      verificationBadge: 'verified',
      sourceCategory: 'platform',
    });
    expect(result.level).toBe('green');
  });

  it('returns YELLOW for moderate vetting + moderate relevance', () => {
    const result = getTrafficLight({
      vettingScore: 15,
      relevanceScore: 5,
      verificationBadge: null,
      sourceCategory: 'platform',
    });
    expect(result.level).toBe('yellow');
  });

  it('returns RED for low vetting + low relevance', () => {
    const result = getTrafficLight({
      vettingScore: 3,
      relevanceScore: 2,
      verificationBadge: null,
      sourceCategory: 'community',
    });
    expect(result.level).toBe('red');
  });

  it('returns NONE when all scores are 0/null', () => {
    const result = getTrafficLight({
      vettingScore: 0,
      relevanceScore: 0,
      verificationBadge: null,
      sourceCategory: 'community',
    });
    expect(result.level).toBe('none');
  });

  it('returns NONE when vetting and relevance are both undefined', () => {
    const result = getTrafficLight({
      vettingScore: undefined,
      relevanceScore: undefined,
      verificationBadge: undefined,
      sourceCategory: 'community',
    });
    expect(result.level).toBe('none');
  });

  it('official source category gives +1 bonus pushing yellow to green edge case', () => {
    const result = getTrafficLight({
      vettingScore: 15,
      relevanceScore: 5,
      verificationBadge: null,
      sourceCategory: 'official',
    });
    expect(result.level).toBe('green');
  });

  it('verification badge gives +2 bonus', () => {
    const result = getTrafficLight({
      vettingScore: 5,
      relevanceScore: 3,
      verificationBadge: 'trusted',
      sourceCategory: 'community',
    });
    expect(result.level).toBe('yellow');
  });
});

describe('getAreaTrafficLevel', () => {
  it('getAreaTrafficLevel(75) returns GREEN', () => {
    const result = getAreaTrafficLevel(75);
    expect(result.level).toBe('green');
  });

  it('getAreaTrafficLevel(40) returns YELLOW', () => {
    const result = getAreaTrafficLevel(40);
    expect(result.level).toBe('yellow');
  });

  it('getAreaTrafficLevel(10) returns RED', () => {
    const result = getAreaTrafficLevel(10);
    expect(result.level).toBe('red');
  });

  it('getAreaTrafficLevel(null) returns NONE', () => {
    const result = getAreaTrafficLevel(null);
    expect(result.level).toBe('none');
  });
});
