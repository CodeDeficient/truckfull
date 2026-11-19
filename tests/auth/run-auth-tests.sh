#!/bin/bash
# Script to run all authentication tests and generate reports

echo "Starting Food Truck Finder Authentication Tests..."

# Create reports directory if it doesn't exist
mkdir -p test-results/auth-reports

# Run Playwright authentication tests
echo "Running Playwright authentication tests..."
npx playwright test tests/auth/ --reporter=html,../test-results/auth-reports/results.json,../test-results/auth-reports/results.xml

# Run Jest unit tests for auth helpers
echo "Running Jest unit tests for authentication helpers..."
npm test -- --testPathPattern="tests/auth/.*unit.*test" --coverage --coverageDirectory="test-results/auth-reports/coverage"

echo "Authentication tests completed. Results are available in test-results/auth-reports/"
echo "To view HTML report: npx playwright show-report test-results/auth-reports"