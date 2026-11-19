import type { ParsedPost, DataQualityResult, QualityError } from './types';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const HOUR_MINUTE_TIME = /^(\d{1,2}):(\d{2})$/;

const MIN_ADDRESS_LENGTH = 10;
const MIN_COORDINATE_VALUE = -90;
const MAX_COORDINATE_VALUE = 90;

export function validateDataQuality(post: ParsedPost): DataQualityResult {
  const errors: QualityError[] = [];

  if (!post) {
    errors.push({ field: 'post', message: 'Post is null or undefined', severity: 'error' });
    return { isValid: false, errors };
  }

  if (!post.extracted_data) {
    errors.push({ field: 'extracted_data', message: 'Missing extracted data', severity: 'error' });
    return { isValid: false, errors };
  }

  const { extracted_data } = post;

  if (!extracted_data.truck_name || extracted_data.truck_name.trim().length === 0) {
    errors.push({
      field: 'truck_name',
      message: 'Truck name is missing or empty',
      severity: 'warning',
    });
  }

  if (extracted_data.location) {
    validateLocation(extracted_data.location, errors);
  } else {
    errors.push({ field: 'location', message: 'Location is missing', severity: 'error' });
  }

  if (!extracted_data.food_items || extracted_data.food_items.length === 0) {
    errors.push({
      field: 'food_items',
      message: 'No food items found',
      severity: 'error',
    });
  } else if (extracted_data.food_items.some((item) => !item || item.trim().length === 0)) {
    errors.push({
      field: 'food_items',
      message: 'Some food items are empty',
      severity: 'warning',
    });
  }

  if (extracted_data.time) {
    validateTime(extracted_data.time, errors);
  }

  if (!extracted_data.cuisine_type || extracted_data.cuisine_type.length === 0) {
    errors.push({
      field: 'cuisine_type',
      message: 'Cuisine type is missing',
      severity: 'warning',
    });
  }

  const errorCount = errors.filter((e) => e.severity === 'error').length;
  const isValid = errorCount === 0;

  return { isValid, errors };
}

function validateLocation(
  location: { address?: string; latitude?: number; longitude?: number } | undefined,
  errors: QualityError[],
): void {
  if (!location) return;

  const { address, latitude, longitude } = location;

  if (!address || address.trim().length === 0) {
    errors.push({
      field: 'address',
      message: 'Address is missing',
      severity: 'error',
    });
  } else if (address.trim().length < MIN_ADDRESS_LENGTH) {
    errors.push({
      field: 'address',
      message: 'Address is too short or incomplete',
      severity: 'error',
    });
  }

  if (latitude === undefined || latitude === null) {
    errors.push({
      field: 'latitude',
      message: 'Latitude is missing',
      severity: 'warning',
    });
  } else if (
    typeof latitude !== 'number' ||
    latitude < MIN_COORDINATE_VALUE ||
    latitude > MAX_COORDINATE_VALUE ||
    Number.isNaN(latitude)
  ) {
    errors.push({
      field: 'coordinates',
      message: `Invalid latitude value: ${latitude}`,
      severity: 'error',
    });
  }

  if (longitude === undefined || longitude === null) {
    errors.push({
      field: 'longitude',
      message: 'Longitude is missing',
      severity: 'warning',
    });
  } else if (
    typeof longitude !== 'number' ||
    longitude < -180 ||
    longitude > 180 ||
    Number.isNaN(longitude)
  ) {
    errors.push({
      field: 'coordinates',
      message: `Invalid longitude value: ${longitude}`,
      severity: 'error',
    });
  }
}

function validateTime(
  time: { start?: string; end?: string; date?: string } | undefined,
  errors: QualityError[],
): void {
  if (!time) return;

  const { start, end, date } = time;

  if (!date || date.trim().length === 0) {
    errors.push({ field: 'date', message: 'Date is missing', severity: 'warning' });
  } else {
    if (!ISO_DATE.test(date)) {
      errors.push({
        field: 'date',
        message: 'Date format is invalid (should be YYYY-MM-DD)',
        severity: 'warning',
      });
    }
  }

  if (!start || start.trim().length === 0) {
    errors.push({ field: 'time', message: 'Start time is missing', severity: 'warning' });
  } else {
    const startMinutes = parseTimeToMinutes(start);
    if (startMinutes === null) {
      errors.push({
        field: 'time',
        message: `Invalid start time format: ${start}`,
        severity: 'error',
      });
    }
  }

  if (!end || end.trim().length === 0) {
    errors.push({ field: 'time', message: 'End time is missing', severity: 'warning' });
  } else {
    const endMinutes = parseTimeToMinutes(end);
    if (endMinutes === null) {
      errors.push({
        field: 'time',
        message: `Invalid end time format: ${end}`,
        severity: 'error',
      });
    }
  }

  if (start && end) {
    const startMinutes = parseTimeToMinutes(start);
    const endMinutes = parseTimeToMinutes(end);

    if (startMinutes !== null && endMinutes !== null && startMinutes >= endMinutes) {
      errors.push({
        field: 'time',
        message: 'End time must be after start time',
        severity: 'error',
      });
    }
  }
}

function parseTimeToMinutes(timeStr: string): number | null {
  const match = timeStr.trim().match(HOUR_MINUTE_TIME);
  if (!match) return null;

  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
}
