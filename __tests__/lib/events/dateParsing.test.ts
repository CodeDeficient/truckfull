import { jest, describe, it, expect } from '@jest/globals';
import { parseEprovalDate, parseEprovalTime, extractPermitStatus } from '@/lib/events/dateParsing';

describe('parseEprovalDate', () => {
  it('parses "11-18-2023" to correct date', () => {
    const result = parseEprovalDate('11-18-2023');
    expect(result).not.toBeNull();
    expect(result!.getFullYear()).toBe(2023);
    expect(result!.getMonth()).toBe(10);
    expect(result!.getDate()).toBe(18);
  });

  it('handles null/empty date string', () => {
    expect(parseEprovalDate(null)).toBeNull();
    expect(parseEprovalDate('')).toBeNull();
    expect(parseEprovalDate(undefined)).toBeNull();
  });

  it('handles malformed date string', () => {
    expect(parseEprovalDate('not-a-date')).toBeNull();
    expect(parseEprovalDate('13-45-2023')).toBeNull();
  });

  it('rejects invalid day for month (e.g., Feb 30)', () => {
    expect(parseEprovalDate('02-30-2026')).toBeNull();
  });

  it('rejects Feb 29 on non-leap year', () => {
    expect(parseEprovalDate('02-29-2025')).toBeNull();
  });

  it('accepts Feb 29 on leap year', () => {
    const result = parseEprovalDate('02-29-2024');
    expect(result).not.toBeNull();
    expect(result!.getMonth()).toBe(1);
    expect(result!.getDate()).toBe(29);
  });

  it('rejects April 31 (April has 30 days)', () => {
    expect(parseEprovalDate('04-31-2026')).toBeNull();
  });
});

describe('parseEprovalTime', () => {
  it('parses "9:00 am" to 24h format string', () => {
    expect(parseEprovalTime('9:00 am')).toBe('09:00');
  });

  it('parses "12:30 pm" correctly (noon)', () => {
    expect(parseEprovalTime('12:30 pm')).toBe('12:30');
  });

  it('parses "12:00 am" correctly (midnight)', () => {
    expect(parseEprovalTime('12:00 am')).toBe('00:00');
  });

  it('parses "5:30 pm" to 24h format', () => {
    expect(parseEprovalTime('5:30 pm')).toBe('17:30');
  });

  it('handles null/empty time string', () => {
    expect(parseEprovalTime(null)).toBeNull();
    expect(parseEprovalTime('')).toBeNull();
    expect(parseEprovalTime(undefined)).toBeNull();
  });
});

describe('extractPermitStatus', () => {
  it('extracts "Approved" from partition key', () => {
    expect(extractPermitStatus('Public_Approved_aa8ad079-f09e-481a-9ebd-387d9a5e037a')).toBe(
      'Approved',
    );
  });

  it('extracts "Submitted" from partition key', () => {
    expect(extractPermitStatus('Public_Submitted_fabaa6f7-694b-478f-9ee0-4453f4a7a8d3')).toBe(
      'Submitted',
    );
  });

  it('extracts "Under Review" from partition key', () => {
    expect(extractPermitStatus('Public_Under Review_0968c8a0-a911-42a4-a449-471d7f18f412')).toBe(
      'Under Review',
    );
  });

  it('returns "unknown" for unrecognized partition key', () => {
    expect(extractPermitStatus('SomeRandomPrefix_abc123')).toBe('unknown');
    expect(extractPermitStatus('')).toBe('unknown');
    expect(extractPermitStatus(null)).toBe('unknown');
  });

  it('extracts "Approved" from RSS partition key', () => {
    expect(extractPermitStatus('RSS_Approved_5880')).toBe('Approved');
  });
});
