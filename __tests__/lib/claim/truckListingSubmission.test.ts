import { describe, it, expect } from '@jest/globals';
import {
  parseSubmissionState,
  parseSubmissionUrl,
  validateTruckListingSubmission,
  isSubmissionFileAllowed,
  isSubmissionTotalUploadAllowed,
  SUBMISSION_MAX_FILE_SIZE,
  SUBMISSION_MAX_TOTAL_UPLOAD_SIZE,
  TRUCK_LISTING_SOURCE,
  TRUCK_LISTING_SUBMISSION_STATUSES,
} from '@/lib/claim/truckListingSubmission';

describe('truckListingSubmission pure functions', () => {
  describe('parseSubmissionState', () => {
    it('upper-cases and trims a state code', () => {
      expect(parseSubmissionState(' ga ')).toBe('GA');
    });

    it('returns empty string for empty input', () => {
      expect(parseSubmissionState('')).toBe('');
      expect(parseSubmissionState(null)).toBe('');
      expect(parseSubmissionState(undefined)).toBe('');
    });

    it('maps full state names to their abbreviations', () => {
      expect(parseSubmissionState('Georgia')).toBe('GA');
      expect(parseSubmissionState('TEXAS')).toBe('TX');
      expect(parseSubmissionState('new york')).toBe('NY');
    });

    it('normalizes an already-correct two-letter code', () => {
      expect(parseSubmissionState('ga')).toBe('GA');
    });

    it('passes through unrecognized input without truncating', () => {
      expect(parseSubmissionState('Georgia Peach')).toBe('Georgia Peach');
    });
  });

  describe('parseSubmissionUrl', () => {
    it('trims whitespace', () => {
      expect(parseSubmissionUrl('  https://example.com  ')).toBe('https://example.com');
    });

    it('returns empty string for empty input', () => {
      expect(parseSubmissionUrl('')).toBe('');
      expect(parseSubmissionUrl(null)).toBe('');
      expect(parseSubmissionUrl(undefined)).toBe('');
    });

    it('prepends https:// when the scheme is missing', () => {
      expect(parseSubmissionUrl('example.com')).toBe('https://example.com');
      expect(parseSubmissionUrl('www.example.com/menu')).toBe('https://www.example.com/menu');
    });

    it('keeps an existing http scheme', () => {
      expect(parseSubmissionUrl('http://example.com')).toBe('http://example.com');
    });

    it('keeps an existing https scheme', () => {
      expect(parseSubmissionUrl('https://example.com')).toBe('https://example.com');
    });
  });

  describe('validateTruckListingSubmission', () => {
    it('accepts the minimal required fields', () => {
      const result = validateTruckListingSubmission({
        truckName: 'Sample BBQ BBQ',
        email: 'joe@example.com',
      });

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        truckName: 'Sample BBQ BBQ',
        email: 'joe@example.com',
        isSpam: false,
      });
      expect(result.data?.contactName).toBeNull();
      expect(result.data?.city).toBeNull();
      expect(result.data?.website).toBeNull();
    });

    it('rejects a missing truck name', () => {
      const result = validateTruckListingSubmission({ truckName: ' ', email: 'joe@example.com' });
      expect(result.success).toBe(false);
      expect(result.errors?.join(' ')).toContain('Truck name is required');
    });

    it('rejects an invalid email', () => {
      const result = validateTruckListingSubmission({ truckName: 'Taco Truck', email: 'not-an-email' });
      expect(result.success).toBe(false);
      expect(result.errors?.join(' ')).toContain('valid email');
    });

    it('maps empty optional strings to null', () => {
      const result = validateTruckListingSubmission({
        truckName: 'Taco Truck',
        email: 'joe@example.com',
        contactName: '',
        phone: '',
        city: 'Augusta',
        state: 'GA',
      });

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        contactName: null,
        phone: null,
        city: 'Augusta',
        state: 'GA',
      });
    });

    it('normalizes optional URLs with the https prefix', () => {
      const result = validateTruckListingSubmission({
        truckName: 'Taco Truck',
        email: 'joe@example.com',
        website: 'samplebbq.example.com',
        instagram: 'https://instagram.com/truck',
      });

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        website: 'https://samplebbq.example.com',
        instagram: 'https://instagram.com/truck',
      });
    });

    it('rejects a website that is not a valid URL', () => {
      const result = validateTruckListingSubmission({
        truckName: 'Taco Truck',
        email: 'joe@example.com',
        website: 'not a url at all',
      });

      expect(result.success).toBe(false);
      expect(result.errors?.join(' ')).toContain('valid URL');
    });

    it('flags submissions with a filled honeypot as spam', () => {
      const result = validateTruckListingSubmission({
        truckName: 'Taco Truck',
        email: 'joe@example.com',
        website_hp: 'filled by a bot',
      });

      expect(result.success).toBe(true);
      expect(result.data?.isSpam).toBe(true);
    });

    it('flags submissions with a very long honeypot as spam', () => {
      const result = validateTruckListingSubmission({
        truckName: 'Taco Truck',
        email: 'joe@example.com',
        website_hp: 'x'.repeat(2000),
      });

      expect(result.success).toBe(true);
      expect(result.data?.isSpam).toBe(true);
    });

    it('does not flag submissions with an empty honeypot', () => {
      const result = validateTruckListingSubmission({
        truckName: 'Taco Truck',
        email: 'joe@example.com',
        website_hp: '',
      });

      expect(result.success).toBe(true);
      expect(result.data?.isSpam).toBe(false);
    });

    it('truncates an over-long menu text', () => {
      const longText = 'x'.repeat(6000);
      const result = validateTruckListingSubmission({
        truckName: 'Taco Truck',
        email: 'joe@example.com',
        menuText: longText,
      });

      expect(result.success).toBe(false);
    });

    it('normalizes the state field through parseSubmissionState', () => {
      const result = validateTruckListingSubmission({
        truckName: 'Taco Truck',
        email: 'joe@example.com',
        state: 'Georgia',
      });

      expect(result.success).toBe(true);
      expect(result.data?.state).toBe('GA');
    });
  });

  describe('isSubmissionFileAllowed', () => {
    it('accepts a jpeg under the size limit', () => {
      expect(isSubmissionFileAllowed({ type: 'image/jpeg', size: 1024 })).toBe(true);
    });

    it('rejects a pdf', () => {
      expect(isSubmissionFileAllowed({ type: 'application/pdf', size: 1024 })).toBe(false);
    });

    it('rejects gif files (not in the accepted format set)', () => {
      expect(isSubmissionFileAllowed({ type: 'image/gif', size: 1024 })).toBe(false);
    });

    it('rejects files over the size limit', () => {
      expect(
        isSubmissionFileAllowed({ type: 'image/png', size: SUBMISSION_MAX_FILE_SIZE + 1 }),
      ).toBe(false);
    });

    it('rejects unknown mime types', () => {
      expect(isSubmissionFileAllowed({ type: 'text/html', size: 1024 })).toBe(false);
    });
  });

  describe('isSubmissionTotalUploadAllowed', () => {
    it('allows an empty file list', () => {
      expect(isSubmissionTotalUploadAllowed([])).toBe(true);
    });

    it('allows a single file under the limit', () => {
      expect(
        isSubmissionTotalUploadAllowed([{ size: SUBMISSION_MAX_FILE_SIZE }]),
      ).toBe(true);
    });

    it('allows two files under the combined limit', () => {
      expect(
        isSubmissionTotalUploadAllowed([
          { size: 2 * 1024 * 1024 },
          { size: 1024 * 1024 },
        ]),
      ).toBe(true);
    });

    it('rejects files exceeding the combined limit', () => {
      expect(
        isSubmissionTotalUploadAllowed([
          { size: SUBMISSION_MAX_FILE_SIZE },
          { size: SUBMISSION_MAX_FILE_SIZE },
        ]),
      ).toBe(false);
    });

    it('rejects a single file over the combined limit', () => {
      expect(
        isSubmissionTotalUploadAllowed([{ size: SUBMISSION_MAX_TOTAL_UPLOAD_SIZE + 1 }]),
      ).toBe(false);
    });
  });

  describe('constants', () => {
    it('uses the claim_your_truck_form source identifier', () => {
      expect(TRUCK_LISTING_SOURCE).toBe('claim_your_truck_form');
    });

    it('exposes the lifecycle statuses', () => {
      expect(TRUCK_LISTING_SUBMISSION_STATUSES).toEqual([
        'new',
        'reviewing',
        'needs_info',
        'ready',
        'created',
        'declined',
        'duplicate',
      ]);
    });
  });
});
