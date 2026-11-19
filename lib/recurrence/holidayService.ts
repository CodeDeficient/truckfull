/**
 * Holiday exception handling for recurring schedules
 * following quality guidelines for proper exception handling
 */

import { Holiday, RecurrenceException } from './recurrenceTypes';

// Base holidays that are commonly observed
const BASE_HOLIDAYS: Holiday[] = [
  {
    id: 'new-year',
    name: "New Year's Day",
    date: '01-01', // Month-Day format for annual holidays
    isAnnual: true,
    description: "New Year's Day",
  },
  {
    id: 'independence-day',
    name: 'Independence Day',
    date: '07-04',
    isAnnual: true,
    description: 'Independence Day',
  },
  {
    id: 'christmas',
    name: 'Christmas Day',
    date: '12-25',
    isAnnual: true,
    description: 'Christmas Day',
  },
  {
    id: 'thanksgiving',
    name: 'Thanksgiving',
    date: '', // Will be calculated dynamically
    isAnnual: true,
    description: 'Thanksgiving Day (4th Thursday in November)',
  },
];

/**
 * Get holidays for a specific year
 */
export function getHolidaysForYear(year: number, countryCode: string = 'US'): Holiday[] {
  const holidays: Holiday[] = [];

  // Add base annual holidays with the specified year
  for (const baseHoliday of BASE_HOLIDAYS) {
    if (baseHoliday.isAnnual) {
      if (baseHoliday.id === 'thanksgiving') {
        // Calculate Thanksgiving: 4th Thursday in November
        const thanksgivingDate = calculateThanksgiving(year);
        holidays.push({
          ...baseHoliday,
          id: `thanksgiving-${year}`,
          date: thanksgivingDate.toISOString().split('T')[0],
          year: year,
          isAnnual: false, // Specific date for this year
        });
      } else {
        // Regular annual holidays
        const [month, day] = baseHoliday.date.split('-');
        const holidayDate = new Date(year, Number.parseInt(month) - 1, Number.parseInt(day));
        holidays.push({
          ...baseHoliday,
          id: `${baseHoliday.id}-${year}`,
          date: holidayDate.toISOString().split('T')[0],
          year: year,
          isAnnual: false,
        });
      }
    }
  }

  // Add country-specific holidays based on country code
  const countryHolidays = getCountrySpecificHolidays(countryCode, year);
  holidays.push(...countryHolidays);

  return holidays;
}

/**
 * Calculate Thanksgiving date (4th Thursday in November)
 */
function calculateThanksgiving(year: number): Date {
  const novemberFirst = new Date(year, 10, 1); // Month 10 = November
  const dayOfWeek = novemberFirst.getDay();
  // Calculate the first Thursday in November
  const firstThursday = new Date(novemberFirst);
  firstThursday.setDate(1 + ((4 - dayOfWeek + 7) % 7));

  // Add 21 days to get the 4th Thursday
  firstThursday.setDate(firstThursday.getDate() + 21);

  return firstThursday;
}

/**
 * Get country-specific holidays
 */
function getCountrySpecificHolidays(countryCode: string, year: number): Holiday[] {
  const holidays: Holiday[] = [];

  switch (countryCode.toUpperCase()) {
    case 'US': {
      // Add US-specific holidays
      holidays.push(
        {
          id: `memorial-day-${year}`,
          name: 'Memorial Day',
          date: calculateMemorialDay(year).toISOString().split('T')[0],
          isAnnual: false,
          year: year,
          description: 'Memorial Day (last Monday in May)',
        },
        {
          id: `labor-day-${year}`,
          name: 'Labor Day',
          date: calculateLaborDay(year).toISOString().split('T')[0],
          isAnnual: false,
          year: year,
          description: 'Labor Day (first Monday in September)',
        },
        {
          id: `columbus-day-${year}`,
          name: 'Columbus Day',
          date: calculateColumbusDay(year).toISOString().split('T')[0],
          isAnnual: false,
          year: year,
          description: 'Columbus Day (second Monday in October)',
        },
      );
      break;
    }
    case 'CA': {
      // Add Canada-specific holidays
      holidays.push({
        id: `canada-day-${year}`,
        name: 'Canada Day',
        date: new Date(year, 6, 1).toISOString().split('T')[0], // July 1st
        isAnnual: false,
        year: year,
        description: 'Canada Day',
      });
      break;
    }
    // Add more countries as needed
  }

  return holidays;
}

/**
 * Calculate Memorial Day (last Monday in May)
 */
