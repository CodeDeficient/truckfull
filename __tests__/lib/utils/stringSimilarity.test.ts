import { describe, it, expect } from '@jest/globals';
import { diceCoefficient } from '@/lib/utils/stringSimilarity';

describe('diceCoefficient', () => {
  it('returns 1 for identical strings', () => {
    expect(diceCoefficient('hello', 'hello')).toBe(1);
  });

  it('returns 1 for identical strings with different case', () => {
    expect(diceCoefficient('Hello', 'hello')).toBe(1);
  });

  it('returns 0 for strings with no common bigrams', () => {
    expect(diceCoefficient('abc', 'xyz')).toBe(0);
  });

  it('returns 0 for strings shorter than 2 characters', () => {
    expect(diceCoefficient('a', 'b')).toBe(0);
  });

  it('returns 0 when one string is empty', () => {
    expect(diceCoefficient('', 'hello')).toBe(0);
  });

  it('returns 0 when both strings are empty', () => {
    expect(diceCoefficient('', '')).toBe(0);
  });

  it('returns high similarity for similar words', () => {
    const score = diceCoefficient('festival', 'festval');
    expect(score).toBeGreaterThan(0.7);
  });

  it('returns moderate similarity for somewhat similar words', () => {
    const score = diceCoefficient('taco', 'tacos');
    expect(score).toBeGreaterThan(0.5);
  });

  it('returns low similarity for different words', () => {
    const score = diceCoefficient('library', 'carnival');
    expect(score).toBeLessThan(0.3);
  });

  it('is symmetric', () => {
    const ab = diceCoefficient('food', 'truck');
    const ba = diceCoefficient('truck', 'food');
    expect(ab).toBe(ba);
  });

  it('handles single-character strings', () => {
    expect(diceCoefficient('x', 'y')).toBe(0);
    expect(diceCoefficient('x', 'x')).toBe(0);
  });

  it('handles words with repeated letters', () => {
    const score = diceCoefficient('bbq', 'bbq');
    expect(score).toBe(1);
  });

  it('detects similarity between misspellings and target', () => {
    const score = diceCoefficient('oktoberfest', 'octoberfest');
    expect(score).toBeGreaterThan(0.5);
  });
});
