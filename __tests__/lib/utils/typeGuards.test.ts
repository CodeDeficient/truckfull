import {
  hasValidDateString,
  hasValidTimeString,
  hasValidId,
  hasValidString,
  hasValidLocation,
  hasValidCuisineType,
  hasValidRating,
  hasValidReviewCount,
  hasValidBoolean,
  isTruckResultWithError,
  isTruckResultSuccess
} from '@/lib/utils/typeGuards';

describe('Type Guards', () => {
  describe('hasValidDateString', () => {
    it('returns true for a non-empty string', () => {
      expect(hasValidDateString('2023-01-01')).toBe(true);
      expect(hasValidDateString('foo')).toBe(true);
    });

    it('returns false for an empty string', () => {
      expect(hasValidDateString('')).toBe(false);
    });

    it('returns false for non-string values', () => {
      expect(hasValidDateString(123)).toBe(false);
      expect(hasValidDateString(null)).toBe(false);
      expect(hasValidDateString(undefined)).toBe(false);
      expect(hasValidDateString({})).toBe(false);
    });
  });

  describe('hasValidTimeString', () => {
    it('returns true for valid time strings', () => {
      expect(hasValidTimeString('12:30')).toBe(true);
      expect(hasValidTimeString('12:30:45')).toBe(true);
      expect(hasValidTimeString('12:30:45.123')).toBe(true);
      expect(hasValidTimeString('12:30:45Z')).toBe(true);
      expect(hasValidTimeString('12:30:45+02:00')).toBe(true);
      expect(hasValidTimeString('12:30:45-05:00')).toBe(true);
    });

    it('returns false for invalid time strings', () => {
      expect(hasValidTimeString('12:3')).toBe(false);
      expect(hasValidTimeString('1230')).toBe(false);
      expect(hasValidTimeString('12:30:45.Z')).toBe(false);
      expect(hasValidTimeString('12:30:45+2:00')).toBe(false);
      expect(hasValidTimeString('foo')).toBe(false);
      expect(hasValidTimeString('')).toBe(false);
    });

    it('returns false for non-string values', () => {
      expect(hasValidTimeString(123)).toBe(false);
      expect(hasValidTimeString(null)).toBe(false);
      expect(hasValidTimeString(undefined)).toBe(false);
    });
  });

  describe('hasValidId', () => {
    it('returns true for a non-empty string', () => {
      expect(hasValidId('123-abc')).toBe(true);
      expect(hasValidId('1')).toBe(true);
    });

    it('returns false for an empty string', () => {
      expect(hasValidId('')).toBe(false);
    });

    it('returns false for non-string values', () => {
      expect(hasValidId(123)).toBe(false);
      expect(hasValidId(null)).toBe(false);
      expect(hasValidId(undefined)).toBe(false);
    });
  });

  describe('hasValidString', () => {
    it('returns true for a non-empty string', () => {
      expect(hasValidString('hello')).toBe(true);
      expect(hasValidString(' ')).toBe(true);
    });

    it('returns false for an empty string', () => {
      expect(hasValidString('')).toBe(false);
    });

    it('returns false for non-string values', () => {
      expect(hasValidString(123)).toBe(false);
      expect(hasValidString(null)).toBe(false);
      expect(hasValidString(undefined)).toBe(false);
    });
  });

  describe('hasValidLocation', () => {
    it('returns true for an object with a string address property', () => {
      expect(hasValidLocation({ address: '123 Main St' })).toBe(true);
      expect(hasValidLocation({ address: '123 Main St', lat: 40, lng: -73 })).toBe(true);
    });

    it('returns false if address is missing or not a string', () => {
      expect(hasValidLocation({ lat: 40, lng: -73 })).toBe(false);
      expect(hasValidLocation({ address: 123 })).toBe(false);
      expect(hasValidLocation({ address: null })).toBe(false);
    });

    it('returns false for null or non-object values', () => {
      expect(hasValidLocation(null)).toBe(false);
      expect(hasValidLocation(undefined)).toBe(false);
      expect(hasValidLocation('123 Main St')).toBe(false);
      expect(hasValidLocation(123)).toBe(false);
    });
  });

  describe('hasValidCuisineType', () => {
    it('returns true for an array of strings', () => {
      expect(hasValidCuisineType(['Mexican', 'Tacos'])).toBe(true);
      expect(hasValidCuisineType(['Burgers'])).toBe(true);
    });

    it('returns true for an empty array', () => {
      expect(hasValidCuisineType([])).toBe(true);
    });

    it('returns false for an array containing non-strings', () => {
      expect(hasValidCuisineType(['Mexican', 123])).toBe(false);
      expect(hasValidCuisineType([null])).toBe(false);
    });

    it('returns false for non-array values', () => {
      expect(hasValidCuisineType('Mexican')).toBe(false);
      expect(hasValidCuisineType(null)).toBe(false);
      expect(hasValidCuisineType(undefined)).toBe(false);
      expect(hasValidCuisineType({})).toBe(false);
    });
  });

  describe('hasValidRating', () => {
    it('returns true for numbers between 0 and 5', () => {
      expect(hasValidRating(0)).toBe(true);
      expect(hasValidRating(2.5)).toBe(true);
      expect(hasValidRating(5)).toBe(true);
    });

    it('returns false for numbers outside 0 to 5', () => {
      expect(hasValidRating(-1)).toBe(false);
      expect(hasValidRating(5.1)).toBe(false);
      expect(hasValidRating(10)).toBe(false);
    });

    it('returns false for non-number values', () => {
      expect(hasValidRating('3')).toBe(false);
      expect(hasValidRating(null)).toBe(false);
      expect(hasValidRating(undefined)).toBe(false);
    });
  });

  describe('hasValidReviewCount', () => {
    it('returns true for non-negative numbers', () => {
      expect(hasValidReviewCount(0)).toBe(true);
      expect(hasValidReviewCount(10)).toBe(true);
      expect(hasValidReviewCount(100)).toBe(true);
    });

    it('returns false for negative numbers', () => {
      expect(hasValidReviewCount(-1)).toBe(false);
      expect(hasValidReviewCount(-10)).toBe(false);
    });

    it('returns false for non-number values', () => {
      expect(hasValidReviewCount('10')).toBe(false);
      expect(hasValidReviewCount(null)).toBe(false);
      expect(hasValidReviewCount(undefined)).toBe(false);
    });
  });

  describe('hasValidBoolean', () => {
    it('returns true for boolean values', () => {
      expect(hasValidBoolean(true)).toBe(true);
      expect(hasValidBoolean(false)).toBe(true);
    });

    it('returns false for non-boolean values', () => {
      expect(hasValidBoolean('true')).toBe(false);
      expect(hasValidBoolean(1)).toBe(false);
      expect(hasValidBoolean(0)).toBe(false);
      expect(hasValidBoolean(null)).toBe(false);
      expect(hasValidBoolean(undefined)).toBe(false);
    });
  });

  describe('isTruckResultWithError', () => {
    it('returns true for an object with a string error property', () => {
      expect(isTruckResultWithError({ error: 'Not found' })).toBe(true);
      expect(isTruckResultWithError({ error: 'Server error', code: 500 })).toBe(true);
    });

    it('returns false if error is missing or not a string', () => {
      expect(isTruckResultWithError({ message: 'Not found' })).toBe(false);
      expect(isTruckResultWithError({ error: 404 })).toBe(false);
      expect(isTruckResultWithError({ error: null })).toBe(false);
    });

    it('returns false for null or non-object values', () => {
      expect(isTruckResultWithError(null)).toBe(false);
      expect(isTruckResultWithError(undefined)).toBe(false);
      expect(isTruckResultWithError('error')).toBe(false);
    });
  });

  describe('isTruckResultSuccess', () => {
    it('returns true for an object with an array trucks property', () => {
      expect(isTruckResultSuccess({ trucks: [] })).toBe(true);
      expect(isTruckResultSuccess({ trucks: [{ id: '1' }] })).toBe(true);
      expect(isTruckResultSuccess({ trucks: [], count: 0 })).toBe(true);
    });

    it('returns false if trucks is missing or not an array', () => {
      expect(isTruckResultSuccess({ data: [] })).toBe(false);
      expect(isTruckResultSuccess({ trucks: null })).toBe(false);
      expect(isTruckResultSuccess({ trucks: 'none' })).toBe(false);
      expect(isTruckResultSuccess({ trucks: {} })).toBe(false);
    });

    it('returns false for null or non-object values', () => {
      expect(isTruckResultSuccess(null)).toBe(false);
      expect(isTruckResultSuccess(undefined)).toBe(false);
      expect(isTruckResultSuccess('success')).toBe(false);
    });
  });
});
