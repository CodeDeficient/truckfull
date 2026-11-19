import { describe, it, expect } from '@jest/globals';
import { extractTextBasedData, hasFoodSignal } from '@/lib/services/textExtractor';

describe('Text Extractor Service', () => {
  describe('Edge Cases', () => {
    it('returns empty object for null input', () => {
      // @ts-expect-error - Testing invalid input
      const result = extractTextBasedData(null);
      expect(result).toEqual({});
    });

    it('returns empty object for undefined input', () => {
      // @ts-expect-error - Testing invalid input
      const result = extractTextBasedData(undefined);
      expect(result).toEqual({});
    });

    it('returns empty object for empty string', () => {
      const result = extractTextBasedData('');
      expect(result).toEqual({});
    });

    it('returns empty object for non-string input', () => {
      // @ts-expect-error - Testing invalid input
      const result = extractTextBasedData(123);
      expect(result).toEqual({});
    });
  });

  describe('Mentions Extraction', () => {
    it('extracts a single mention', () => {
      const result = extractTextBasedData('Hello @world!');
      expect(result.mentions).toEqual(['world']);
    });

    it('extracts multiple mentions', () => {
      const result = extractTextBasedData('Hello @world, meet @universe');
      expect(result.mentions).toEqual(['world', 'universe']);
    });

    it('deduplicates mentions', () => {
      const result = extractTextBasedData('Hello @world, hello @world');
      expect(result.mentions).toEqual(['world']);
    });

    it('returns empty array when no mentions are present', () => {
      const result = extractTextBasedData('Hello world!');
      expect(result.mentions).toEqual([]);
    });
  });

  describe('Hashtags Extraction', () => {
    it('extracts a single hashtag', () => {
      const result = extractTextBasedData('Loving this #food!');
      expect(result.hashtags).toEqual(['food']);
    });

    it('extracts multiple hashtags', () => {
      const result = extractTextBasedData('Loving this #food #truck!');
      expect(result.hashtags).toEqual(['food', 'truck']);
    });

    it('deduplicates hashtags', () => {
      const result = extractTextBasedData('Loving this #food, really good #food');
      expect(result.hashtags).toEqual(['food']);
    });

    it('returns empty array when no hashtags are present', () => {
      const result = extractTextBasedData('Loving this food!');
      expect(result.hashtags).toEqual([]);
    });
  });

  describe('Times and Days Extraction', () => {
    it('extracts time range with "to"', () => {
      const result = extractTextBasedData('We are open 7:30am to 11:30am');
      expect(result.times).toEqual({
        start: '07:30',
        end: '11:30',
        days: undefined,
        scope: 'scope_missing',
      });
    });

    it('extracts time range with hyphen', () => {
      const result = extractTextBasedData('We are open 7:30am-11:30am');
      expect(result.times).toEqual({
        start: '07:30',
        end: '11:30',
        days: undefined,
        scope: 'scope_missing',
      });
    });

    it('extracts simple time range without minutes', () => {
      const result = extractTextBasedData('We are open 7am-11am');
      expect(result.times).toEqual({
        start: '07:00',
        end: '11:00',
        days: undefined,
        scope: 'scope_missing',
      });
    });

    it('normalizes times properly with am/pm', () => {
      const result = extractTextBasedData('We are open 1pm to 5pm');
      expect(result.times).toEqual({
        start: '13:00',
        end: '17:00',
        days: undefined,
        scope: 'scope_missing',
      });
    });

    it('extracts casual format "11a-2pm"', () => {
      const result = extractTextBasedData('We are open 11a-2pm');
      expect(result.times).toEqual({
        start: '11:00',
        end: '14:00',
        days: undefined,
        scope: 'scope_missing',
      });
    });

    it('corrects asymmetric pm range "11-2pm"', () => {
      const result = extractTextBasedData('We are open 11-2pm');
      expect(result.times).toEqual({
        start: '11:00',
        end: '14:00',
        days: undefined,
        scope: 'scope_missing',
      });
    });

    it('corrects asymmetric pm range "9-5pm"', () => {
      const result = extractTextBasedData('We are open 9-5pm');
      expect(result.times).toEqual({
        start: '09:00',
        end: '17:00',
        days: undefined,
        scope: 'scope_missing',
      });
    });

    it('corrects asymmetric pm range "10-1pm"', () => {
      const result = extractTextBasedData('We are open 10-1pm');
      expect(result.times).toEqual({
        start: '10:00',
        end: '13:00',
        days: undefined,
        scope: 'scope_missing',
      });
    });

    it('corrects asymmetric pm range "7-3pm"', () => {
      const result = extractTextBasedData('We are open 7-3pm');
      expect(result.times).toEqual({
        start: '07:00',
        end: '15:00',
        days: undefined,
        scope: 'scope_missing',
      });
    });

    it('preserves "2-5pm" as 14:00-17:00 (start < end, no correction)', () => {
      const result = extractTextBasedData('We are open 2-5pm');
      expect(result.times).toEqual({
        start: '14:00',
        end: '17:00',
        days: undefined,
        scope: 'scope_missing',
      });
    });

    it('corrects asymmetric am range "11-5am" to 23:00-05:00', () => {
      const result = extractTextBasedData('We are open 11-5am');
      expect(result.times).toEqual({
        start: '23:00',
        end: '05:00',
        days: undefined,
        scope: 'scope_missing',
      });
    });

    it('preserves "8-11am" as 08:00-11:00 (start < end, no correction)', () => {
      const result = extractTextBasedData('We are open 8-11am');
      expect(result.times).toEqual({
        start: '08:00',
        end: '11:00',
        days: undefined,
        scope: 'scope_missing',
      });
    });

    it('handles 12pm (noon) correctly', () => {
      const result = extractTextBasedData('Open 12pm to 1pm');
      expect(result.times).toEqual({
        start: '12:00',
        end: '13:00',
        days: undefined,
        scope: 'scope_missing',
      });
    });

    it('handles 12am (midnight) correctly', () => {
      const result = extractTextBasedData('Open 12am to 1am');
      expect(result.times).toEqual({
        start: '00:00',
        end: '01:00',
        days: undefined,
        scope: 'scope_missing',
      });
    });

    it('handles 24-hour format input', () => {
      const result = extractTextBasedData('Open 14:00-22:00');
      expect(result.times).toEqual({
        start: '14:00',
        end: '22:00',
        days: undefined,
        scope: 'scope_missing',
      });
    });

    it('extracts days when present', () => {
      const result = extractTextBasedData('We are open Monday 7:30am to 11:30am');
      expect(result.times).toEqual({
        start: '07:30',
        end: '11:30',
        days: ['monday'],
        scope: 'scope_missing',
      });
    });

    it('extracts multiple days when present', () => {
      const result = extractTextBasedData('We are open today and tomorrow 7:30am to 11:30am');
      expect(result.times).toEqual({
        start: '07:30',
        end: '11:30',
        dateReferences: ['today', 'tomorrow'],
        scope: 'one_off_date',
      });
    });

    it('preserves a single relative date reference', () => {
      const result = extractTextBasedData('We are here today 7:30am to 11:30am');
      expect(result.times).toEqual({
        start: '07:30',
        end: '11:30',
        dateReference: 'today',
        scope: 'one_off_date',
      });
    });

    it('deduplicates days', () => {
      const result = extractTextBasedData('Open Mon and Monday 7am-11am');
      expect(result.times).toEqual({
        start: '07:00',
        end: '11:00',
        days: ['monday'],
        scope: 'scope_missing',
      });
    });

    it('returns undefined for times when no times are present', () => {
      const result = extractTextBasedData('We are open soon');
      expect(result.times).toBeUndefined();
    });
  });

  describe('Schedule Scope Detection', () => {
    it('detects recurring_weekly for "every" day pattern', () => {
      const result = extractTextBasedData('We are open every Monday 11am-2pm');
      expect(result.times?.scope).toBe('recurring_weekly');
    });

    it('detects recurring_weekly for plural weekday', () => {
      const result = extractTextBasedData('We are open Mondays 11am-2pm');
      expect(result.times?.scope).toBe('recurring_weekly');
    });

    it('detects recurring_weekly for "weekly on"', () => {
      const result = extractTextBasedData('Weekly on Friday 11am-2pm');
      expect(result.times?.scope).toBe('recurring_weekly');
    });

    it('detects recurring_weekly for "our Monday hours"', () => {
      const result = extractTextBasedData('These are our Monday hours: 11am-2pm');
      expect(result.times?.scope).toBe('recurring_weekly');
    });

    it('detects recurring_weekly for weekday ranges', () => {
      expect(extractTextBasedData('Monday to Friday 11am-2pm').times?.scope).toBe('recurring_weekly');
      expect(extractTextBasedData('Mon-Fri 11am-2pm').times?.scope).toBe('recurring_weekly');
      expect(extractTextBasedData('Tues-Thurs 11am-2pm').times?.scope).toBe('recurring_weekly');
    });

    it('detects recurring_weekly for daily and weekend schedules', () => {
      expect(extractTextBasedData('Open daily 11am-2pm').times?.scope).toBe('recurring_weekly');
      expect(extractTextBasedData('Open daily 11am-2pm').times?.days).toHaveLength(7);
      expect(extractTextBasedData('Open every day 11am-2pm').times?.days).toHaveLength(7);
      expect(extractTextBasedData('Open every weekday 11am-2pm').times?.days).toEqual([
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
      ]);
      expect(extractTextBasedData('Open every weekend 11am-2pm').times?.scope).toBe('recurring_weekly');
      expect(extractTextBasedData('Open every Tues 11am-2pm').times?.scope).toBe('recurring_weekly');
      expect(extractTextBasedData('Open every Tues 11am-2pm').times?.days).toEqual(['tuesday']);
      expect(extractTextBasedData('Open every weekend, serving fried chicken 11am-2pm').times?.days).toEqual([
        'saturday',
        'sunday',
      ]);
      expect(extractTextBasedData('Every other Friday 11am-2pm').times?.scope).toBe('one_off_unsupported');
      expect(extractTextBasedData('Every other Fri 11am-2pm').times?.scope).toBe('one_off_unsupported');
      expect(extractTextBasedData('Every other month 11am-2pm').times?.scope).toBe('one_off_unsupported');
      expect(extractTextBasedData('Every other customer gets a discount 11am-2pm').times?.scope).not.toBe('one_off_unsupported');
    });

    it('does not treat dated weekday ranges as recurring', () => {
      for (const text of [
        'This Friday through Sunday',
        'This Friday to Sunday',
        'This Fri-Sun',
        'This Tues-Thurs',
        'This Friday through Sun',
        'This Mon to Friday',
      ]) {
        expect(extractTextBasedData(`${text} 11am-2pm`).times?.scope).toBe('one_off_unsupported');
      }
    });

    it('does not treat menu language as recurring scope', () => {
      for (const text of [
        "Today's daily special",
        "Today's daily specials",
        'Weekly deals',
        'Daily Friday special',
      ]) {
        const result = extractTextBasedData(`${text} 11am-2pm`);
        expect(result.times?.scope).not.toBe('recurring_weekly');
        expect(result.times?.days?.length ?? 0).not.toBe(7);
      }
      expect(extractTextBasedData('Daily special every Friday 11am-2pm').times?.days).toEqual(['friday']);
    });

    it('detects one_off_date for "today"', () => {
      const result = extractTextBasedData('We are here today 11am-2pm');
      expect(result.times?.scope).toBe('one_off_date');
      expect(result.times?.dateReference).toBe('today');
    });

    it('detects one_off_date for multiple date candidates', () => {
      const result = extractTextBasedData('Open today and tomorrow 11am-2pm');
      expect(result.times?.scope).toBe('one_off_date');
    });

    it('detects one_off_date for "tomorrow"', () => {
      const result = extractTextBasedData('We are here tomorrow 11am-2pm');
      expect(result.times?.scope).toBe('one_off_date');
      expect(result.times?.dateReference).toBe('tomorrow');
    });

    it('detects and preserves a weekday date reference', () => {
      const result = extractTextBasedData('We are here this Friday 11am-2pm');
      expect(result.times?.scope).toBe('one_off_date');
      expect(result.times?.dateReference).toBe('this Friday');
    });

    it('preserves all date candidates without treating aliases as a conflict', () => {
      const result = extractTextBasedData(
        'Open today, Tuesday August 25, 2026, 11am-8pm at 1201 Knox Ave',
      );
      expect(result.times?.scope).toBe('one_off_date');
      expect(result.times?.dateReferences).toEqual(['today', 'Tuesday', 'August 25, 2026']);
    });

    it('preserves a bare weekday as a constraint alongside an explicit date', () => {
      const result = extractTextBasedData('Open Tuesday, August 25 11am-8pm');
      expect(result.times?.dateReferences).toEqual(['Tuesday', 'August 25']);
    });

    it('preserves a weekday that follows an explicit date before schedule times', () => {
      const result = extractTextBasedData('Open August 25, Tuesday 11am-8pm');
      expect(result.times?.dateReferences).toEqual(['August 25', 'Tuesday']);
      const fromResult = extractTextBasedData('Open August 25, Tuesday from 11am-8pm');
      expect(fromResult.times?.dateReferences).toEqual(['August 25', 'Tuesday']);
      const parenthesizedResult = extractTextBasedData('Open August 25 (Tuesday) 11am-8pm');
      expect(parenthesizedResult.times?.dateReferences).toEqual(['August 25', 'Tuesday']);
    });

    it('preserves an abbreviated weekday as a constraint alongside an explicit date', () => {
      const result = extractTextBasedData('Open Tue, August 25 11am-8pm');
      expect(result.times?.dateReferences).toEqual(['Tue', 'August 25']);
    });

    it('preserves extended weekday abbreviations as constraints', () => {
      const result = extractTextBasedData('Open Tues, August 25 11am-8pm');
      expect(result.times?.dateReferences).toEqual(['Tues', 'August 25']);
    });

    it('ignores incidental weekdays in address and menu text', () => {
      const addressResult = extractTextBasedData('Open today at 1201 Monday Ave 11am-8pm');
      const menuResult = extractTextBasedData('Open today, serving Friday specials 11am-8pm');
      expect(addressResult.times?.dateReference).toBe('today');
      expect(addressResult.times?.dateReferences).toBeUndefined();
      expect(menuResult.times?.dateReference).toBe('today');
      expect(menuResult.times?.dateReferences).toBeUndefined();
      const relativeWeekdayResult = extractTextBasedData('Open today, Monday 11am-8pm');
      expect(relativeWeekdayResult.times?.dateReferences).toEqual(['today', 'Monday']);
      const calendarMenuResult = extractTextBasedData('Open July 4, Friday specials 11am-8pm');
      expect(calendarMenuResult.times?.dateReference).toBe('July 4');
      expect(calendarMenuResult.times?.dateReferences).toBeUndefined();
      const datedMenuResult = extractTextBasedData(
        'Open today at 1201 Knox Ave — July 4th specials, 11am-8pm',
      );
      expect(datedMenuResult.times?.dateReference).toBe('today');
      expect(datedMenuResult.times?.dateReferences).toBeUndefined();
      const standalonePromotionResult = extractTextBasedData('July 4th specials: open 11am-8pm');
      expect(standalonePromotionResult.times?.dateReference).toBe('July 4th');
      const menuAfterAliasResult = extractTextBasedData('Tuesday, August 25 menu 11am-2pm');
      expect(menuAfterAliasResult.times?.dateReference).toBe('August 25');
      expect(menuAfterAliasResult.times?.dateReferences).toBeUndefined();
    });

    it('does NOT detect one_off_unsupported for possessive "Today\'s"', () => {
      const result = extractTextBasedData("Today's special: tacos 11am-2pm");
      expect(result.times?.scope).not.toBe('one_off_unsupported');
    });

    it('does NOT detect one_off_unsupported for possessive "tomorrow\'s"', () => {
      const result = extractTextBasedData("tomorrow's hours 11am-2pm");
      expect(result.times?.scope).not.toBe('one_off_unsupported');
    });

    it('detects one_off_date for month/day date', () => {
      const result = extractTextBasedData('July 4 11am-2pm');
      expect(result.times?.scope).toBe('one_off_date');
      expect(result.times?.dateReference).toBe('July 4');
    });

    it('detects one_off_date for ordinal date "July 4th"', () => {
      const result = extractTextBasedData('July 4th 11am-2pm');
      expect(result.times?.scope).toBe('one_off_date');
      expect(result.times?.dateReference).toBe('July 4th');
    });

    it('detects one_off_date for ordinal date "December 24th"', () => {
      const result = extractTextBasedData('December 24th 11am-2pm');
      expect(result.times?.scope).toBe('one_off_date');
      expect(result.times?.dateReference).toBe('December 24th');
    });

    it('detects one_off_date for abbreviated month "Jul 4"', () => {
      const result = extractTextBasedData('Jul 4 11am-2pm');
      expect(result.times?.scope).toBe('one_off_date');
      expect(result.times?.dateReference).toBe('Jul 4');
    });

    it('detects one_off_date for abbreviated-month ordinal "Oct. 31st"', () => {
      const result = extractTextBasedData('Oct. 31st 11am-2pm');
      expect(result.times?.scope).toBe('one_off_date');
      expect(result.times?.dateReference).toBe('Oct. 31st');
    });

    it('detects one_off_date for "Sept 15" abbreviation', () => {
      const result = extractTextBasedData('Sept 15 11am-2pm');
      expect(result.times?.scope).toBe('one_off_date');
      expect(result.times?.dateReference).toBe('Sept 15');
    });

    it('detects one_off_date for "Sep." abbreviation with period', () => {
      const result = extractTextBasedData('Sep. 30 11am-2pm');
      expect(result.times?.scope).toBe('one_off_date');
      expect(result.times?.dateReference).toBe('Sep. 30');
    });

    it('detects scope_missing for bare weekday', () => {
      const result = extractTextBasedData('Monday 11am-2pm');
      expect(result.times?.scope).toBe('scope_missing');
    });

    it('detects scope_missing for bare time without days', () => {
      const result = extractTextBasedData('Open 11am-2pm');
      expect(result.times?.scope).toBe('scope_missing');
    });

    it('detects one_off_date when non-month lead word precedes valid date', () => {
      const result = extractTextBasedData('Serving 2 locations July 4 11am-2pm');
      expect(result.times?.scope).toBe('one_off_date');
      expect(result.times?.dateReference).toBe('July 4');
    });

    it('detects one_off_date when "Open 7 days" precedes valid date', () => {
      const result = extractTextBasedData('Open 7 days July 4 11am-2pm');
      expect(result.times?.scope).toBe('one_off_date');
      expect(result.times?.dateReference).toBe('July 4');
    });

    it('returns undefined when no times are present', () => {
      const result = extractTextBasedData('Just a friendly greeting');
      expect(result.times).toBeUndefined();
    });
  });

  describe('Food Items Extraction', () => {
    it('extracts basic food items from keywords', () => {
      const result = extractTextBasedData('We have the best tacos in town!');
      expect(result.food_items).toContain('We have the best tacos in town');
    });

    it('extracts multiple food items and dedupes them', () => {
      const result = extractTextBasedData('Serving burgers and fries. Try our fresh fries!');
      expect(result.food_items).toContain('Serving burgers and fries');
      expect(result.food_items).toContain('Try our fresh fries');
      expect(result.food_items?.length).toBe(2);
    });

    it('returns empty array when no food items are present', () => {
      const result = extractTextBasedData('Welcome to our grand opening!');
      expect(result.food_items).toEqual([]);
    });

    it('respects the length limits for extracted food phrases', () => {
      // length must be > 3 and < 100
      const longPhrase = 'A'.repeat(100) + ' burgers ' + 'B'.repeat(100);
      const result = extractTextBasedData(longPhrase);
      expect(result.food_items).toEqual([]);
    });

    it('extracts food item phrase bounded by punctuation', () => {
      const result = extractTextBasedData('Welcome! We have hot dogs today. Enjoy!');
      expect(result.food_items).toEqual(['We have hot dogs today']);
    });
  });

  describe('Integrated Extraction', () => {
    it('extracts all data points from a complex post', () => {
      const post = `Hey @foodies! Come get the best #tacos in town. We are serving tacos and burgers today 11am-2pm at 123 Main St.`;
      const result = extractTextBasedData(post);

      expect(result.mentions).toEqual(['foodies']);
      expect(result.hashtags).toEqual(['tacos']);
      expect(result.times).toEqual({
        start: '11:00',
        end: '14:00',
        dateReference: 'today',
        scope: 'one_off_date',
      });
      expect(result.food_items).toContain('We are serving tacos and burgers today 11am-2pm at 123 Main St');
      expect(result.food_items?.length).toBeGreaterThan(0);
      expect(result.location?.address).toBe('123 Main St.');
    });
  });

  describe('hasFoodSignal', () => {
    it('returns true when text contains food keyword', () => {
      expect(hasFoodSignal('We have tacos today')).toBe(true);
    });

    it('returns true when text contains menu keyword', () => {
      expect(hasFoodSignal('Check our menu')).toBe(true);
    });

    it('returns false for location/time announcement without food language', () => {
      const text = 'This Wednesday July 29th from 5pm-10pm we\'ll be at 321 Fabian Dr, Aiken, SC 29803. Come & see us!';
      expect(hasFoodSignal(text)).toBe(false);
    });

    it('returns false for null', () => {
      expect(hasFoodSignal(null as unknown as string)).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(hasFoodSignal('')).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(hasFoodSignal(undefined as unknown as string)).toBe(false);
    });
  });
});
