const NON_DIGITS = /\D/g;

export const VERIFICATION_CODE_LENGTH = 6;

export const SUPPORT_EMAIL = 'support@truckfull.food' as const;

export function parseVerificationCodeInput(value: string): string {
  return value.replaceAll(NON_DIGITS, '').slice(0, VERIFICATION_CODE_LENGTH);
}

export function buildContactSupportUrl(truckName: string, truckId: string): string {
  const subject = `Truck Claim - ${encodeURIComponent(truckName)}`;
  const body = `Truck ID: ${encodeURIComponent(truckId)}`;
  return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
}

export function parseApiErrorMessage(
  data: unknown,
  fallback: string,
): string {
  if (
    data !== null &&
    typeof data === 'object' &&
    'error' in data
  ) {
    const error = (data as { error: unknown }).error;
    if (typeof error === 'string' && error !== '') {
      return error;
    }
  }
  return fallback;
}

export function buildSendCodeBody(truckId: string): string {
  return JSON.stringify({ truckId });
}

export function buildVerifyCodeBody(truckId: string, code: string): string {
  return JSON.stringify({ truckId, code });
}

export function validateVerificationCode(code: string): string | null {
  if (code.length !== VERIFICATION_CODE_LENGTH) {
    return `Enter ${VERIFICATION_CODE_LENGTH}-digit code`;
  }
  return null;
}
