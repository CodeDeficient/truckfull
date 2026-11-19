# Recurring Schedule System

This system provides comprehensive functionality for managing recurring schedules, including advanced recurrence patterns, timezone handling, and holiday exceptions.

## Features

- **Advanced Recurrence Patterns**: Support for daily, weekly, monthly, and yearly recurrence patterns with customizable intervals
- **Timezone Handling**: Proper timezone conversion and display for schedules across different regions
- **Holiday Exceptions**: Automatic detection and handling of holidays with options to skip, reschedule, or keep open
- **Validation**: Comprehensive validation for all recurrence patterns and exceptions
- **Flexible Configuration**: Options to skip weekends, set end dates, and define complex recurrence rules

## Components

### 1. Recurrence Types (`recurrenceTypes.ts`)

Defines the core interfaces for recurrence patterns:

- `RecurrencePattern`: Configuration for recurrence rules (frequency, intervals, etc.)
- `RecurrenceException`: Handling for schedule exceptions (holidays, closures)
- `RecurringSchedule`: Complete recurring schedule with pattern and exceptions
- `RecurrenceOccurrence`: Individual occurrence generated from a pattern

### 2. Recurrence Processor (`recurrenceProcessor.ts`)

Handles the core recurrence logic:

- `calculateRecurrenceOccurrences`: Generate all occurrences for a pattern within a date range
- `convertTimeBetweenTimezones`: Convert times between different timezones
- `formatDateTimeForTimezone`: Format dates/times for specific timezones
- Pattern-specific generators for daily, weekly, monthly, and yearly recurrences

### 3. Holiday Service (`holidayService.ts`)

Manages holiday detection and exceptions:

- `getHolidaysForYear`: Fetch holidays for a specific year and country
- `isHoliday`: Check if a date is a holiday
- `createHolidayException`: Create exceptions for holidays
- `processHolidaysForRecurringSchedule`: Process holidays for a recurring schedule

### 4. Recurrence Validator (`recurrenceValidator.ts`)

Validates recurrence patterns and schedules:

- `validateRecurrencePattern`: Validate a recurrence pattern configuration
- `validateRecurringSchedule`: Validate a complete recurring schedule
- `validateRecurrenceException`: Validate an exception entry
- `validateCompleteRecurringSchedule`: Validate all aspects of a schedule

## Usage Examples

### Creating a Recurring Schedule

```typescript
import { ScheduleService } from '@/lib/supabase/services/scheduleService';

const recurrencePattern = {
  frequency: 'weekly',
  interval: 1,
  daysOfWeek: ['mon', 'wed', 'fri'],
  skipWeekends: true,
  timezone: 'America/New_York',
  isActive: true,
};

const recurringSchedule = {
  title: 'Weekly Market Schedule',
  description: 'Market schedule for downtown location',
  baseLocation: 'Downtown Market',
  baseStartTime: '10:00',
  baseEndTime: '18:00',
  recurrencePattern,
  exceptions: [],
};

const result = await ScheduleService.createRecurringSchedule(
  recurringSchedule,
  'food-truck-id-123',
);
```

### Calculating Occurrences

```typescript
import { ScheduleService } from '@/lib/supabase/services/scheduleService';

const processingOptions = {
  startDate: '2025-01-01',
  endDate: '2025-12-31',
  timezone: 'America/New_York',
  includeExceptions: true,
  includeHolidays: true,
  maxOccurrences: 100,
};

const occurrences = await ScheduleService.calculateScheduleOccurrences(
  recurringSchedule,
  processingOptions,
);
```

### Adding Holiday Exceptions

```typescript
import { updateScheduleWithHolidayExceptions } from '@/lib/recurrence/holidayService';

// Skip the schedule on Christmas
const christmasException = updateScheduleWithHolidayExceptions(
  'rec-123',
  new Date('2025-12-25'),
  'skip',
);

// Reschedule for Christmas Eve with different timing
const christmasEveException = updateScheduleWithHolidayExceptions(
  'rec-123',
  new Date('2025-12-24'),
  'reschedule',
  '09:00',
  '20:00',
  'Special Holiday Location',
);
```

## Best Practices

1. **Validation First**: Always validate recurrence patterns before creating schedules
2. **Timezone Consistency**: Use consistent timezones throughout your application
3. **Performance**: Limit the number of occurrences generated to prevent performance issues
4. **Holiday Handling**: Plan for common holidays when setting up recurring schedules
5. **Testing**: Test recurrence patterns across month/year boundaries

## Integration with Existing System

The recurrence system integrates with the existing schedule service and can be used alongside the traditional schedule system. The `ScheduleTab` component has been updated to support both simple schedules and complex recurring patterns.

## Database Considerations

While the current implementation includes mock data functionality, a production system would require:

1. Database tables for recurring schedules
2. Tables for recurrence exceptions
3. Proper indexing for efficient occurrence calculations
4. Migration scripts for existing schedule data
