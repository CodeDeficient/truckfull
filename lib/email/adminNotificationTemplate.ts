const LINE_BREAKS = /[\r\n]+/g;

export interface AdminNotificationDetail {
  readonly label: string;
  readonly value: string;
}

export interface AdminNotificationEmail {
  readonly subject: string;
  readonly html: string;
}

function escapeHtml(unsafe: string): string {
  return unsafe
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function stripLineBreaks(value: string): string {
  return value.replaceAll(LINE_BREAKS, ' ').trim();
}

export function buildAdminNotificationEmail(
  title: string,
  details: readonly AdminNotificationDetail[],
  sentAt: Date,
): AdminNotificationEmail {
  const rows = [...details, { label: 'Time', value: sentAt.toISOString() }]
    .map((detail) => `<p><strong>${escapeHtml(detail.label)}:</strong> ${escapeHtml(detail.value)}</p>`)
    .join('\n');

  return {
    subject: stripLineBreaks(title),
    html: `<h1>${escapeHtml(title)}</h1>\n${rows}`,
  };
}

export function waitlistNotification(email: string, role: string, sentAt: Date): AdminNotificationEmail {
  return buildAdminNotificationEmail(
    `New waitlist signup: ${role}`,
    [
      { label: 'Email', value: email },
      { label: 'Waitlist', value: role },
    ],
    sentAt,
  );
}

export function accountSignupNotification(email: string, sentAt: Date): AdminNotificationEmail {
  return buildAdminNotificationEmail('New account signup', [{ label: 'Email', value: email }], sentAt);
}
