/**
 * Property-Based Test Runner for TruckFull
 * Uses fast-check to find edge cases automatically
 */

const fc = require('fast-check');

// Simple slug generation function (copied from lib/utils/slug.ts)
function generateSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w -]+/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Simple log sanitization (simplified from lib/logging/index.ts)
function sanitizeLogMessage(message) {
  // Remove email addresses
  let sanitized = message.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');
  // Remove potential API keys
  sanitized = sanitized.replace(/(api[_-]?key|secret|token)[=:]\s*["'][^"']+["']/gi, '$1=[REDACTED]');
  return sanitized;
}

// Email validation regex (from app/api/waitlist/route.ts)
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Deterministic email generator that always produces valid emails
function generateEmail(seed) {
  const localChars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const domainChars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const localLen = (seed % 10) + 3;
  const domainLen = (seed % 8) + 2;
  let local = '';
  let domain = '';
  for (let i = 0; i < localLen; i++) {
    local += localChars[(seed + i) % localChars.length];
  }
  for (let i = 0; i < domainLen; i++) {
    domain += domainChars[(seed + i) % domainChars.length];
  }
  return `${local}@${domain}.com`;
}

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (error) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${error.message}`);
    failed++;
  }
}

console.log('=== Property-Based Tests ===\n');

// Test 1: generateSlug always returns valid format
test('generateSlug: always returns valid slug format', () => {
  fc.assert(
    fc.property(fc.string(), (input) => {
      const slug = generateSlug(input);
      if (typeof slug !== 'string') throw new Error('Not a string');
      if (!/^[a-z0-9-]*$/.test(slug)) throw new Error('Invalid characters');
      if (slug.startsWith('-')) throw new Error('Starts with hyphen');
      if (slug.endsWith('-')) throw new Error('Ends with hyphen');
      if (slug.includes('--')) throw new Error('Double hyphen');
      if (slug.length > 200) throw new Error('Too long');
    }),
    { numRuns: 100 }
  );
});

// Test 2: generateSlug handles empty input
test('generateSlug: handles empty input', () => {
  fc.assert(
    fc.property(fc.oneof(fc.constant(''), fc.stringMatching(/^\s+$/)), (input) => {
      const slug = generateSlug(input);
      if (slug !== '') throw new Error('Expected empty string');
    }),
    { numRuns: 50 }
  );
});

// Test 3: generateSlug handles special characters
test('generateSlug: handles special characters', () => {
  fc.assert(
    fc.property(fc.stringMatching(/^[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/), (input) => {
      const slug = generateSlug(input);
      if (!/^[a-z0-9-]*$/.test(slug)) throw new Error('Contains invalid chars: ' + slug);
    }),
    { numRuns: 100 }
  );
});

// Test 4: generateSlug handles long input
test('generateSlug: handles extremely long input', () => {
  fc.assert(
    fc.property(fc.string({ maxLength: 10000 }), (input) => {
      const slug = generateSlug(input);
      if (slug.length > 200) throw new Error('Slug too long: ' + slug.length);
    }),
    { numRuns: 100 }
  );
});

// Test 5: sanitizeLogMessage always returns string
test('sanitizeLogMessage: always returns string', () => {
  fc.assert(
    fc.property(fc.string(), (input) => {
      const result = sanitizeLogMessage(input);
      if (typeof result !== 'string') throw new Error('Not a string');
    }),
    { numRuns: 100 }
  );
});

// Test 6: sanitizeLogMessage removes emails
test('sanitizeLogMessage: removes email addresses', () => {
  // Test with explicit valid emails
  const testCases = [
    'test@example.com',
    'user.name@domain.org',
    'admin123@subdomain.example.co.uk',
    'a@b.com',
  ];
  testCases.forEach(email => {
    const input = `Log message with email: ${email} and more text`;
    const result = sanitizeLogMessage(input);
    if (result.includes(email)) {
      throw new Error(`Email not sanitized: ${email} in "${result}"`);
    }
  });
  passed++;
});

// Test 7: email regex matches valid email formats
test('emailRegex: matches valid email formats', () => {
  const validEmails = [
    'test@example.com',
    'user.name@domain.org',
    'admin123@subdomain.example.co.uk',
    'a@b.com',
    'user+tag@gmail.com',
    'user-name@my-domain.com',
  ];
  validEmails.forEach(email => {
    if (!emailRegex.test(email)) {
      throw new Error('Valid email rejected: ' + email);
    }
  });
  passed++;
});

// Test 8: email regex rejects invalid formats
test('emailRegex: rejects strings without @', () => {
  fc.assert(
    fc.property(fc.string().filter(s => !s.includes('@')), (noAt) => {
      if (emailRegex.test(noAt)) throw new Error('Invalid email accepted: ' + noAt);
    }),
    { numRuns: 100 }
  );
});

// Test 9: email regex rejects strings with spaces
test('emailRegex: rejects strings with spaces', () => {
  fc.assert(
    fc.property(fc.stringMatching(/.*\s.*/), (withSpace) => {
      if (emailRegex.test(withSpace)) throw new Error('Email with space accepted: ' + withSpace);
    }),
    { numRuns: 100 }
  );
});

// Test 10: Email regex edge cases
test('emailRegex: handles edge cases', () => {
  const invalidEmails = [
    '',
    'no-at-symbol',
    'no@domain',
    '@nodomain.com',
    'spaces in@email.com',
    'double@@at.com',
  ];
  invalidEmails.forEach(email => {
    if (emailRegex.test(email)) {
      throw new Error('Invalid email accepted: ' + email);
    }
  });
});

// Test 11: Regex ReDoS resistance
test('emailRegex: resistant to ReDoS attacks', () => {
  const patterns = [
    'a'.repeat(1000) + '@' + 'b'.repeat(1000) + '.com',
    '!@#'.repeat(100) + '@' + '$%^'.repeat(100) + '.com',
    ' '.repeat(100) + 'test@example.com' + ' '.repeat(100),
  ];
  patterns.forEach(pattern => {
    const start = Date.now();
    emailRegex.test(pattern);
    const elapsed = Date.now() - start;
    if (elapsed > 100) {
      throw new Error(`ReDoS vulnerability: ${elapsed}ms`);
    }
  });
});

// Test 12: Slug ReDoS resistance
test('generateSlug: resistant to ReDoS attacks', () => {
  const patterns = [
    '-'.repeat(1000),
    ' '.repeat(1000),
    '_-'.repeat(500),
  ];
  patterns.forEach(pattern => {
    const start = Date.now();
    generateSlug(pattern);
    const elapsed = Date.now() - start;
    if (elapsed > 100) {
      throw new Error(`ReDoS vulnerability: ${elapsed}ms`);
    }
  });
});

// Test 13: sanitizeLogMessage is idempotent
test('sanitizeLogMessage: is idempotent (double sanitization safe)', () => {
  fc.assert(
    fc.property(fc.string(), (input) => {
      const result1 = sanitizeLogMessage(input);
      const result2 = sanitizeLogMessage(result1);
      if (result1 !== result2) {
        throw new Error('Not idempotent: "' + result1 + '" != "' + result2 + '"');
      }
    }),
    { numRuns: 100 }
  );
});

// Test 14: sanitizeLogMessage preserves non-sensitive content
test('sanitizeLogMessage: preserves normal log messages', () => {
  const normalMessages = [
    'User logged in successfully',
    'Database connection established',
    'Request processed in 50ms',
    'Cache hit for key: user_123',
  ];
  normalMessages.forEach(msg => {
    const result = sanitizeLogMessage(msg);
    if (result === '[EMAIL]' || result === '[REDACTED]') {
      throw new Error('Over-sanitized: "' + msg + '" -> "' + result + '"');
    }
  });
});

console.log(`\n=== Results ===`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total: ${passed + failed}`);

process.exit(failed > 0 ? 1 : 0);
