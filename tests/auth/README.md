# Authentication Tests for Food Truck Finder

This directory contains comprehensive authentication tests for the food truck finder application, focusing on security and proper authentication flows.

## Test Files

### 1. `comprehensive-auth.test.ts`

- Tests email/password authentication flows
- Verifies session management and token refresh
- Tests role-based access control
- Tests authorization flows and redirects
- Includes concurrent session testing
- Tests token management and expiration handling

### 2. `oauth-providers.test.ts`

- Tests OAuth provider configuration status
- Tests Google and GitHub OAuth integration (when configured)
- Tests OAuth callback handling
- Verifies role-based redirects after OAuth login
- Tests OAuth session management

### 3. `auth-helpers.unit.test.ts`

- Unit tests for authentication helper functions
- Tests `verifyAdminAccess`, `verifyRoleFromCookies`, and related functions
- Tests role hierarchy and access control functions
- Tests security checks and rate limiting

### 4. `middleware-auth.test.ts`

- Tests authentication middleware functionality
- Tests the `withAuth`, `withValidation`, and `withAuthValidation` HOCs
- Tests rate limiting implementation
- Tests request body validation

### 5. `security-validation.test.ts`

- Security-focused tests for authentication system
- Tests for authentication bypass prevention
- Tests CSRF protection
- Tests secure session configuration
- Tests brute force protection
- Tests secure logout functionality
- Tests API endpoint authentication

## Running the Tests

### All Authentication Tests

```bash
npm run test:e2e:auth
# or
pnpm test:e2e:auth
# or
yarn test:e2e:auth
```

### Individual Test Files

```bash
# Run specific authentication test
npx playwright test tests/auth/comprehensive-auth.test.ts

# Run with UI mode for debugging
npx playwright test tests/auth/comprehensive-auth.test.ts --ui

# Run with specific browser
npx playwright test tests/auth/comprehensive-auth.test.ts --project=chromium
```

## Test Coverage

### Authentication Methods

- [x] Email/Password authentication
- [x] OAuth providers (Google, GitHub)
- [x] Session management
- [x] Token refresh
- [x] Role-based access control
- [x] Middleware protection

### Security Aspects

- [x] Authentication bypass prevention
- [x] CSRF protection
- [x] Secure session configuration
- [x] Brute force protection
- [x] User enumeration prevention
- [x] Horizontal privilege escalation prevention
- [x] Secure logout functionality
- [x] API endpoint protection

### Role Testing

- [x] Superadmin access validation
- [x] Admin access validation
- [x] Food truck owner access validation
- [x] Customer access validation
- [x] Role hierarchy enforcement

## Test Environment Setup

The authentication tests require:

1. **Test Users**: The tests create temporary users for testing:
   - Customer user: `test.auth.user@example.com`
   - Admin user: `test.auth.admin@example.com`
   - Owner user: `test.auth.owner@example.com`
   - Superadmin: `superadmin@example.com` (as defined in the application)

2. **Environment Variables**: Ensure the following are set in your `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

3. **OAuth Configuration**: If testing OAuth providers, ensure they're configured in Supabase dashboard

## Test Structure

### Setup and Teardown

- Each test suite creates temporary users before testing
- All test users are cleaned up after testing
- Cookies and local storage are cleared before each test

### Test Categories

1. **Functional Tests**: Test that authentication works as expected
2. **Security Tests**: Test for potential vulnerabilities
3. **Integration Tests**: Test authentication with other system components
4. **Performance Tests**: Test authentication under load conditions

## Security Considerations

The tests verify:

- Passwords are properly hashed and never stored in plain text
- Authentication tokens are properly secured
- Session management follows security best practices
- Rate limiting prevents brute force attacks
- API endpoints are properly protected
- Role-based access controls function correctly
- Authentication bypass attempts are blocked
- Session fixation attacks are prevented

## Troubleshooting

1. **Test users not being created**: Ensure the Supabase service role key has admin privileges
2. **OAuth tests failing**: Verify OAuth providers are configured in the Supabase dashboard
3. **Rate limiting tests failing**: This may be due to shared test environment; tests should be run sequentially
4. **Session tests failing**: Check that the application properly manages session state

## Continuous Integration

These tests should be run in CI/CD pipelines as part of the security validation process. They should be run in a separate stage from unit tests to avoid conflicts with authentication state.
