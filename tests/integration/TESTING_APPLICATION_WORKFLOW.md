# Event Application Workflow - Integration Tests

## Overview

Integration tests for the Event Application Workflow (WBS 6.3.5) using Playwright E2E testing with direct API calls.

## Test File

`tests/integration/application-workflow.api.test.ts`

## Test Coverage

### 1. Application Creation (Pending Status)

- Truck Owner applies to an event
- Application starts with `pending` status
- Validates truck ownership
- Creates application record in database

### 2. Duplicate Application Prevention

- Prevents truck from applying to same event twice
- Returns 409 Conflict with error message
- Checks for existing non-withdrawn applications

### 3. Subscription Tier Gate

- Free tier users cannot apply to paid events
- Returns 403 Forbidden with upgrade_required flag
- Requires payment_disclaimer_accepted for paid events
- Starter/Pro tiers can apply to paid events

### 4. Accept Application

- Organizer accepts pending application
- Status changes to `accepted`
- `responded_at` timestamp set
- `organizer_message` saved if provided
- Email notification triggered (mocked in tests)

### 5. Reject Application

- Organizer rejects pending application
- Status changes to `rejected`
- `organizer_message` saved
- Email notification triggered

### 6. Waitlist Application

- Organizer adds truck to waitlist
- Status changes to `waitlisted`
- Email notification triggered

### 7. Max Vendors Limit

- Prevents accepting beyond event's max_vendors
- Returns 400 Bad Request with error message
- Count only `accepted` applications

### 8. Organizer Ownership Validation

- Prevents organizers from managing other organizers' events
- Returns 404 Not Found
- Verifies event.organizer_id matches authenticated organizer

## Setup Requirements

### Environment

1. **Local Supabase Required**
   - Check `.env.local`: `NEXT_PUBLIC_SUPABASE_URL` should contain `localhost:54321`
   - DO NOT run against production (contains `.supabase.co`)

2. **Dev Server Running**
   - Run: `npm run dev` (in separate terminal)
   - Server must be accessible at `http://localhost:3000`

### Running Tests

```bash
# Start dev server (if not running)
npm run dev

# In another terminal, run tests
npx playwright test --project=api tests/integration/application-workflow.api.test.ts
```

## Test Data Setup

### Created by `test.beforeAll()`:

- **Test Users**: Organizer and Truck Owner with unique emails
- **Organizer Profile**: Verified event organizer
- **Truck Owner Profile**: Free tier subscriber
- **Food Truck**: Test Taco Truck
- **Free Event**: No vendor fee, 5 max vendors
- **Paid Event**: $100 vendor fee, 10 max vendors
- **Auth Sessions**: Supabase JWT tokens for API requests

### Cleanup by `test.afterAll()`:

- Deletes test applications (created in last hour)
- Deletes test events
- Deletes test truck
- Deletes test profiles
- Deletes test auth users

## Email Notifications

Emails are sent asynchronously via Resend (`lib/email/eventNotifications.ts`):

- `notifyApplicationStatusChange()` - Sent on accept/reject/waitlist
- `notifyOrganizerNewApplication()` - Sent on new application

**Note**: Tests verify emails are triggered but don't validate actual email content (Resend mocking would be needed for that).

## Known Limitations

1. **No Resend Mocking**: Tests verify async email calls are made but don't mock/snoop on `resend.emails.send()`
2. **Dev Server Dependency**: Tests fail if dev server isn't running
3. **Database Cleanup**: Tests delete by timestamp - may leave orphaned data if test crashes mid-run

## Future Improvements

- Add Resend mocking to verify email content
- Add test for application withdrawal
- Add test for organizer message HTML escaping
- Add test for concurrent application handling
