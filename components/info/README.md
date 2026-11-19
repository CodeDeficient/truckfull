# InfoTruckCard Component Updates

## Overview

This update adds proper data connectivity between the InfoTruckCard component and the schedule/events data stored in the database. The following components and services have been created:

### Components

1. **EnhancedInfoTruckCard.tsx** - An enhanced version of the original InfoTruckCard that properly handles data mapping between database schema and component expectations.

2. **InfoTruckCardWithData.tsx** - A data-connected version that automatically fetches schedule and event data for a specified truck.

### Services

1. **scheduleService.ts** - A service for fetching schedules and events from the database with proper error handling and loading states.

### Mappers

1. **scheduleMapper.ts** - Utility functions for mapping database schema to component expectations.

## Usage

### Using InfoTruckCardWithData (Recommended)

```tsx
import InfoTruckCardWithData from '@/components/info/InfoTruckCardWithData';

// In your component:
<InfoTruckCardWithData truck={foodTruck} />;
```

This component will automatically fetch schedules and events for the truck and display them with proper loading and error states.

### Using EnhancedInfoTruckCard with Pre-fetched Data

If you already have schedule and event data, you can use the EnhancedInfoTruckCard directly:

```tsx
import EnhancedInfoTruckCard from '@/components/info/EnhancedInfoTruckCard';

// In your component:
<EnhancedInfoTruckCard truck={foodTruck} schedules={schedules} events={events} />;
```

## Implementation Details

### Data Flow

1. InfoTruckCardWithData fetches schedule and event data using ScheduleService
2. Data is mapped from database schema to component expectations using scheduleMapper
3. EnhancedInfoTruckCard receives the mapped data and renders it properly
4. Loading and error states are handled gracefully

### Error Handling and Loading States

All components implement comprehensive loading and error handling according to quality guidelines:

### Loading States

- **Full loading**: Shown when both schedules and events are loading
- **Partial loading**: Shown when only schedules or only events are loading
- **Individual loading**: Visual indicators for specific sections (schedules vs events)
- **Skeleton UI**: Provides visual feedback during data fetching

### Error Handling

- **Error boundaries**: Prevent app crashes due to rendering errors in event data
- **Graceful degradation**: Show fallback UI when events fail to load
- **User feedback**: Clear error messages when data fetching fails
- **Accessibility**: Proper ARIA roles for error states
- **Loading retry**: Option to reload data after errors

### Type Safety

All components use TypeScript for type safety:

- Proper typing of database responses
- Type guards for runtime validation
- Strict null checking

## Testing

Unit tests are included for InfoTruckCardWithData that verify:

- Loading state rendering
- Data display after successful fetch
- Error handling when fetch fails

To run tests:

```bash
npm test __tests__/components/info/InfoTruckCardWithData.test.tsx
```

## Migration from Original InfoTruckCard

The original InfoTruckCard has been updated to work with the database schema directly. However, for better separation of concerns and automatic data fetching, we recommend using InfoTruckCardWithData instead.

To migrate:

1. Replace imports of InfoTruckCard with InfoTruckCardWithData
2. Ensure the truck prop includes at minimum id, name, description, and cuisine_type

Example migration:

```tsx
// Before:
import InfoTruckCard from '@/components/info/InfoTruckCard';
<InfoTruckCard truck={truckWithScheduleAndEvents} />;

// After:
import InfoTruckCardWithData from '@/components/info/InfoTruckCardWithData';
<InfoTruckCardWithData truck={truck} />;
```
