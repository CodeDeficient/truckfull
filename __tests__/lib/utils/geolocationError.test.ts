import { describe, it, expect } from '@jest/globals';
import {
  classifyGeolocationError,
  getGeolocationErrorMessage,
} from '@/lib/utils/geolocationError';

describe('classifyGeolocationError', () => {
  it('classifies PERMISSION_DENIED (code 1) as expected', () => {
    const result = classifyGeolocationError({ code: 1, message: 'User denied' });
    expect(result.isExpected).toBe(true);
    expect(result.severity).toBe('warning');
  });

  it('classifies TIMEOUT (code 3) as expected', () => {
    const result = classifyGeolocationError({ code: 3, message: 'Timeout expired' });
    expect(result.isExpected).toBe(true);
    expect(result.severity).toBe('warning');
  });

  it('classifies POSITION_UNAVAILABLE (code 2) as unexpected', () => {
    const result = classifyGeolocationError({ code: 2, message: 'Position unavailable' });
    expect(result.isExpected).toBe(false);
    expect(result.severity).toBe('error');
  });

  it('classifies unknown error codes as unexpected', () => {
    const result = classifyGeolocationError({ code: 99, message: 'Something weird' });
    expect(result.isExpected).toBe(false);
    expect(result.severity).toBe('error');
  });

  it('classifies plain Error without code as unexpected', () => {
    const result = classifyGeolocationError(new Error('Unknown failure'));
    expect(result.isExpected).toBe(false);
    expect(result.severity).toBe('error');
  });

  it('classifies "denied" substring in message as expected', () => {
    const result = classifyGeolocationError(new Error('Geolocation error: User denied Geolocation'));
    expect(result.isExpected).toBe(true);
    expect(result.severity).toBe('warning');
  });

  it('classifies "timeout" substring in message as expected', () => {
    const result = classifyGeolocationError(new Error('Geolocation error: Timeout expired'));
    expect(result.isExpected).toBe(true);
    expect(result.severity).toBe('warning');
  });

  it('classifies "not supported" as expected', () => {
    const result = classifyGeolocationError(new Error('Geolocation not supported'));
    expect(result.isExpected).toBe(true);
    expect(result.severity).toBe('warning');
  });

  it('classifies "Failed to fetch" as unexpected', () => {
    const result = classifyGeolocationError(new TypeError('Failed to fetch'));
    expect(result.isExpected).toBe(false);
    expect(result.severity).toBe('error');
  });

  it('classifies "permission" substring in message as expected', () => {
    const result = classifyGeolocationError(new Error('Geolocation permission revoked'));
    expect(result.isExpected).toBe(true);
    expect(result.severity).toBe('warning');
  });

  it('classifies undefined input as unexpected', () => {
    const result = classifyGeolocationError(undefined);
    expect(result.isExpected).toBe(false);
    expect(result.severity).toBe('error');
  });
});

describe('getGeolocationErrorMessage', () => {
  it('returns user-friendly message for PERMISSION_DENIED', () => {
    const msg = getGeolocationErrorMessage({ code: 1, message: 'User denied' });
    expect(msg).toBe('Location access denied. Enable it in your browser settings.');
  });

  it('returns user-friendly message for TIMEOUT', () => {
    const msg = getGeolocationErrorMessage({ code: 3, message: 'Timeout' });
    expect(msg).toBe('Location request timed out. Please try again.');
  });

  it('returns user-friendly message for POSITION_UNAVAILABLE', () => {
    const msg = getGeolocationErrorMessage({ code: 2, message: 'Unavailable' });
    expect(msg).toBe('Location unavailable. Check your device settings.');
  });

  it('returns user-friendly message for denied substring', () => {
    const msg = getGeolocationErrorMessage(new Error('User denied Geolocation'));
    expect(msg).toBe('Location access denied. Enable it in your browser settings.');
  });

  it('returns user-friendly message for timeout substring', () => {
    const msg = getGeolocationErrorMessage(new Error('Timeout expired'));
    expect(msg).toBe('Location request timed out. Please try again.');
  });

  it('returns fallback message for unknown errors', () => {
    const msg = getGeolocationErrorMessage(new Error('Something broke'));
    expect(msg).toBe('Unable to get your location. Please try again.');
  });

  it('returns fallback for null/undefined input', () => {
    const msg = getGeolocationErrorMessage(null);
    expect(msg).toBe('Unable to get your location. Please try again.');
  });
});
