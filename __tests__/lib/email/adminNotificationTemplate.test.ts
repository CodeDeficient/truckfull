import { describe, it, expect } from '@jest/globals';
import {
  accountSignupNotification,
  buildAdminNotificationEmail,
  waitlistNotification,
} from '@/lib/email/adminNotificationTemplate';

const SENT_AT = new Date('2026-10-28T15:00:00.000Z');

describe('adminNotificationTemplate', () => {
  it('builds a waitlist email naming the waitlist and the email', () => {
    const message = waitlistNotification('jo@example.com', 'api_customer', SENT_AT);

    expect(message.subject).toBe('New waitlist signup: api_customer');
    expect(message.html).toContain('jo@example.com');
    expect(message.html).toContain('<strong>Waitlist:</strong> api_customer');
    expect(message.html).toContain('2026-10-28T15:00:00.000Z');
  });

  it('builds an account signup email', () => {
    const message = accountSignupNotification('new@example.com', SENT_AT);

    expect(message.subject).toBe('New account signup');
    expect(message.html).toContain('<strong>Email:</strong> new@example.com');
  });

  it('escapes HTML in titles, labels, and values', () => {
    const message = buildAdminNotificationEmail(
      '<b>Title</b>',
      [{ label: 'A&B', value: '<script>alert(1)</script>' }],
      SENT_AT,
    );

    expect(message.html).not.toContain('<script>');
    expect(message.html).toContain('&lt;script&gt;');
    expect(message.html).toContain('A&amp;B');
    expect(message.html).toContain('&lt;b&gt;Title&lt;/b&gt;');
  });

  it('removes line breaks from the subject', () => {
    const message = buildAdminNotificationEmail('Line one\r\nBcc: x@example.com', [], SENT_AT);

    expect(message.subject).toBe('Line one Bcc: x@example.com');
  });
});
