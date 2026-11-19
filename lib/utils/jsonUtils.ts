const JSON_LD_UNSAFE_CHARS = /[<>&\u2028\u2029]/g;

/**
 * Safe JSON property access utility
 *
 * This utility helps safely access properties on JSON fields that may be null,
 * undefined, or have unexpected types. It provides a clean way to extract
 * typed values from JSON while handling edge cases gracefully.
 *
 * @example
 * // Instead of: truck.contact_info?.phone
 * // Use: getJsonString(truck.contact_info, 'phone')
 * const phone = getJsonString(truck.contact_info, 'phone');
 *
 * @example
 * // Instead of: truck.current_location?.lat
 * // Use: getJsonNumber(truck.current_location, 'lat')
 * const lat = getJsonNumber(truck.current_location, 'lat');
 */

// Type definitions for our JSON utilities
type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[];
type JsonObject = { [key: string]: JsonValue } | null | undefined;

/**
 * Safely get a string property from a JSON object
 */
export function getJsonString(obj: JsonObject, key: string): string | undefined {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return undefined;
  }

  const value = obj[key];
  return typeof value === 'string' ? value : undefined;
}

/**
 * Safely get a number property from a JSON object
 */
export function getJsonNumber(obj: JsonObject, key: string): number | undefined {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return undefined;
  }

  const value = obj[key];
  return typeof value === 'number' ? value : undefined;
}

/**
 * Safely get a boolean property from a JSON object
 */
export function getJsonBoolean(obj: JsonObject, key: string): boolean | undefined {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return undefined;
  }

  const value = obj[key];
  return typeof value === 'boolean' ? value : undefined;
}

/**
 * Safely get an object property from a JSON object
 */
export function getJsonObject(obj: JsonObject, key: string): JsonObject {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return undefined;
  }

  const value = obj[key];
  return typeof value === 'object' && value != undefined && !Array.isArray(value)
    ? (value as { [key: string]: JsonValue })
    : undefined;
}

/**
 * Safely get an array property from a JSON object
 */
export function getJsonArray(obj: JsonObject, key: string): JsonValue[] | undefined {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return undefined;
  }

  const value = obj[key];
  return Array.isArray(value) ? value : undefined;
}

/**
 * Safely check if a JSON object has a specific property
 */
export function hasJsonProperty(obj: JsonObject, key: string): boolean {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return false;
  }

  return key in obj;
}

/**
 * Safely get a nested property from a JSON object using dot notation
 */

export function getJsonNested(obj: JsonObject, path: string): JsonValue | undefined {
  if (obj == undefined || typeof obj !== 'object' || Array.isArray(obj) || path === '') {
    return undefined;
  }

  const keys = path.split('.');
  let current: JsonValue | undefined = obj;

  for (const key of keys) {
    const isObject = typeof current === 'object' && current != undefined && !Array.isArray(current);
    if (!isObject) {
      current = undefined;
      break;
    }
    const record = current as Record<string, JsonValue>;
    current = record[key];
  }

  return current;
}

/**
 * Convert a JSON value to a string, handling null/undefined cases
 */
export function jsonToString(value: JsonValue): string {
  if (value == undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(value);
}

/**
 * Convert a JSON value to a number, handling null/undefined cases
 */
export function jsonToNumber(value: JsonValue): number | undefined {
  if (value == undefined) {
    return undefined;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const num = Number(value);
    return Number.isNaN(num) ? undefined : num;
  }

  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }

  return undefined;
}

/**
 * Convert a JSON value to a boolean, handling null/undefined cases
 */
export function jsonToBoolean(value: JsonValue): boolean | undefined {
  let result: boolean | undefined;

  if (value == undefined) {
    result = undefined;
  } else if (typeof value === 'boolean') {
    result = value;
  } else if (typeof value === 'number') {
    result = value !== 0;
  } else if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    result = !(v === '' || v === '0' || v === 'false');
  } else {
    // For objects and arrays, do not coerce to true; return undefined to avoid ambiguous truthiness
    result = undefined;
  }

  return result;
}

export function safeJsonLdStringify(data: unknown): string {
  const serialized = JSON.stringify(data);
  if (serialized === undefined) throw new TypeError('JSON-LD data must be JSON-serializable');
  return serialized.replaceAll(JSON_LD_UNSAFE_CHARS, (character: string): string =>
    `\\u${character.codePointAt(0)!.toString(16).padStart(4, '0')}`,
  );
}
