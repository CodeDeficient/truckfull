# Schedule and Event Components

This directory contains shared React components for displaying recurring schedules and special events in a standardized format.

## Components

### ScheduleEventCard

A reusable card component that displays information for both recurring schedules and special events. The card shows:

- Title/name
- Time information (with date for events)
- Location
- Description (if available)
- Active status toggle (for schedules)
- Recurrence pattern information (if applicable)
- Exception indicators
- Delete functionality

### RecurringSchedulesList

A component that renders a list of recurring schedules using the ScheduleEventCard. It includes:

- Proper grid layout
- Empty state handling
- Type adaptation for different input types

### SpecialEventsList

A component that renders a list of special events using the ScheduleEventCard. It includes:

- Proper grid layout
- Empty state handling
- Type adaptation for different input types

## TypeAdapters

The `TypeAdapters.ts` file contains utility functions that convert between different object shapes for recurring schedules and special events, allowing the shared components to work with various data sources that may have different property names or structures.

- `adaptRecurringSchedule`: Converts various recurring schedule object formats to a standard internal format
- `adaptSpecialEvent`: Converts various special event object formats to a standard internal format
