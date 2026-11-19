export interface GeolocationErrorClassification {
  isExpected: boolean;
  severity: 'warning' | 'error';
}

function hasCode(obj: unknown): obj is { code: number; message: string } {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'code' in obj &&
    typeof (obj as Record<string, unknown>).code === 'number'
  );
}

function getMessage(obj: unknown): string {
  if (hasCode(obj)) return obj.message;
  if (obj instanceof Error) return obj.message;
  return String(obj);
}

const EXPECTED_PATTERNS = ['denied', 'timeout', 'not supported', 'permission'];

function isExpectedMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return EXPECTED_PATTERNS.some((pattern) => lower.includes(pattern));
}

export function classifyGeolocationError(error: unknown): GeolocationErrorClassification {
  if (hasCode(error)) {
    if (error.code === 1 || error.code === 3) {
      return { isExpected: true, severity: 'warning' };
    }
    return { isExpected: false, severity: 'error' };
  }

  const message = getMessage(error);
  if (isExpectedMessage(message)) {
    return { isExpected: true, severity: 'warning' };
  }

  return { isExpected: false, severity: 'error' };
}

export function getGeolocationErrorMessage(error: unknown): string {
  const message = getMessage(error);
  const lower = message.toLowerCase();

  if (lower.includes('denied') || (hasCode(error) && error.code === 1)) {
    return 'Location access denied. Enable it in your browser settings.';
  }
  if (lower.includes('timeout') || (hasCode(error) && error.code === 3)) {
    return 'Location request timed out. Please try again.';
  }
  if (lower.includes('unavailable') || (hasCode(error) && error.code === 2)) {
    return 'Location unavailable. Check your device settings.';
  }

  return 'Unable to get your location. Please try again.';
}
