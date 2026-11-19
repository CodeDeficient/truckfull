import { readBearerToken, usesBearerScheme } from '@/lib/auth/bearerToken';

describe('readBearerToken', () => {
  it('returns the token from a bearer header', () => {
    expect(readBearerToken('Bearer abc.def.ghi')).toBe('abc.def.ghi');
  });

  it('accepts any casing and surrounding whitespace', () => {
    expect(readBearerToken('  bEaReR   abc  ')).toBe('abc');
  });

  it('rejects missing, empty, and non-bearer headers', () => {
    expect(readBearerToken(null)).toBeNull();
    expect(readBearerToken('')).toBeNull();
    expect(readBearerToken('Bearer')).toBeNull();
    expect(readBearerToken('Bearer   ')).toBeNull();
    expect(readBearerToken('Basic dXNlcjpwYXNz')).toBeNull();
    expect(readBearerToken('Bearer a b')).toBeNull();
    expect(readBearerToken('Bearerabc')).toBeNull();
  });
});

describe('usesBearerScheme', () => {
  it('is true for any bearer header, even a malformed one', () => {
    expect(usesBearerScheme('Bearer x')).toBe(true);
    expect(usesBearerScheme('bearer')).toBe(true);
    expect(usesBearerScheme('Bearer a b')).toBe(true);
  });

  it('is false for other schemes and blank headers', () => {
    expect(usesBearerScheme('Basic dXNlcjpwYXNz')).toBe(false);
    expect(usesBearerScheme('Bearerabc')).toBe(false);
    expect(usesBearerScheme('   ')).toBe(false);
    expect(usesBearerScheme(null)).toBe(false);
  });
});
