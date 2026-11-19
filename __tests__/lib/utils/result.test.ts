import { ok, err, isError, isOk, unwrap } from '../../../lib/utils/result';

describe('Result Utilities', () => {
  describe('ok()', () => {
    it('creates a successful result with provided data', () => {
      const data = { id: 1, name: 'Test' };
      const result = ok(data);
      expect(result).toEqual({ data });
    });

    it('works with primitive data types', () => {
      const result = ok('success');
      expect(result).toEqual({ data: 'success' });
    });

    it('works with falsy data values', () => {
      const result1 = ok(null);
      const result2 = ok(false);
      const result3 = ok(0);

      expect(result1).toEqual({ data: null });
      expect(result2).toEqual({ data: false });
      expect(result3).toEqual({ data: 0 });
    });
  });

  describe('err()', () => {
    it('creates an error result with provided message', () => {
      const message = 'Something went wrong';
      const result = err(message);
      expect(result).toEqual({ error: message });
    });

    it('works with empty string error message', () => {
      const result = err('');
      expect(result).toEqual({ error: '' });
    });
  });

  describe('isError()', () => {
    it('returns true for error results', () => {
      const result = err('Error');
      expect(isError(result)).toBe(true);
    });

    it('returns false for successful results', () => {
      const result = ok('Success');
      expect(isError(result)).toBe(false);
    });

    it('works with tricky ok results that look like errors', () => {
      // @ts-expect-error Intentionally creating a malformed ok result for testing runtime behavior
      const trickyOk = { data: 'Success', error: undefined };
      expect(isError(trickyOk)).toBe(true); // 'error' is in trickyOk

      const realOk = ok({ error: 'Nested error' });
      expect(isError(realOk)).toBe(false); // 'error' is not at root
    });
  });

  describe('isOk()', () => {
    it('returns true for successful results', () => {
      const result = ok('Success');
      expect(isOk(result)).toBe(true);
    });

    it('returns false for error results', () => {
      const result = err('Error');
      expect(isOk(result)).toBe(false);
    });

    it('works with tricky err results that look like ok', () => {
      // @ts-expect-error Intentionally creating a malformed err result for testing runtime behavior
      const trickyErr = { error: 'Error', data: undefined };
      expect(isOk(trickyErr)).toBe(true); // 'data' is in trickyErr

      const realErr = err('String with data word');
      expect(isOk(realErr)).toBe(false); // 'data' is not at root
    });
  });

  describe('unwrap()', () => {
    it('returns data for successful results', () => {
      const data = { id: 1 };
      const result = ok(data);
      expect(unwrap(result)).toBe(data);
    });

    it('throws error with message for error results', () => {
      const errorMessage = 'Failed operation';
      const result = err(errorMessage);
      expect(() => unwrap(result)).toThrow(errorMessage);
    });
  });
});
