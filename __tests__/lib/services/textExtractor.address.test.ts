/**
 * Address Extraction Tests (TDD)
 *
 * RED Phase: Tests for regex-based street address extraction from Facebook posts.
 * These tests define expected behavior for Phase 1 address extraction.
 *
 * Requirements:
 * - Extract street addresses using regex patterns
 * - Support common suffixes: St, Ave, Blvd, Dr, Rd, Ct, Way, Pl, Cir, Trail, Run, etc.
 * - Support directionals: N, S, E, W, NE, NW, SE, SW (e.g., "123 Main St SE")
 * - Support full addresses: "123 Main St, City, State" format
 * - When no address found → return undefined (triggers confirmation flow)
 * - NO AI fallback for Phase 1
 *
 * Run with: npm test -- --testPathPattern="textExtractor.address"
 */

import { describe, it, expect } from '@jest/globals';
import { extractTextBasedData, type TextBasedData } from '@/lib/services/textExtractor';
import { FACEBOOK_TEST_POSTS } from '../../fixtures/facebook-test-posts';

describe('Address Extraction - TDD RED Phase', () => {
  describe('Real Facebook Posts from Production', () => {
    it('Post 1: extracts full address with city, state, zip from real post', () => {
      const post = FACEBOOK_TEST_POSTS[0];
      const result = extractTextBasedData(post.message!);

      expect(result.location).toBeDefined();
      expect(result.location?.address).toBe(post.expectedAddress);
      expect(result.location?.fuzzy).toBe(post.fuzzy);
    });

    it('Post 2: returns undefined when no street address present (facility name only)', () => {
      const post = FACEBOOK_TEST_POSTS[1];
      const result = extractTextBasedData(post.message!);

      expect(result.location).toBeUndefined();
    });

    it('Post 3: returns undefined for null message', () => {
      const post = FACEBOOK_TEST_POSTS[2];
      const result = extractTextBasedData(post.message!);

      expect(result.location).toBeUndefined();
    });
  });

  describe('Street Address Extraction', () => {
    it('extracts address with Street suffix', () => {
      const result = extractTextBasedData('Find us at 123 Main Street today');
      expect(result.location?.address).toBe('123 Main Street');
    });

    it('extracts address with St abbreviation', () => {
      const result = extractTextBasedData("We're at 456 Oak St");
      expect(result.location?.address).toBe('456 Oak St');
    });

    it('extracts address with Avenue suffix', () => {
      const result = extractTextBasedData('Located at 789 Pine Avenue');
      expect(result.location?.address).toBe('789 Pine Avenue');
    });

    it('extracts address with Ave abbreviation', () => {
      const result = extractTextBasedData('Come find us at 321 Elm Ave');
      expect(result.location?.address).toBe('321 Elm Ave');
    });

    it('extracts address with Boulevard suffix', () => {
      const result = extractTextBasedData('At 555 Main Boulevard');
      expect(result.location?.address).toBe('555 Main Boulevard');
    });

    it('extracts address with Blvd abbreviation', () => {
      const result = extractTextBasedData('At 100 Commerce Blvd');
      expect(result.location?.address).toBe('100 Commerce Blvd');
    });

    it('extracts address with Drive suffix', () => {
      const result = extractTextBasedData('At 200 River Drive');
      expect(result.location?.address).toBe('200 River Drive');
    });

    it('extracts address with Dr abbreviation', () => {
      const result = extractTextBasedData('At 300 Lake Dr');
      expect(result.location?.address).toBe('300 Lake Dr');
    });

    it('extracts address with Road suffix', () => {
      const result = extractTextBasedData('At 400 Valley Road');
      expect(result.location?.address).toBe('400 Valley Road');
    });

    it('extracts address with Rd abbreviation', () => {
      const result = extractTextBasedData('At 500 Mountain Rd');
      expect(result.location?.address).toBe('500 Mountain Rd');
    });

    it('extracts address with Court suffix', () => {
      const result = extractTextBasedData('At 600 Pine Court');
      expect(result.location?.address).toBe('600 Pine Court');
    });

    it('extracts address with Ct abbreviation', () => {
      const result = extractTextBasedData('At 700 Oak Ct');
      expect(result.location?.address).toBe('700 Oak Ct');
    });

    it('extracts address with Way suffix', () => {
      const result = extractTextBasedData('At 800 Market Way');
      expect(result.location?.address).toBe('800 Market Way');
    });

    it('extracts address with Place suffix', () => {
      const result = extractTextBasedData('At 900 Church Place');
      expect(result.location?.address).toBe('900 Church Place');
    });

    it('extracts address with Circle suffix', () => {
      const result = extractTextBasedData('At 150 Commerce Circle');
      expect(result.location?.address).toBe('150 Commerce Circle');
    });

    it('extracts address with Cir abbreviation', () => {
      const result = extractTextBasedData('At 160 Oak Cir');
      expect(result.location?.address).toBe('160 Oak Cir');
    });

    it('extracts address with Trail suffix', () => {
      const result = extractTextBasedData('At 1000 River Trail');
      expect(result.location?.address).toBe('1000 River Trail');
    });

    it('extracts address with Run suffix', () => {
      const result = extractTextBasedData('At 1100 Creek Run');
      expect(result.location?.address).toBe('1100 Creek Run');
    });

    it('extracts address with Lane suffix', () => {
      const result = extractTextBasedData('At 1200 Farm Lane');
      expect(result.location?.address).toBe('1200 Farm Lane');
    });
  });

  describe('Directional Suffixes', () => {
    it('extracts address with N directional', () => {
      const result = extractTextBasedData('At 123 Main St N');
      expect(result.location?.address).toBe('123 Main St N');
    });

    it('extracts address with S directional', () => {
      const result = extractTextBasedData('At 456 Oak Ave S');
      expect(result.location?.address).toBe('456 Oak Ave S');
    });

    it('extracts address with E directional', () => {
      const result = extractTextBasedData('At 789 Pine Rd E');
      expect(result.location?.address).toBe('789 Pine Rd E');
    });

    it('extracts address with W directional', () => {
      const result = extractTextBasedData('At 321 Elm Blvd W');
      expect(result.location?.address).toBe('321 Elm Blvd W');
    });

    it('extracts address with NE directional', () => {
      const result = extractTextBasedData('At 123 Main St NE');
      expect(result.location?.address).toBe('123 Main St NE');
    });

    it('extracts address with NW directional', () => {
      const result = extractTextBasedData('At 456 Commerce St NW');
      expect(result.location?.address).toBe('456 Commerce St NW');
    });

    it('extracts address with SE directional', () => {
      const result = extractTextBasedData('At 789 Market St SE');
      expect(result.location?.address).toBe('789 Market St SE');
    });

    it('extracts address with SW directional', () => {
      const result = extractTextBasedData('At 321 Oak Ave SW');
      expect(result.location?.address).toBe('321 Oak Ave SW');
    });
  });

  describe('Full Address with City/State/Zip', () => {
    it('extracts full address with city, state, and zip', () => {
      const result = extractTextBasedData('123 Main St, Springfield, SC 29000');
      expect(result.location?.address).toBe('123 Main St, Springfield, SC 29000');
      expect(result.location?.fuzzy).toBe(false);
    });

    it('extracts full address with 9-digit zip', () => {
      const result = extractTextBasedData('123 Main St, Denver, CO 80202-1234');
      expect(result.location?.address).toBe('123 Main St, Denver, CO 80202-1234');
      expect(result.location?.fuzzy).toBe(false);
    });

    it('extracts full address with multi-word city name', () => {
      const result = extractTextBasedData('456 Oak Ave, New York, NY 10001');
      expect(result.location?.address).toBe('456 Oak Ave, New York, NY 10001');
      expect(result.location?.fuzzy).toBe(false);
    });

    it('marks street-only address as fuzzy: true', () => {
      const result = extractTextBasedData('123 Main St');
      expect(result.location?.address).toBe('123 Main St');
      expect(result.location?.fuzzy).toBe(true);
    });

    it('marks street+ directional only as fuzzy: true', () => {
      const result = extractTextBasedData('789 Pine St SE');
      expect(result.location?.address).toBe('789 Pine St SE');
      expect(result.location?.fuzzy).toBe(true);
    });
  });

  describe('Cross-Street Intersections', () => {
    it('extracts cross-street intersection with St & Ave', () => {
      const result = extractTextBasedData("We're at Main St & 5th Ave today");
      expect(result.location?.address).toBe('Main St & 5th Ave');
      expect(result.location?.fuzzy).toBe(true);
    });

    it('extracts cross-street intersection with Rd & Blvd', () => {
      const result = extractTextBasedData('Find us at Oak Rd & Pine Blvd');
      expect(result.location?.address).toBe('Oak Rd & Pine Blvd');
      expect(result.location?.fuzzy).toBe(true);
    });

    it('extracts cross-street intersection with full suffixes', () => {
      const result = extractTextBasedData('At Main Street & 1st Avenue');
      expect(result.location?.address).toBe('Main Street & 1st Avenue');
    });
  });

  describe('Negative Cases - Do NOT Extract', () => {
    it('does NOT extract facility names like Target', () => {
      const result = extractTextBasedData('At Target on Main Street');
      expect(result.location).toBeUndefined();
    });

    it('does NOT extract locations without street numbers', () => {
      const result = extractTextBasedData('Corner of Main and Oak');
      expect(result.location).toBeUndefined();
    });

    it('does NOT extract partial words matching street suffix', () => {
      const result = extractTextBasedData('First street tacos');
      expect(result.location).toBeUndefined();
    });

    it('does NOT extract park names', () => {
      const result = extractTextBasedData('At the park on Oak Avenue');
      expect(result.location).toBeUndefined();
    });
  });

  describe('Integration with extractTextBasedData', () => {
    it('extracts location alongside mentions', () => {
      const result = extractTextBasedData('At 123 Main St @John @Jane');
      expect(result.location?.address).toBe('123 Main St');
      expect(result.mentions).toContain('John');
      expect(result.mentions).toContain('Jane');
    });

    it('extracts location alongside hashtags', () => {
      const result = extractTextBasedData('At 456 Oak Ave #foodtruck #aiken');
      expect(result.location?.address).toBe('456 Oak Ave');
      expect(result.hashtags).toContain('foodtruck');
      expect(result.hashtags).toContain('aiken');
    });

    it('extracts location alongside times', () => {
      const result = extractTextBasedData('At 789 Pine Rd open 11am-3pm');
      expect(result.location?.address).toBe('789 Pine Rd');
      expect(result.times?.start).toBeDefined();
      expect(result.times?.end).toBeDefined();
    });
  });
});
