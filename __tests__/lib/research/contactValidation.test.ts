import { describe, it, expect } from '@jest/globals';
import {
  normalizeEmail,
  normalizePhoneDigits,
  normalizeAddress,
  normalizeWebsite,
  isMaskedContact,
  detectContactMismatches,
} from '@/lib/research/contactValidation';

describe('normalizeEmail', () => {
  it('lowercases email', () => {
    expect(normalizeEmail('SAMPLEMARKET@GMAIL.COM')).toBe('samplemarket@gmail.com');
  });

  it('trims whitespace', () => {
    expect(normalizeEmail('  test@example.com  ')).toBe('test@example.com');
  });

  it('returns empty for empty', () => {
    expect(normalizeEmail('')).toBe('');
  });

  it('preserves dots in local part', () => {
    expect(normalizeEmail('John.Doe@Example.COM')).toBe('john.doe@example.com');
  });

  it('handles plus addressing', () => {
    expect(normalizeEmail('user+tag@DOMAIN.COM')).toBe('user+tag@domain.com');
  });

  it('handles already lowercase', () => {
    expect(normalizeEmail('test@example.com')).toBe('test@example.com');
  });
});

describe('normalizePhoneDigits', () => {
  it('strips non-digit characters', () => {
    expect(normalizePhoneDigits('(843) 555-0150')).toBe('8435550150');
  });

  it('handles plus sign prefix', () => {
    expect(normalizePhoneDigits('+1 843-555-0150')).toBe('8435550150');
  });

  it('strips US trunk prefix', () => {
    expect(normalizePhoneDigits('1-843-555-0150')).toBe('8435550150');
  });

  it('handles dots and spaces', () => {
    expect(normalizePhoneDigits('843.555.0150')).toBe('8435550150');
  });

  it('returns empty for empty', () => {
    expect(normalizePhoneDigits('')).toBe('');
  });

  it('does not strip leading 1 from non-11-digit numbers', () => {
    expect(normalizePhoneDigits('12345')).toBe('12345');
  });
});

describe('normalizeAddress', () => {
  it('normalizes Highway to hwy', () => {
    expect(normalizeAddress('5312 Highway 441 S')).toBe('5312 hwy 441 s');
  });

  it('normalizes Hwy to lowercase', () => {
    expect(normalizeAddress('5312 HWY 441 S')).toBe('5312 hwy 441 s');
  });

  it('normalizes Street abbreviation', () => {
    expect(normalizeAddress('350 Magnolia Street')).toBe('350 magnolia st');
  });

  it('normalizes Suite', () => {
    expect(normalizeAddress('1200 Rosewood Dr STE 100')).toBe('1200 rosewood dr ste 100');
  });

  it('normalizes Road', () => {
    expect(normalizeAddress('337 Farmington Road')).toBe('337 farmington rd');
  });

  it('normalizes Drive', () => {
    expect(normalizeAddress('3027 Martin Luther King Jr Dr')).toBe('3027 martin luther king jr dr');
  });

  it('normalizes Lane', () => {
    expect(normalizeAddress('89 Saluda Ln')).toBe('89 saluda ln');
  });

  it('normalizes Avenue', () => {
    expect(normalizeAddress('100 Main Avenue')).toBe('100 main ave');
  });

  it('normalizes Boulevard', () => {
    expect(normalizeAddress('1200 Rosewood Blvd')).toBe('1200 rosewood blvd');
  });

  it('strips periods from abbreviations', () => {
    expect(normalizeAddress('350 Magnolia St.')).toBe('350 magnolia st');
    expect(normalizeAddress('1200 Rosewood Dr.')).toBe('1200 rosewood dr');
  });

  it('normalizes directional suffixes', () => {
    expect(normalizeAddress('5312 Highway 441 North')).toBe('5312 hwy 441 n');
    expect(normalizeAddress('100 Main St SW')).toBe('100 main st sw');
  });

  it('handles extra whitespace', () => {
    expect(normalizeAddress('  5312   HWY   441  S  ')).toBe('5312 hwy 441 s');
  });

  it('returns empty for empty', () => {
    expect(normalizeAddress('')).toBe('');
  });
});

describe('normalizeWebsite', () => {
  it('strips protocol', () => {
    expect(normalizeWebsite('https://example.com')).toBe('example.com');
  });

  it('strips www prefix', () => {
    expect(normalizeWebsite('www.example.com')).toBe('example.com');
  });

  it('strips trailing slash', () => {
    expect(normalizeWebsite('example.com/')).toBe('example.com');
  });

  it('handles full URL', () => {
    expect(normalizeWebsite('https://www.example.com/')).toBe('example.com');
  });

  it('lowercases', () => {
    expect(normalizeWebsite('HTTPS://Example.COM')).toBe('example.com');
  });

  it('preserves path for non-root URLs', () => {
    expect(normalizeWebsite('https://example.com/events/123')).toBe('example.com/events/123');
  });

  it('returns empty for empty', () => {
    expect(normalizeWebsite('')).toBe('');
  });
});

