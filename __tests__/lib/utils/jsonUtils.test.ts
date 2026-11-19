import {
  getJsonString,
  getJsonNumber,
  getJsonBoolean,
  getJsonObject,
  getJsonArray,
  hasJsonProperty,
  getJsonNested,
  jsonToString,
  jsonToNumber,
  jsonToBoolean
} from '@/lib/utils/jsonUtils';

describe('JSON Utilities', () => {
  describe('getJsonString', () => {
    it('returns the string value if the property exists and is a string', () => {
      expect(getJsonString({ key: 'value' }, 'key')).toBe('value');
    });

    it('returns undefined if the property is missing', () => {
      expect(getJsonString({ key: 'value' }, 'other')).toBeUndefined();
    });

    it('returns undefined if the property is not a string', () => {
      expect(getJsonString({ key: 123 }, 'key')).toBeUndefined();
      expect(getJsonString({ key: true }, 'key')).toBeUndefined();
      expect(getJsonString({ key: null }, 'key')).toBeUndefined();
      expect(getJsonString({ key: {} }, 'key')).toBeUndefined();
      expect(getJsonString({ key: [] }, 'key')).toBeUndefined();
    });

    it('returns undefined for invalid objects', () => {
      expect(getJsonString(null, 'key')).toBeUndefined();
      expect(getJsonString(undefined, 'key')).toBeUndefined();
      // @ts-expect-error - Testing invalid inputs
      expect(getJsonString('string', 'key')).toBeUndefined();
      // @ts-expect-error - Testing invalid inputs
      expect(getJsonString(123, 'key')).toBeUndefined();
      // @ts-expect-error - Testing invalid inputs
      expect(getJsonString([], 'key')).toBeUndefined();
    });
  });

  describe('getJsonNumber', () => {
    it('returns the number value if the property exists and is a number', () => {
      expect(getJsonNumber({ key: 123 }, 'key')).toBe(123);
      expect(getJsonNumber({ key: 0 }, 'key')).toBe(0);
      expect(getJsonNumber({ key: -10.5 }, 'key')).toBe(-10.5);
    });

    it('returns undefined if the property is missing', () => {
      expect(getJsonNumber({ key: 123 }, 'other')).toBeUndefined();
    });

    it('returns undefined if the property is not a number', () => {
      expect(getJsonNumber({ key: '123' }, 'key')).toBeUndefined();
      expect(getJsonNumber({ key: true }, 'key')).toBeUndefined();
      expect(getJsonNumber({ key: null }, 'key')).toBeUndefined();
      expect(getJsonNumber({ key: {} }, 'key')).toBeUndefined();
      expect(getJsonNumber({ key: [] }, 'key')).toBeUndefined();
    });

    it('returns undefined for invalid objects', () => {
      expect(getJsonNumber(null, 'key')).toBeUndefined();
      expect(getJsonNumber(undefined, 'key')).toBeUndefined();
      // @ts-expect-error - Testing invalid inputs
      expect(getJsonNumber('string', 'key')).toBeUndefined();
      // @ts-expect-error - Testing invalid inputs
      expect(getJsonNumber(123, 'key')).toBeUndefined();
      // @ts-expect-error - Testing invalid inputs
      expect(getJsonNumber([], 'key')).toBeUndefined();
    });
  });

  describe('getJsonObject', () => {
    it('returns the object value if the property exists and is an object', () => {
      expect(getJsonObject({ key: { a: 1 } }, 'key')).toEqual({ a: 1 });
      expect(getJsonObject({ key: {} }, 'key')).toEqual({});
    });

    it('returns undefined if the property is missing', () => {
      expect(getJsonObject({ key: { a: 1 } }, 'other')).toBeUndefined();
    });

    it('returns undefined if the property is not an object', () => {
      expect(getJsonObject({ key: 'string' }, 'key')).toBeUndefined();
      expect(getJsonObject({ key: 123 }, 'key')).toBeUndefined();
      expect(getJsonObject({ key: true }, 'key')).toBeUndefined();
      expect(getJsonObject({ key: [] }, 'key')).toBeUndefined(); // Arrays are not objects in this context
      expect(getJsonObject({ key: null }, 'key')).toBeUndefined(); // Null is not a valid object in this context
    });

    it('returns undefined for invalid objects', () => {
      expect(getJsonObject(null, 'key')).toBeUndefined();
      expect(getJsonObject(undefined, 'key')).toBeUndefined();
      // @ts-expect-error - Testing invalid inputs
      expect(getJsonObject('string', 'key')).toBeUndefined();
      // @ts-expect-error - Testing invalid inputs
      expect(getJsonObject(123, 'key')).toBeUndefined();
      // @ts-expect-error - Testing invalid inputs
      expect(getJsonObject([], 'key')).toBeUndefined();
    });
  });

  describe('getJsonArray', () => {
    it('returns the array value if the property exists and is an array', () => {
      expect(getJsonArray({ key: [1, 2, 3] }, 'key')).toEqual([1, 2, 3]);
      expect(getJsonArray({ key: [] }, 'key')).toEqual([]);
    });

    it('returns undefined if the property is missing', () => {
      expect(getJsonArray({ key: [1, 2, 3] }, 'other')).toBeUndefined();
    });

    it('returns undefined if the property is not an array', () => {
      expect(getJsonArray({ key: 'string' }, 'key')).toBeUndefined();
      expect(getJsonArray({ key: 123 }, 'key')).toBeUndefined();
      expect(getJsonArray({ key: true }, 'key')).toBeUndefined();
      expect(getJsonArray({ key: {} }, 'key')).toBeUndefined();
      expect(getJsonArray({ key: null }, 'key')).toBeUndefined();
    });

    it('returns undefined for invalid objects', () => {
      expect(getJsonArray(null, 'key')).toBeUndefined();
      expect(getJsonArray(undefined, 'key')).toBeUndefined();
      // @ts-expect-error - Testing invalid inputs
      expect(getJsonArray('string', 'key')).toBeUndefined();
      // @ts-expect-error - Testing invalid inputs
      expect(getJsonArray(123, 'key')).toBeUndefined();
      // @ts-expect-error - Testing invalid inputs
      expect(getJsonArray([], 'key')).toBeUndefined();
    });
  });

  describe('hasJsonProperty', () => {
    it('returns true if the property exists', () => {
      expect(hasJsonProperty({ key: 'value' }, 'key')).toBe(true);
      expect(hasJsonProperty({ key: undefined }, 'key')).toBe(true);
      expect(hasJsonProperty({ key: null }, 'key')).toBe(true);
    });

    it('returns false if the property is missing', () => {
      expect(hasJsonProperty({ key: 'value' }, 'other')).toBe(false);
    });

    it('returns false for invalid objects', () => {
      expect(hasJsonProperty(null, 'key')).toBe(false);
      expect(hasJsonProperty(undefined, 'key')).toBe(false);
      // @ts-expect-error - Testing invalid inputs
      expect(hasJsonProperty('string', 'key')).toBe(false);
      // @ts-expect-error - Testing invalid inputs
      expect(hasJsonProperty(123, 'key')).toBe(false);
      // @ts-expect-error - Testing invalid inputs
      expect(hasJsonProperty([], 'key')).toBe(false);
    });
  });

  describe('getJsonBoolean', () => {
    it('returns the boolean value if the property exists and is a boolean', () => {
      expect(getJsonBoolean({ key: true }, 'key')).toBe(true);
      expect(getJsonBoolean({ key: false }, 'key')).toBe(false);
    });

    it('returns undefined if the property is missing', () => {
      expect(getJsonBoolean({ key: true }, 'other')).toBeUndefined();
    });

    it('returns undefined if the property is not a boolean', () => {
      expect(getJsonBoolean({ key: 'true' }, 'key')).toBeUndefined();
      expect(getJsonBoolean({ key: 1 }, 'key')).toBeUndefined();
      expect(getJsonBoolean({ key: 0 }, 'key')).toBeUndefined();
      expect(getJsonBoolean({ key: null }, 'key')).toBeUndefined();
      expect(getJsonBoolean({ key: {} }, 'key')).toBeUndefined();
      expect(getJsonBoolean({ key: [] }, 'key')).toBeUndefined();
    });

    it('returns undefined for invalid objects', () => {
      expect(getJsonBoolean(null, 'key')).toBeUndefined();
      expect(getJsonBoolean(undefined, 'key')).toBeUndefined();
      // @ts-expect-error - Testing invalid inputs
      expect(getJsonBoolean('string', 'key')).toBeUndefined();
      // @ts-expect-error - Testing invalid inputs
      expect(getJsonBoolean(123, 'key')).toBeUndefined();
      // @ts-expect-error - Testing invalid inputs
      expect(getJsonBoolean([], 'key')).toBeUndefined();
    });
  });
  describe('getJsonNested', () => {
    it('returns the nested value if the path exists', () => {
      expect(getJsonNested({ a: { b: { c: 'value' } } }, 'a.b.c')).toBe('value');
      expect(getJsonNested({ a: { b: { c: 123 } } }, 'a.b.c')).toBe(123);
      expect(getJsonNested({ a: { b: { c: true } } }, 'a.b.c')).toBe(true);
      expect(getJsonNested({ a: { b: { c: null } } }, 'a.b.c')).toBeNull();
      expect(getJsonNested({ a: { b: { c: undefined } } }, 'a.b.c')).toBeUndefined();
    });

    it('returns undefined if the path is missing', () => {
      expect(getJsonNested({ a: { b: {} } }, 'a.b.c')).toBeUndefined();
      expect(getJsonNested({ a: {} }, 'a.b.c')).toBeUndefined();
      expect(getJsonNested({}, 'a.b.c')).toBeUndefined();
    });

    it('returns undefined if an intermediate path is not an object', () => {
      expect(getJsonNested({ a: { b: 'string' } }, 'a.b.c')).toBeUndefined();
      expect(getJsonNested({ a: 'string' }, 'a.b.c')).toBeUndefined();
      expect(getJsonNested({ a: null }, 'a.b.c')).toBeUndefined();
      expect(getJsonNested({ a: [] }, 'a.b.c')).toBeUndefined();
    });

    it('returns undefined for invalid objects or empty path', () => {
      expect(getJsonNested(null, 'a.b.c')).toBeUndefined();
      expect(getJsonNested(undefined, 'a.b.c')).toBeUndefined();
      expect(getJsonNested({ a: 1 }, '')).toBeUndefined();
      // @ts-expect-error - Testing invalid inputs
      expect(getJsonNested('string', 'a')).toBeUndefined();
      // @ts-expect-error - Testing invalid inputs
      expect(getJsonNested(123, 'a')).toBeUndefined();
      // @ts-expect-error - Testing invalid inputs
      expect(getJsonNested([], 'a')).toBeUndefined();
    });
  });

  describe('jsonToString', () => {
    it('converts values to strings correctly', () => {
      expect(jsonToString('string')).toBe('string');
      expect(jsonToString(123)).toBe('123');
      expect(jsonToString(0)).toBe('0');
      expect(jsonToString(true)).toBe('true');
      expect(jsonToString(false)).toBe('false');
      expect(jsonToString({ a: 1 })).toBe('{"a":1}');
      expect(jsonToString([1, 2])).toBe('[1,2]');
    });

    it('returns empty string for null and undefined', () => {
      expect(jsonToString(null)).toBe('');
      expect(jsonToString(undefined)).toBe('');
    });
  });

  describe('jsonToNumber', () => {
    it('converts values to numbers correctly', () => {
      expect(jsonToNumber(123)).toBe(123);
      expect(jsonToNumber(0)).toBe(0);
      expect(jsonToNumber(-10.5)).toBe(-10.5);
      expect(jsonToNumber('123')).toBe(123);
      expect(jsonToNumber('0')).toBe(0);
      expect(jsonToNumber('-10.5')).toBe(-10.5);
      expect(jsonToNumber(true)).toBe(1);
      expect(jsonToNumber(false)).toBe(0);
    });

    it('returns undefined for values that cannot be converted', () => {
      expect(jsonToNumber('invalid')).toBeUndefined();
      expect(jsonToNumber('')).toBe(0); // Number('') is 0, which is valid
      expect(jsonToNumber('   ')).toBe(0); // Number('   ') is 0
      expect(jsonToNumber('123a')).toBeUndefined();
      expect(jsonToNumber({})).toBeUndefined();
      expect(jsonToNumber([])).toBeUndefined(); // Although Number([]) is 0, the function ignores arrays
      expect(jsonToNumber(null)).toBeUndefined();
      expect(jsonToNumber(undefined)).toBeUndefined();
    });
  });

  describe('jsonToBoolean', () => {
    it('converts values to booleans correctly', () => {
      expect(jsonToBoolean(true)).toBe(true);
      expect(jsonToBoolean(false)).toBe(false);

      expect(jsonToBoolean(1)).toBe(true);
      expect(jsonToBoolean(-1)).toBe(true);
      expect(jsonToBoolean(0)).toBe(false);

      expect(jsonToBoolean('true')).toBe(true);
      expect(jsonToBoolean('yes')).toBe(true);
      expect(jsonToBoolean('1')).toBe(true);
      expect(jsonToBoolean('false')).toBe(false);
      expect(jsonToBoolean('0')).toBe(false);
      expect(jsonToBoolean('')).toBe(false);
      expect(jsonToBoolean('   ')).toBe(false); // Only spaces becomes empty after trim
    });

    it('returns undefined for objects, arrays, null, and undefined', () => {
      expect(jsonToBoolean({})).toBeUndefined();
      expect(jsonToBoolean([])).toBeUndefined();
      expect(jsonToBoolean(null)).toBeUndefined();
      expect(jsonToBoolean(undefined)).toBeUndefined();
    });
  });
});
