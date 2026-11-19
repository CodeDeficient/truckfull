/**
 * Truck listing submission notifications.
 *
 * Emails are best-effort only. The persisted submission row is the source of
 * truth; these functions never throw and always report success/failure so the
 * caller can log and continue.
 */

import { Resend } from 'resend';
import { z } from 'zod';
import { logError, logWarning } from '@/lib/logging';
import {
  buildInternalNotificationHtml,
  buildSubmitterConfirmationHtml,
  type TruckListingSubmissionEmailParams,
} from '@/lib/email/truckListingSubmissionTemplates';

const SubmissionEmailSchema = z.object({
  submitterEmail: z.string().email(),
  truckName: z.string().min(1).max(200),
  contactName: z.string().max(200).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  city: z.string().max(200).optional().nullable(),
  state: z.string().max(10).optional().nullable(),
  website: z.string().max(500).optional().nullable(),
  instagram: z.string().max(500).optional().nullable(),
  facebook: z.string().max(500).optional().nullable(),
  menuText: z.string().max(6000).optional().nullable(),
  notes: z.string().max(2500).optional().nullable(),
  submissionId: z.string(),
});

const FROM_EMAIL = 'TruckFull <noreply@truckfull.food>';
const SUPPORT_EMAIL = 'support@truckfull.food';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.truckfull.food';

export const TRUCK_LISTING_SUPPORT_SUBJECT = 'New truck listing submission';

async function sendWithResend(
  to: string,
  subject: string,
  html: string,
): Promise<{ sent: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    logWarning('RESEND_API_KEY not configured, skipping truck listing submission email');
    return { sent: false, error: 'Resend not configured' };
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({ from: FROM_EMAIL, to, subject, html });

    if (error) {
      logError('Failed to send truck listing submission email:', error);
      return { sent: false, error: error.message };
    }

    return { sent: true };
  } catch (error) {
    logError('Error sending truck listing submission email:', error);
    return { sent: false, error: error instanceof Error ? error.message : 'Unknown email error' };
  }
}

export async function sendTruckListingSubmissionNotifications(
  params: TruckListingSubmissionEmailParams,
): Promise<{ internalSent: boolean; confirmationSent: boolean }> {
  const validated = SubmissionEmailSchema.safeParse(params);
  if (!validated.success) {
    logError('Invalid truck listing submission email parameters:', validated.error.flatten());
    return { internalSent: false, confirmationSent: false };
  }

  const data = validated.data;

  const [internalSent, confirmationSent] = await Promise.all([
    sendWithResend(
      SUPPORT_EMAIL,
      `${TRUCK_LISTING_SUPPORT_SUBJECT}: ${data.truckName}`,
      buildInternalNotificationHtml(
        {
          submitterEmail: data.submitterEmail,
          truckName: data.truckName,
          contactName: data.contactName ?? null,
          phone: data.phone ?? null,
          city: data.city ?? null,
          state: data.state ?? null,
          website: data.website ?? null,
          instagram: data.instagram ?? null,
          facebook: data.facebook ?? null,
          menuText: data.menuText ?? null,
          notes: data.notes ?? null,
          submissionId: data.submissionId,
        },
        `${BASE_URL}/admin/listing-submissions`,
      ),
    ),
    sendWithResend(
      data.submitterEmail,
      `TruckFull: submission received for ${data.truckName}`,
      buildSubmitterConfirmationHtml({
        submitterEmail: data.submitterEmail,
        truckName: data.truckName,
        contactName: data.contactName ?? null,
        phone: data.phone ?? null,
        city: data.city ?? null,
        state: data.state ?? null,
        website: data.website ?? null,
        instagram: data.instagram ?? null,
        facebook: data.facebook ?? null,
        menuText: data.menuText ?? null,
        notes: data.notes ?? null,
        submissionId: data.submissionId,
      }),
    ),
  ]);

  if (!internalSent.sent) {
    logWarning('Internal submission notification email not sent', {
      submissionId: data.submissionId,
      error: internalSent.error,
    });
  }
  if (!confirmationSent.sent) {
    logWarning('Submitter confirmation email not sent', {
      submissionId: data.submissionId,
      error: confirmationSent.error,
    });
  }

  return { internalSent: internalSent.sent, confirmationSent: confirmationSent.sent };
}
