import { describe, it, expect } from '@jest/globals';
import {
  buildSubmissionDetailRows,
  buildInternalNotificationHtml,
  buildSubmitterConfirmationHtml,
} from '@/lib/email/truckListingSubmissionTemplates';

const BASE_PARAMS = {
  submitterEmail: 'joe@example.com',
  truckName: "Joe's BBQ",
  contactName: 'Joe Smith',
  phone: null,
  city: 'Augusta',
  state: 'GA',
  website: 'https://bbq.example.com',
  instagram: null,
  facebook: null,
  menuText: 'Brisket: $12\nRibs: $15',
  notes: 'Plays the Riverwalk on weekends.',
  submissionId: 'submission-123',
} as const;

describe('truckListingNotifications pure functions', () => {
  describe('buildSubmissionDetailRows', () => {
    it('includes the truck name (escaped) and contact email fields', () => {
      const html = buildSubmissionDetailRows(BASE_PARAMS);

      expect(html).toContain('Joe&#039;s BBQ');
      expect(html).toContain('joe@example.com');
    });

    it('escapes HTML in supplied values', () => {
      const html = buildSubmissionDetailRows({
        ...BASE_PARAMS,
        truckName: '<script>alert(1)</script>',
        notes: 'Tom & Jerry <b>truck</b>',
      });

      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
      expect(html).toContain('Tom &amp; Jerry');
    });

    it('omits rows for null optional fields', () => {
      const html = buildSubmissionDetailRows(BASE_PARAMS);

      expect(html).not.toContain('Phone');
      expect(html).not.toContain('Instagram');
      expect(html).not.toContain('Facebook');
    });
  });

  describe('buildInternalNotificationHtml', () => {
    it('contains the title and admin review link', () => {
      const html = buildInternalNotificationHtml(
        BASE_PARAMS,
        'https://www.truckfull.food/admin/listing-submissions',
      );

      expect(html).toContain('New Truck Listing Submission');
      expect(html).toContain('/admin/listing-submissions');
    });
  });

  describe('buildSubmitterConfirmationHtml', () => {
    it('greets the submitter and confirms receipt', () => {
      const html = buildSubmitterConfirmationHtml(BASE_PARAMS);

      expect(html).toContain('We&#039;ve received your truck information');
      expect(html).toContain('Hi Joe Smith');
      expect(html).toContain('Joe&#039;s BBQ');
    });

    it('works without a contact name', () => {
      const html = buildSubmitterConfirmationHtml({ ...BASE_PARAMS, contactName: null });

      expect(html).toContain('We&#039;ve received your truck information');
      expect(html).not.toContain('Hi Joe Smith');
    });

    it('escapes the truck name', () => {
      const html = buildSubmitterConfirmationHtml({
        ...BASE_PARAMS,
        truckName: '<img src=x onerror=alert(1)>',
      });

      expect(html).not.toContain('<img');
      expect(html).toContain('&lt;img');
    });
  });
});
