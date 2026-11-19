const HTML_SPECIAL_CHARS = /[&<>"']/g;

/**
 * Pure HTML template builders for truck listing submission emails.
 * No dependencies on Resend or any external client so they can be tested
 * directly. The notification sender in truckListingNotifications.ts imports
 * these and wraps them with Resend delivery.
 */

export interface TruckListingSubmissionEmailParams {
  submitterEmail: string;
  truckName: string;
  contactName: string | null | undefined;
  phone: string | null | undefined;
  city: string | null | undefined;
  state: string | null | undefined;
  website: string | null | undefined;
  instagram: string | null | undefined;
  facebook: string | null | undefined;
  menuText: string | null | undefined;
  notes: string | null | undefined;
  submissionId: string;
}

export function escapeHtml(text: string): string {
  if (!text) return '';
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replaceAll(HTML_SPECIAL_CHARS, (m) => map[m]);
}

export function formatField(label: string, value: string | null | undefined): string {
  if (!value) return '';
  return `<tr><td style="padding:4px 0;color:#71717a;width:140px;vertical-align:top;font-size:14px;">${escapeHtml(label)}</td><td style="padding:4px 0;color:#18181b;font-size:14px;">${escapeHtml(value)}</td></tr>`;
}

export function buildEmailShell(title: string, rows: string, footerHtml: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="background-color:#000000;padding:24px;text-align:center;border-radius:8px 8px 0 0;">
              <h1 style="color:#ffffff;margin:0;font-size:20px;font-weight:bold;">${escapeHtml(title)}</h1>
            </td>
          </tr>
          <tr>
            <td style="background-color:#dc2626;height:4px;"></td>
          </tr>
          <tr>
            <td style="background-color:#ffffff;padding:24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                ${rows}
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color:#18181b;padding:16px;text-align:center;border-radius:0 0 8px 8px;">
              <p style="color:#a1a1aa;font-size:12px;margin:0;">${footerHtml}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function buildSubmissionDetailRows(params: TruckListingSubmissionEmailParams): string {
  return [
    formatField('Truck', params.truckName),
    formatField('Contact name', params.contactName),
    formatField('Contact email', params.submitterEmail),
    formatField('Phone', params.phone),
    formatField('City', params.city),
    formatField('State', params.state),
    formatField('Website', params.website),
    formatField('Instagram', params.instagram),
    formatField('Facebook', params.facebook),
    formatField('Menu text', params.menuText),
    formatField('Notes', params.notes),
  ].join('');
}

export function buildInternalNotificationHtml(
  params: TruckListingSubmissionEmailParams,
  adminUrl: string,
): string {
  return buildEmailShell(
    'New Truck Listing Submission',
    buildSubmissionDetailRows(params),
    `<a href="${escapeHtml(adminUrl)}" style="color:#a1a1aa;">Review in admin</a>`,
  );
}

export function buildSubmitterConfirmationHtml(
  params: TruckListingSubmissionEmailParams,
): string {
  const greeting = params.contactName
    ? `Hi ${escapeHtml(params.contactName)},`
    : 'Hi,';
  const rows = [
    `<tr><td style="padding:0 0 16px;color:#52525b;font-size:14px;">${greeting}</td></tr>`,
    `<tr><td style="padding:0 0 16px;color:#52525b;font-size:14px;">Thanks for telling us about <strong>${escapeHtml(params.truckName)}</strong>. Your submission was received and a member of the TruckFull team will review it within 24-48 hours.</td></tr>`,
    `<tr><td style="padding:0 0 16px;color:#52525b;font-size:14px;">No action is needed on your end. We may reach out at <strong>${escapeHtml(params.submitterEmail)}</strong> if we need more information.</td></tr>`,
  ].join('');

  return buildEmailShell(
    "We've received your truck information",
    rows,
    'TruckFull - Connecting food lovers with amazing trucks',
  );
}
