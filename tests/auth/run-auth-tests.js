#!/usr/bin/env node
/**
 * Script to run all authentication tests and generate reports
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

console.log('Starting Food Truck Finder Authentication Tests...');

// Create reports directory if it doesn't exist
const reportsDir = join(process.cwd(), 'test-results', 'auth-reports');
if (!existsSync(reportsDir)) {
  mkdirSync(reportsDir, { recursive: true });
  console.log('Created reports directory:', reportsDir);
}

// Run Playwright authentication tests
console.log('Running Playwright authentication tests...');
try {
  execSync(
    'npx playwright test tests/auth/ --reporter=html,../test-results/auth-reports/results.json,../test-results/auth-reports/results.xml',
    {
      stdio: 'inherit',
      cwd: process.cwd(),
    },
  );
  console.log('Playwright authentication tests completed successfully.');
} catch (error) {
  console.error('Playwright authentication tests failed:', error.message);
  process.exit(1);
}

// Run Jest unit tests for auth helpers
console.log('Running Jest unit tests for authentication helpers...');
try {
  execSync(
    'npm test -- --testPathPattern="tests/auth/.*unit.*test" --coverage --coverageDirectory="test-results/auth-reports/coverage"',
    {
      stdio: 'inherit',
      cwd: process.cwd(),
    },
  );
  console.log('Jest authentication tests completed successfully.');
} catch (error) {
  console.error('Jest authentication tests failed:', error.message);
  process.exit(1);
}

console.log(
  'All authentication tests completed. Results are available in test-results/auth-reports/',
);
console.log('To view HTML report: npx playwright show-report test-results/auth-reports');
