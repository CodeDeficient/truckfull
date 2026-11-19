import { Resend } from 'resend';
import { logError, logWarning } from '@/lib/logging';
import type { AdminNotificationEmail } from '@/lib/email/adminNotificationTemplate';

const FROM_EMAIL = 'TruckFull <noreply@truckfull.food>';

export async function sendAdminNotification(message: AdminNotificationEmail): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const recipient = process.env.ADMIN_NOTIFY_EMAIL;

  if (!apiKey || !recipient) {
    logWarning('RESEND_API_KEY or ADMIN_NOTIFY_EMAIL not configured, skipping admin notification');
    return;
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [recipient],
      subject: message.subject,
      html: message.html,
    });
    if (error) {
      logError('Failed to send admin notification email', error);
    }
  } catch (error) {
    logError('Failed to send admin notification email', error);
  }
}
