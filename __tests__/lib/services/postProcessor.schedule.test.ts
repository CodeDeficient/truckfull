import { describe, expect, it } from '@jest/globals';
import { PostType } from '@/lib/services/postClassifier';
import {
  buildConfirmationProposedData,
  buildRegexParsedPost,
} from '@/lib/services/postProcessor';
import { shouldUpdateData } from '@/lib/services/postValidator';
import { extractTextBasedData } from '@/lib/services/textExtractor';
import type { ParsedPost } from '@/lib/ai/parseFacebookPost';
import type { ValidationResult } from '@/lib/services/postValidator';

describe('buildRegexParsedPost', () => {
  it('preserves date references from deterministic extraction', () => {
    const result = buildRegexParsedPost({
      times: {
        start: '11:00',
        end: '14:00',
        dateReference: 'this Friday',
        scope: 'one_off_date',
      },
    });

    expect(result.times).toEqual({
      start: '11:00',
      end: '14:00',
      dateReference: 'this Friday',
      scope: 'one_off_date',
    });
  });

  it('routes the exact live post through dated auto-application when location is exact', () => {
    const parsedPost = buildRegexParsedPost(
      extractTextBasedData(
        'TruckFull test — Open today, Tuesday August 25, 2026, 11:00 AM–8:00 PM at 1201 Knox Ave, North Augusta, SC 29841',
      ),
    );
    const result = shouldUpdateData(
      parsedPost,
      {
        type: PostType.MIXED,
        confidence: 0.75,
        reason: 'Mixed update: location times detected',
        requiresConfirmation: false,
      },
      { createdAt: '2026-08-25T16:00:00.000Z', timezone: 'America/New_York' },
    );

    expect(parsedPost.times?.scope).toBe('one_off_date');
    expect(result.shouldUpdate).toBe(true);
    expect(result.requiresConfirmation).toBe(false);
    expect(result.resolvedServiceDate).toBe('2026-08-25');
  });
});

describe('buildConfirmationProposedData', () => {
  it('preserves the resolved service date for later confirmation application', () => {
    const parsedPost: ParsedPost = {
      food_items: [],
      times: {
        start: '11:00',
        end: '14:00',
        dateReference: 'today',
        scope: 'one_off_date',
      },
      confidence: 0.85,
    };
    const validation: ValidationResult = {
      shouldUpdate: false,
      requiresConfirmation: true,
      resolvedServiceDate: '2026-08-03',
      reason: 'Date-specific schedule requires confirmation before application',
    };

    const result = buildConfirmationProposedData(parsedPost, {
      type: PostType.SCHEDULE,
      confidence: 0.85,
      reason: 'Schedule update detected',
      requiresConfirmation: false,
    }, validation);

    expect(result.serviceDate).toBe('2026-08-03');
    expect(result.times).toEqual(parsedPost.times);
  });

  it('preserves dated location data alongside the resolved schedule', () => {
    const result = buildConfirmationProposedData(
      {
        food_items: [],
        location: { address: '1201 Knox Ave, North Augusta, SC', fuzzy: false },
        times: {
          start: '11:00',
          end: '20:00',
          dateReference: 'today',
          dateReferences: ['today', 'Tuesday', 'August 25, 2026'],
          scope: 'one_off_date',
        },
        confidence: 0.85,
      },
      {
        type: PostType.MIXED,
        confidence: 0.85,
        reason: 'Mixed update',
        requiresConfirmation: false,
      },
      {
        shouldUpdate: false,
        requiresConfirmation: false,
        reviewRequired: true,
        reviewAction: 'ambiguous_location',
        resolvedServiceDate: '2026-08-25',
        reason: 'Date-specific schedule has an ambiguous service location',
      },
    );

    expect(result.location).toEqual({
      address: '1201 Knox Ave, North Augusta, SC',
      fuzzy: false,
    });
    expect(result.serviceDate).toBe('2026-08-25');
  });
});
