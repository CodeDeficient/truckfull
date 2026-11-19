import { describe, it, expect } from '@jest/globals';
import { shouldUpdateData, VALIDATION_CONFIG } from '@/lib/services/postValidator';
import { PostType, type Classification } from '@/lib/services/postClassifier';
import type { ParsedPost, ScheduleScope } from '@/lib/ai/parseFacebookPost';

describe('Schedule Validation', () => {
  const createSchedulePost = (overrides?: Partial<ParsedPost>): ParsedPost => ({
    food_items: [],
    location: undefined,
    times: {
      start: '11:00',
      end: '14:00',
      days: ['monday'],
      scope: 'recurring_weekly',
    },
    confidence: 0.85,
    ...overrides,
  });

  const createScheduleClassification = (overrides?: Partial<Classification>): Classification => ({
    type: PostType.SCHEDULE,
    confidence: 0.85,
    reason: 'Schedule update detected',
    requiresConfirmation: false,
    ...overrides,
  });

  describe('recurring_weekly scope', () => {
    it('should allow update for complete recurring schedule with canonical weekday', () => {
      const result = shouldUpdateData(
        createSchedulePost(),
        createScheduleClassification(),
      );
      expect(result.shouldUpdate).toBe(true);
      expect(result.requiresConfirmation).toBe(false);
    });

    it('should reject recurring schedule missing weekday', () => {
      const result = shouldUpdateData(
        createSchedulePost({ times: { start: '11:00', end: '14:00', days: [], scope: 'recurring_weekly' } }),
        createScheduleClassification(),
      );
      expect(result.shouldUpdate).toBe(false);
      expect(result.reason).toBe('NONCANONICAL_DAYSET_REJECTED');
    });

    it('should reject recurring schedule missing start time', () => {
      const result = shouldUpdateData(
        createSchedulePost({ times: { end: '14:00', days: ['monday'], scope: 'recurring_weekly' } }),
        createScheduleClassification(),
      );
      expect(result.shouldUpdate).toBe(false);
    });

    it('should reject recurring schedule missing end time', () => {
      const result = shouldUpdateData(
        createSchedulePost({ times: { start: '11:00', days: ['monday'], scope: 'recurring_weekly' } }),
        createScheduleClassification(),
      );
      expect(result.shouldUpdate).toBe(false);
    });

    it('rejects equal recurring times with the launch diagnostic', () => {
      const result = shouldUpdateData(
        createSchedulePost({
          times: { start: '11:00', end: '11:00', days: ['monday'], scope: 'recurring_weekly' },
        }),
        createScheduleClassification(),
      );

      expect(result.shouldUpdate).toBe(false);
      expect(result.reason).toBe('DEGENERATE_TIMES_REJECTED');
    });

    it('should accept capitalized weekday "Monday" with recurring_weekly', () => {
      const result = shouldUpdateData(
        createSchedulePost({ times: { start: '11:00', end: '14:00', days: ['Monday'], scope: 'recurring_weekly' } }),
        createScheduleClassification(),
      );
      expect(result.shouldUpdate).toBe(true);
      expect(result.requiresConfirmation).toBe(false);
    });

    it('rejects a recurring schedule when any weekday is non-canonical', () => {
      const result = shouldUpdateData(
        createSchedulePost({
          times: {
            start: '11:00',
            end: '14:00',
            days: ['monday', 'junk'],
            scope: 'recurring_weekly',
          },
        }),
        createScheduleClassification(),
      );

      expect(result.shouldUpdate).toBe(false);
      expect(result.requiresConfirmation).toBe(false);
      expect(result.reason).toBe('NONCANONICAL_DAYSET_REJECTED');
    });

    it('accepts canonical weekday abbreviations used by the writer', () => {
      const result = shouldUpdateData(
        createSchedulePost({
          times: {
            start: '11:00',
            end: '14:00',
            days: ['Mon', 'tue'],
            scope: 'recurring_weekly',
          },
        }),
        createScheduleClassification(),
      );

      expect(result.shouldUpdate).toBe(true);
      expect(result.requiresConfirmation).toBe(false);
    });
  });

  describe('scope_missing scope', () => {
    it('should require confirmation for bare weekday with complete times', () => {
      const result = shouldUpdateData(
        createSchedulePost({ times: { start: '11:00', end: '14:00', days: ['monday'], scope: 'scope_missing' } }),
        createScheduleClassification(),
      );
      expect(result.shouldUpdate).toBe(false);
      expect(result.requiresConfirmation).toBe(true);
      expect(result.reason).toContain('confirmation');
    });

    it('should reject bare weekday with incomplete times', () => {
      const result = shouldUpdateData(
        createSchedulePost({ times: { start: '11:00', days: ['monday'], scope: 'scope_missing' } }),
        createScheduleClassification(),
      );
      expect(result.shouldUpdate).toBe(false);
      expect(result.requiresConfirmation).toBe(false);
      expect(result.reason).toContain('incomplete');
    });

    it('should reject bare time with no weekday', () => {
      const result = shouldUpdateData(
        createSchedulePost({ times: { start: '11:00', end: '14:00', days: undefined, scope: 'scope_missing' } }),
        createScheduleClassification(),
      );
      expect(result.shouldUpdate).toBe(false);
      expect(result.requiresConfirmation).toBe(false);
      expect(result.reason).toContain('no weekday');
    });

    it('should reject bare time with non-canonical weekday', () => {
      const result = shouldUpdateData(
        createSchedulePost({ times: { start: '11:00', end: '14:00', days: ['today'], scope: 'scope_missing' } }),
        createScheduleClassification(),
      );
      expect(result.shouldUpdate).toBe(false);
      expect(result.requiresConfirmation).toBe(false);
      expect(result.reason).toBe('NONCANONICAL_DAYSET_REJECTED');
    });

    it('should require confirmation for capitalized weekday with scope_missing', () => {
      const result = shouldUpdateData(
        createSchedulePost({ times: { start: '11:00', end: '14:00', days: ['Monday'], scope: 'scope_missing' } }),
        createScheduleClassification(),
      );
      expect(result.shouldUpdate).toBe(false);
      expect(result.requiresConfirmation).toBe(true);
      expect(result.reason).toContain('confirmation');
    });
  });

  describe('one_off_unsupported scope', () => {
    it('should reject one-off date-specific schedule', () => {
      const result = shouldUpdateData(
        createSchedulePost({ times: { start: '11:00', end: '14:00', days: ['today'], scope: 'one_off_unsupported' } }),
        createScheduleClassification(),
      );
      expect(result.shouldUpdate).toBe(false);
      expect(result.requiresConfirmation).toBe(false);
      expect(result.reason).toContain('not yet supported');
    });
  });

  describe('one_off_date scope', () => {
    const datedPost = createSchedulePost({
      times: {
        start: '11:00',
        end: '14:00',
        dateReference: 'today',
        scope: 'one_off_date',
      },
    });

    it('routes a resolvable dated schedule with no location to owner review', () => {
      const result = shouldUpdateData(datedPost, createScheduleClassification(), {
        createdAt: '2026-08-03T15:00:00.000Z',
        timezone: 'America/New_York',
      });

      expect(result.shouldUpdate).toBe(false);
      expect(result.requiresConfirmation).toBe(false);
      expect(result.reviewRequired).toBe(true);
      expect(result.reviewAction).toBe('missing_location');
      expect(result.resolvedServiceDate).toBe('2026-08-03');
    });

    it('auto-applies a resolvable dated schedule with complete hours and an exact location', () => {
      const result = shouldUpdateData(
        createSchedulePost({
          location: { address: '1201 Knox Ave, North Augusta, SC', fuzzy: false },
          times: {
            start: '11:00',
            end: '14:00',
            dateReference: 'today',
            scope: 'one_off_date',
          },
        }),
        createScheduleClassification(),
        { createdAt: '2026-08-03T15:00:00.000Z', timezone: 'America/New_York' },
      );

      expect(result.shouldUpdate).toBe(true);
      expect(result.requiresConfirmation).toBe(false);
      expect(result.resolvedServiceDate).toBe('2026-08-03');
    });

    it('routes a dated schedule with a fuzzy location to owner review', () => {
      const result = shouldUpdateData(
        createSchedulePost({
          location: { address: 'the corner lot downtown', fuzzy: true },
          times: {
            start: '11:00',
            end: '14:00',
            dateReference: 'today',
            scope: 'one_off_date',
          },
        }),
        createScheduleClassification(),
        { createdAt: '2026-08-03T15:00:00.000Z', timezone: 'America/New_York' },
      );

      expect(result.shouldUpdate).toBe(false);
      expect(result.requiresConfirmation).toBe(false);
      expect(result.reviewRequired).toBe(true);
      expect(result.reviewAction).toBe('ambiguous_location');
      expect(result.resolvedServiceDate).toBe('2026-08-03');
    });

    it('routes a dated schedule with no location to owner review for location entry', () => {
      const result = shouldUpdateData(
        createSchedulePost({
          location: undefined,
          times: {
            start: '11:00',
            end: '14:00',
            dateReference: 'today',
            scope: 'one_off_date',
          },
        }),
        createScheduleClassification(),
        { createdAt: '2026-08-03T15:00:00.000Z', timezone: 'America/New_York' },
      );

      expect(result.shouldUpdate).toBe(false);
      expect(result.reviewRequired).toBe(true);
      expect(result.reviewAction).toBe('missing_location');
      expect(result.resolvedServiceDate).toBe('2026-08-03');
    });

    it('routes an unresolvable dated schedule to owner review for date resolution', () => {
      const result = shouldUpdateData(
        createSchedulePost({
          times: {
            start: '11:00',
            end: '14:00',
            dateReference: 'sometime next season',
            scope: 'one_off_date',
          },
        }),
        createScheduleClassification(),
        { createdAt: '2026-08-03T15:00:00.000Z', timezone: 'America/New_York' },
      );

      expect(result.shouldUpdate).toBe(false);
      expect(result.requiresConfirmation).toBe(false);
      expect(result.reviewRequired).toBe(true);
      expect(result.reviewAction).toBe('unresolved_schedule');
    });

    it('auto-applies the live post shape when location is exact and date resolves', () => {
      const result = shouldUpdateData(
        createSchedulePost({
          location: { address: '1201 Knox Ave, North Augusta, SC', fuzzy: false },
          times: {
            start: '11:00',
            end: '20:00',
            dateReference: 'today',
            dateReferences: ['today', 'Tuesday', 'August 25, 2026'],
            scope: 'one_off_date',
          },
        }),
        createScheduleClassification(),
        { createdAt: '2026-08-25T16:00:00.000Z', timezone: 'America/New_York' },
      );

      expect(result.shouldUpdate).toBe(true);
      expect(result.requiresConfirmation).toBe(false);
      expect(result.resolvedServiceDate).toBe('2026-08-25');
    });

    it('rejects a dated schedule whose weekday disagrees with its explicit date', () => {
      const result = shouldUpdateData(
        createSchedulePost({
          location: { address: '1201 Knox Ave, North Augusta, SC', fuzzy: false },
          times: {
            start: '11:00',
            end: '20:00',
            dateReference: 'Tuesday',
            dateReferences: ['Tuesday', 'August 26, 2026'],
            scope: 'one_off_date',
          },
        }),
        createScheduleClassification(),
        { createdAt: '2026-08-25T16:00:00.000Z', timezone: 'America/New_York' },
      );

      expect(result.shouldUpdate).toBe(false);
      expect(result.requiresConfirmation).toBe(false);
      expect(result.reviewRequired).toBe(true);
      expect(result.reviewAction).toBe('unresolved_schedule');
      expect(result.reason).toContain('conflicting service dates');
    });

    it('routes a dated schedule with no resolution metadata to owner review', () => {
      const result = shouldUpdateData(datedPost, createScheduleClassification());

      expect(result.shouldUpdate).toBe(false);
      expect(result.requiresConfirmation).toBe(false);
      expect(result.reviewRequired).toBe(true);
      expect(result.reviewAction).toBe('unresolved_schedule');
      expect(result.reason).toContain('Missing date reference');
    });

    it('falls back to the singular date reference when aliases are empty', () => {
      const result = shouldUpdateData(
        createSchedulePost({
          location: { address: '1201 Knox Ave, North Augusta, SC', fuzzy: false },
          times: {
            start: '11:00',
            end: '14:00',
            dateReference: 'today',
            dateReferences: [],
            scope: 'one_off_date',
          },
        }),
        createScheduleClassification(),
        { createdAt: '2026-08-03T15:00:00.000Z', timezone: 'America/New_York' },
      );

      expect(result.shouldUpdate).toBe(true);
      expect(result.requiresConfirmation).toBe(false);
      expect(result.resolvedServiceDate).toBe('2026-08-03');
    });

    it('rejects a dated schedule when the timezone is invalid', () => {
      const result = shouldUpdateData(datedPost, createScheduleClassification(), {
        createdAt: '2026-08-03T15:00:00.000Z',
        timezone: 'Invalid/Timezone',
      });

      expect(result.shouldUpdate).toBe(false);
      expect(result.requiresConfirmation).toBe(false);
      expect(result.reason).toContain('Invalid timezone');
    });

    it('routes a dated schedule without complete times to owner review', () => {
      const result = shouldUpdateData(
        createSchedulePost({
          times: { dateReference: 'today', scope: 'one_off_date', start: '11:00' },
        }),
        createScheduleClassification(),
        { createdAt: '2026-08-03T15:00:00.000Z', timezone: 'America/New_York' },
      );

      expect(result.shouldUpdate).toBe(false);
      expect(result.requiresConfirmation).toBe(false);
      expect(result.reviewRequired).toBe(true);
      expect(result.reviewAction).toBe('unresolved_schedule');
      expect(result.reason).toContain('complete times');
    });
  });

  describe('no scope (undefined)', () => {
    it('should treat scoped times like scope_missing', () => {
      const result = shouldUpdateData(
        createSchedulePost({ times: { start: '11:00', end: '14:00', days: ['monday'] } }),
        createScheduleClassification(),
      );
      expect(result.shouldUpdate).toBe(false);
      expect(result.requiresConfirmation).toBe(true);
      expect(result.reason).toContain('confirmation');
    });

    it('should reject scoped times with incomplete times', () => {
      const result = shouldUpdateData(
        createSchedulePost({ times: { start: '11:00', days: ['monday'] } }),
        createScheduleClassification(),
      );
      expect(result.shouldUpdate).toBe(false);
      expect(result.requiresConfirmation).toBe(false);
    });

    it('should reject scoped times with no weekday', () => {
      const result = shouldUpdateData(
        createSchedulePost({ times: { start: '11:00', end: '14:00' } }),
        createScheduleClassification(),
      );
      expect(result.shouldUpdate).toBe(false);
      expect(result.requiresConfirmation).toBe(false);
      expect(result.reason).toContain('no weekday');
    });
  });

  describe('invalid scope', () => {
    it('should reject invalid scope with complete times and weekday', () => {
      const result = shouldUpdateData(
        createSchedulePost({ times: { start: '11:00', end: '14:00', days: ['monday'], scope: 'invalid' as string as ScheduleScope } }),
        createScheduleClassification(),
      );
      expect(result.shouldUpdate).toBe(false);
      expect(result.reason).toContain('unrecognized scope');
    });

    it('should reject invalid scope with incomplete times', () => {
      const result = shouldUpdateData(
        createSchedulePost({ times: { start: '11:00', days: ['monday'], scope: 'invalid' as string as ScheduleScope } }),
        createScheduleClassification(),
      );
      expect(result.shouldUpdate).toBe(false);
      expect(result.reason).toContain('unrecognized scope');
    });

    it('should reject MIXED post with invalid scope schedule component', () => {
      const result = shouldUpdateData(
        createSchedulePost({
          food_items: ['Tacos $5'],
          times: { start: '11:00', end: '14:00', days: ['monday'], scope: 'invalid' as string as ScheduleScope },
        }),
        { type: PostType.MIXED, confidence: 0.85, reason: 'Mixed update', requiresConfirmation: false },
      );
      expect(result.shouldUpdate).toBe(false);
      expect(result.reason).toContain('unrecognized scope');
    });

    it('should fall through for invalid scope with no schedule data', () => {
      const result = shouldUpdateData(
        createSchedulePost({ times: { scope: 'invalid' as string as ScheduleScope } }),
        createScheduleClassification(),
      );
      expect(result.shouldUpdate).toBe(false);
      expect(result.reason).toContain('No valid data to update');
    });
  });

  describe('MIXED with schedule component', () => {
    it('should block MIXED post with non-applicable one-off schedule', () => {
      const result = shouldUpdateData(
        createSchedulePost({
          food_items: ['Tacos $5'],
          times: { start: '11:00', end: '14:00', days: ['today'], scope: 'one_off_unsupported' },
        }),
        { type: PostType.MIXED, confidence: 0.85, reason: 'Mixed update', requiresConfirmation: false },
      );
      expect(result.shouldUpdate).toBe(false);
    });

    it('should block MIXED post with confirmation-required schedule', () => {
      const result = shouldUpdateData(
        createSchedulePost({
          food_items: ['Tacos $5'],
          times: { start: '11:00', end: '14:00', days: ['monday'], scope: 'scope_missing' },
        }),
        { type: PostType.MIXED, confidence: 0.85, reason: 'Mixed update', requiresConfirmation: false },
      );
      expect(result.shouldUpdate).toBe(false);
      expect(result.requiresConfirmation).toBe(true);
    });

    it('should allow MIXED post with valid recurring schedule to pass through', () => {
      const result = shouldUpdateData(
        createSchedulePost({
          food_items: ['Tacos $5'],
          location: { address: '1201 Knox Ave, North Augusta, SC', fuzzy: false },
          times: { start: '11:00', end: '14:00', days: ['monday'], scope: 'recurring_weekly' },
        }),
        { type: PostType.MIXED, confidence: 0.85, reason: 'Mixed update', requiresConfirmation: false },
      );
      expect(result.shouldUpdate).toBe(true);
      expect(result.requiresConfirmation).toBe(false);
    });

    it('routes MIXED post with a valid recurring schedule but no location to owner review', () => {
      const result = shouldUpdateData(
        createSchedulePost({
          food_items: ['Tacos $5'],
          times: { start: '11:00', end: '14:00', days: ['monday'], scope: 'recurring_weekly' },
        }),
        { type: PostType.MIXED, confidence: 0.85, reason: 'Mixed update', requiresConfirmation: false },
      );
      expect(result.shouldUpdate).toBe(false);
      expect(result.reviewRequired).toBe(true);
      expect(result.reviewAction).toBe('missing_location');
    });
  });

  describe('low confidence behavior', () => {
    it('should reject schedule post with confidence below minimum', () => {
      const result = shouldUpdateData(
        createSchedulePost({ confidence: 0.3 }),
        createScheduleClassification({ confidence: 0.3 }),
      );
      expect(result.shouldUpdate).toBe(false);
    });

    it('should require confirmation for schedule post with medium confidence', () => {
      const result = shouldUpdateData(
        createSchedulePost({ confidence: 0.6 }),
        createScheduleClassification({ confidence: 0.6 }),
      );
      expect(result.shouldUpdate).toBe(true);
      expect(result.requiresConfirmation).toBe(true);
    });
  });

  describe('one-off schedule with unsupported cadence is rejected', () => {
    it('should reject low-confidence one-off schedule with unsupported cadence', () => {
      const result = shouldUpdateData(
        createSchedulePost({ times: { start: '11:00', end: '14:00', days: ['today'], scope: 'one_off_unsupported' }, confidence: 0.3 }),
        createScheduleClassification({ confidence: 0.3 }),
      );
      expect(result.shouldUpdate).toBe(false);
      expect(result.requiresConfirmation).toBe(false);
      expect(result.reason).toContain('not yet supported');
    });

    it('should reject medium-confidence one-off schedule with unsupported cadence', () => {
      const result = shouldUpdateData(
        createSchedulePost({ times: { start: '11:00', end: '14:00', days: ['today'], scope: 'one_off_unsupported' }, confidence: 0.6 }),
        createScheduleClassification({ confidence: 0.6 }),
      );
      expect(result.shouldUpdate).toBe(false);
      expect(result.requiresConfirmation).toBe(false);
      expect(result.reason).toContain('not yet supported');
    });

    it('should reject low-confidence MIXED post with unsupported cadence', () => {
      const result = shouldUpdateData(
        createSchedulePost({
          food_items: ['Tacos $5'],
          times: { start: '11:00', end: '14:00', days: ['today'], scope: 'one_off_unsupported' },
          confidence: 0.3,
        }),
        { type: PostType.MIXED, confidence: 0.3, reason: 'Mixed update', requiresConfirmation: false },
      );
      expect(result.shouldUpdate).toBe(false);
      expect(result.requiresConfirmation).toBe(false);
    });
  });
});