function calculateMemorialDay(year: number): Date {
  const mayLast = new Date(year, 5, 0); // Last day of May is May 31st (month 5, day 0 of next month)
  const lastDay = mayLast.getDate();

  // Find the last Monday in May
  for (let day = lastDay; day > lastDay - 7; day--) {
    const date = new Date(year, 4, day); // Month 4 = May
    if (date.getDay() === 1) {
      // Monday = 1
      return date;
    }
  }

  // Fallback (shouldn't happen)
  return new Date(year, 4, 25);
}

/**
 * Calculate Labor Day (first Monday in September)
 */
function calculateLaborDay(year: number): Date {
  // Find the first Monday in September
  for (let day = 1; day <= 7; day++) {
    const date = new Date(year, 8, day); // Month 8 = September
    if (date.getDay() === 1) {
      // Monday = 1
      return date;
    }
  }

  // Fallback (shouldn't happen)
  return new Date(year, 8, 1);
}

/**
 * Calculate Columbus Day (second Monday in October)
 */
function calculateColumbusDay(year: number): Date {
  // Find the second Monday in October
  let mondayCount = 0;
  for (let day = 1; day <= 14; day++) {
    const date = new Date(year, 9, day); // Month 9 = October
    if (date.getDay() === 1) {
      // Monday = 1
      mondayCount++;
      if (mondayCount === 2) {
        return date;
      }
    }
  }

  // Fallback (shouldn't happen)
  return new Date(year, 9, 8);
}

/**
 * Check if a date is a holiday
 */
export function isHoliday(date: Date, countryCode: string = 'US'): boolean {
  const year = date.getFullYear();
  const dateStr = date.toISOString().split('T')[0];

  const holidays = getHolidaysForYear(year, countryCode);
  return holidays.some((holiday) => holiday.date === dateStr);
}

/**
 * Get holiday name if a date is a holiday
 */
export function getHolidayName(date: Date, countryCode: string = 'US'): string | null {
  const year = date.getFullYear();
  const dateStr = date.toISOString().split('T')[0];

  const holidays = getHolidaysForYear(year, countryCode);
  const holiday = holidays.find((h) => h.date === dateStr);
  return holiday ? holiday.name : null;
}

/**
 * Create a holiday exception for a recurring schedule
 */
export function createHolidayException(
  date: Date,
  recurringScheduleId: string,
  type: 'holiday' = 'holiday',
  description?: string,
): RecurrenceException {
  const dateStr = date.toISOString().split('T')[0];
  const holidayName = getHolidayName(date) ?? 'Holiday';

  return {
    id: `holiday-exception-${recurringScheduleId}-${dateStr}`,
    type,
    date: dateStr,
    description: description ?? `Scheduled closed for ${holidayName}`,
    isActive: true,
  };
}

/**
 * Create exceptions for all holidays within a date range
 */
export function createHolidayExceptionsForDateRange(
  startDate: Date,
  endDate: Date,
  recurringScheduleId: string,
  countryCode: string = 'US',
): RecurrenceException[] {
  const exceptions: RecurrenceException[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    if (isHoliday(currentDate, countryCode)) {
      exceptions.push(createHolidayException(currentDate, recurringScheduleId));
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return exceptions;
}

/**
 * Process holidays for recurring schedules
 * This function would typically be called when creating or updating a recurring schedule
 */
export function processHolidaysForRecurringSchedule(
  startDate: string,
  endDate: string,
  countryCode: string = 'US',
): Holiday[] {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();

  const holidays: Holiday[] = [];

  // Get holidays for each year in the range
  for (let year = startYear; year <= endYear; year++) {
    holidays.push(...getHolidaysForYear(year, countryCode));
  }

  // Filter holidays that fall within the date range
  return holidays.filter((holiday) => {
    const holidayDate = new Date(holiday.date);
    return holidayDate >= start && holidayDate <= end;
  });
}

/**
 * Update schedule exceptions based on holidays
 * This function allows owners to modify their holiday exceptions
 */
export function updateScheduleWithHolidayExceptions(
  recurringScheduleId: string,
  holidayDate: Date,
  action: 'skip' | 'open' | 'reschedule',
  newStartTime?: string,
  newEndTime?: string,
  newLocation?: string,
): RecurrenceException {
  const dateStr = holidayDate.toISOString().split('T')[0];

  let description = 'Rescheduled for holiday';
  if (action === 'skip') {
    description = 'Scheduled closed for holiday';
  } else if (action === 'open') {
    description = 'Open during holiday';
  }

  const exception: RecurrenceException = {
    id: `holiday-override-${recurringScheduleId}-${dateStr}`,
    type: 'holiday',
    date: dateStr,
    isActive: true,
    description,
  };

  if (action === 'reschedule') {
    if (newStartTime) exception.newStartTime = newStartTime;
    if (newEndTime) exception.newEndTime = newEndTime;
    if (newLocation) exception.newLocation = newLocation;
  }

  return exception;
}
