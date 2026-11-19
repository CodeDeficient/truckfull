# PowerShell script to run all authentication tests and generate reports

Write-Host "Starting Food Truck Finder Authentication Tests..." -ForegroundColor Green

# Create reports directory if it doesn't exist
if (!(Test-Path "test-results/auth-reports")) {
    New-Item -ItemType Directory -Path "test-results/auth-reports" -Force
}

# Run Playwright authentication tests
Write-Host "Running Playwright authentication tests..." -ForegroundColor Yellow
npx playwright test tests/auth/ --reporter=html,../test-results/auth-reports/results.json,../test-results/auth-reports/results.xml

# Run Jest unit tests for auth helpers
Write-Host "Running Jest unit tests for authentication helpers..." -ForegroundColor Yellow
npm test -- --testPathPattern="tests/auth/.*unit.*test" --coverage --coverageDirectory="test-results/auth-reports/coverage"

Write-Host "Authentication tests completed. Results are available in test-results/auth-reports/" -ForegroundColor Green
Write-Host "To view HTML report: npx playwright show-report test-results/auth-reports" -ForegroundColor Green