describe('isMaskedContact', () => {
  it('detects triple asterisk masking', () => {
    expect(isMaskedContact('craft***@hotmail.com')).toBe(true);
  });

  it('detects partial masking with asterisks', () => {
    expect(isMaskedContact('CRAF***@HOTMAIL.COM')).toBe(true);
  });

  it('detects triple dot masking', () => {
    expect(isMaskedContact('john...@gmail.com')).toBe(true);
  });

  it('detects redacted pattern', () => {
    expect(isMaskedContact('[redacted]')).toBe(true);
  });

  it('detects phone masking', () => {
    expect(isMaskedContact('***-***-4550')).toBe(true);
  });

  it('detects partially masked phone', () => {
    expect(isMaskedContact('843-***-****')).toBe(true);
  });

  it('does not flag normal emails', () => {
    expect(isMaskedContact('samplecraftfair@hotmail.com')).toBe(false);
    expect(isMaskedContact('samplemarket@gmail.com')).toBe(false);
  });

  it('does not flag normal phone', () => {
    expect(isMaskedContact('843-555-0150')).toBe(false);
  });

  it('returns false for empty', () => {
    expect(isMaskedContact('')).toBe(false);
  });

  it('detects single asterisk masking in email', () => {
    expect(isMaskedContact('c****@gmail.com')).toBe(true);
  });

  it('returns false for whitespace-only', () => {
    expect(isMaskedContact('   ')).toBe(false);
  });
});

describe('detectContactMismatches', () => {
  const basePoster = {
    email: 'samplemarket@gmail.com',
    phone: '843-555-0150',
    website: 'mysamplemarket.example',
    address: '5312 Hwy 441 S, Tiger, GA',
  };

  it('does not flag email case differences', () => {
    const source = { ...basePoster, email: 'SAMPLEMARKET@GMAIL.COM' };
    const mismatches = detectContactMismatches(basePoster, source);
    expect(mismatches).toHaveLength(0);
  });

  it('detects real email mismatch', () => {
    const source = { ...basePoster, email: 'different@example.com' };
    const mismatches = detectContactMismatches(basePoster, source);
    expect(mismatches).toHaveLength(1);
    expect(mismatches[0].type).toBe('email');
    expect(mismatches[0].posterValue).toBe('samplemarket@gmail.com');
    expect(mismatches[0].sourceValue).toBe('different@example.com');
  });

  it('normalizes phone format differences', () => {
    const source = { ...basePoster, phone: '(843) 555-0150' };
    const mismatches = detectContactMismatches(basePoster, source);
    expect(mismatches).toHaveLength(0);
  });

  it('detects real phone mismatch', () => {
    const source = { ...basePoster, phone: '555-123-4567' };
    const mismatches = detectContactMismatches(basePoster, source);
    expect(mismatches).toHaveLength(1);
    expect(mismatches[0].type).toBe('phone');
  });

  it('normalizes address format differences', () => {
    const source = { ...basePoster, address: '5312 Highway 441 S, Tiger, GA' };
    const mismatches = detectContactMismatches(basePoster, source);
    expect(mismatches).toHaveLength(0);
  });

  it('normalizes periods in addresses', () => {
    const source = { ...basePoster, address: '5312 Hwy. 441 S., Tiger, GA' };
    const mismatches = detectContactMismatches(basePoster, source);
    expect(mismatches).toHaveLength(0);
  });

  it('normalizes website with protocol and www', () => {
    const source = { ...basePoster, website: 'https://www.mysamplemarket.example' };
    const mismatches = detectContactMismatches(basePoster, source);
    expect(mismatches).toHaveLength(0);
  });

  it('detects real address mismatch', () => {
    const source = { ...basePoster, address: '100 Different St, Other City, GA' };
    const mismatches = detectContactMismatches(basePoster, source);
    expect(mismatches).toHaveLength(1);
    expect(mismatches[0].type).toBe('address');
  });

  it('detects website mismatch', () => {
    const source = { ...basePoster, website: 'different.com' };
    const mismatches = detectContactMismatches(basePoster, source);
    expect(mismatches).toHaveLength(1);
    expect(mismatches[0].type).toBe('website');
  });

  it('skips fields not present in source', () => {
    const source = { email: basePoster.email };
    const mismatches = detectContactMismatches(basePoster, source);
    expect(mismatches).toHaveLength(0);
  });

  it('detects multiple mismatches', () => {
    const source = {
      email: 'wrong@email.com',
      phone: '999-888-7777',
      address: '999 Other Rd, Elsewhere, SC',
    };
    const mismatches = detectContactMismatches(basePoster, source);
    expect(mismatches).toHaveLength(3);
  });

  it('handles missing poster fields', () => {
    const poster = { email: '' };
    const source = { email: 'test@example.com' };
    const mismatches = detectContactMismatches(poster, source);
    expect(mismatches).toHaveLength(0);
  });

  it('handles whitespace-only fields', () => {
    const poster = { email: '   ' };
    const source = { email: 'test@example.com' };
    const mismatches = detectContactMismatches(poster, source);
    expect(mismatches).toHaveLength(0);
  });
});
