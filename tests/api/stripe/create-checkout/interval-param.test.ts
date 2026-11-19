import { describe, it, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

describe('/api/stripe/create-checkout Interval Parameter', () => {
  const routePath = path.join(process.cwd(), 'app/api/stripe/create-checkout/route.ts');
  const content = fs.readFileSync(routePath, 'utf-8');

  it('should destructure interval parameter from request body', () => {
    const hasIntervalDestructuring = /const\s*\{\s*[^}]*\binterval\b[^}]*\}\s*=\s*body/.test(
      content,
    );

    expect(hasIntervalDestructuring).toBe(true);
  });

  it('should pass interval to createCheckoutSession', () => {
    const functionCall = content.match(/createCheckoutSession\(\s*\{[^}]*\}\s*\)/s);

    expect(functionCall).toBeTruthy();

    const callContent = functionCall![0];
    const hasIntervalParam = /interval:\s*\b(?:interval\s*\?\?\s*['"]month['"]|interval\b)/.test(
      callContent,
    );

    expect(hasIntervalParam).toBe(true);
  });

  it('should define interval type as optional month or year', () => {
    const hasIntervalType =
      /interval\?:\s*['"](?:month|year)['"]/.test(content) ||
      /interval\?:\s*['"]month['"]\s*\|\s*['"]year['"]/.test(content);

    expect(hasIntervalType).toBe(true);
  });

  it('should validate interval is either month or year', () => {
    const hasIntervalValidation =
      /if\s*\(\s*interval\s*&&\s*!\[?\s*['"]month['"]\s*,\s*['"]year['"]\s*\]?\s*\.includes\s*\(\s*interval\s*\)\s*\)/.test(
        content,
      );

    expect(hasIntervalValidation).toBe(true);
  });
});
