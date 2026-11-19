/**
 * EventFull Email Notification Service
 * WBS: 6.6.1, 6.6.2
 *
 * Centralized email notifications for the EventFull feature.
 * Uses Resend for reliable, branded email delivery.
 */

import { Resend } from 'resend';
import { z } from 'zod';
import { logMessage, logError, logWarning } from '@/lib/logging';

const HTML_SPECIAL_CHARS = /[&<>"']/g;

const EmailValidationSchema = z.object({
  ownerEmail: z.string().email('Invalid email address'),
  ownerName: z.string().optional(),
  truckName: z.string().min(1).max(200),
  eventName: z.string().min(1).max(200),
  newStatus: z.enum(['accepted', 'rejected', 'waitlisted']),
  organizerMessage: z.string().max(1000).optional(),
  eventDate: z.string().optional(),
  eventLocation: z.string().max(500).optional(),
});

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const LOGO_URL = 'https://www.truckfull.food/truckfull-icon.png';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.truckfull.food';

// Email sender - using support@ for better deliverability and trust
const FROM_EMAIL = 'TruckFull <support@truckfull.food>';

/**
 * Escape HTML entities to prevent XSS attacks in email templates
 */
function escapeHtml(text: string): string {
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

/**
 * Notify truck owner when their application status changes
 */
export async function notifyApplicationStatusChange(params: {
  ownerEmail: string;
  ownerName?: string;
  truckName: string;
  eventName: string;
  newStatus: 'accepted' | 'rejected' | 'waitlisted';
  organizerMessage?: string;
  eventDate?: string;
  eventLocation?: string;
}): Promise<boolean> {
  if (!resend) {
    logWarning('Resend not configured, skipping application status email');
    return false;
  }

  const validated = EmailValidationSchema.safeParse(params);
  if (!validated.success) {
    logError('Invalid email parameters:', validated.error.flatten());
    return false;
  }

  const {
    ownerEmail,
    ownerName,
    truckName,
    eventName,
    newStatus,
    organizerMessage,
    eventDate,
    eventLocation,
  } = validated.data;

  const escapedTruckName = escapeHtml(truckName);
  const escapedEventName = escapeHtml(eventName);

  const statusConfig = {
    accepted: {
      emoji: '🎉',
      title: "Congratulations! You're In!",
      message: `Great news! Your application for <strong>${escapedTruckName}</strong> to participate in <strong>${escapedEventName}</strong> has been accepted.`,
      color: '#16a34a', // green
    },
    rejected: {
      emoji: '😔',
      title: 'Application Update',
      message: `Unfortunately, your application for <strong>${escapedTruckName}</strong> to participate in <strong>${escapedEventName}</strong> was not selected this time.`,
      color: '#dc2626', // red
    },
    waitlisted: {
      emoji: '⏳',
      title: "You're on Waitlist",
      message: `Your application for <strong>${escapedTruckName}</strong> to participate in <strong>${escapedEventName}</strong> has been added to waitlist. We'll notify you if a spot opens up.`,
      color: '#f59e0b', // amber
    },
  };

  const config = statusConfig[newStatus];

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: ownerEmail,
      subject: `${config.emoji} ${eventName} - ${config.title}`,
      html: generateApplicationStatusHtml({
        ownerName,
        ...config,
        organizerMessage,
        eventDate,
        eventLocation,
        dashboardUrl: `${BASE_URL}/owner-dashboard?tab=events`,
      }),
    });

    if (error) {
      logError('Failed to send application status email:', error);
      return false;
    }

    logMessage(`Application status email sent to ${ownerEmail}: ${newStatus}`);
    return true;
  } catch (error) {
    logError('Error sending application status email:', error);
    return false;
  }
}

/**
 * Notify organizer when a new application is received
 */
export async function notifyOrganizerNewApplication(params: {
  organizerEmail: string;
  organizerName?: string;
  eventName: string;
  truckName: string;
  cuisineType?: string;
  applicationCount: number;
}): Promise<boolean> {
  if (!resend) {
    logWarning('Resend not configured, skipping new application email');
    return false;
  }

  const { organizerEmail, organizerName, eventName, truckName, cuisineType, applicationCount } =
    params;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: organizerEmail,
      subject: `🚚 New Application: ${truckName} wants to join ${eventName}`,
      html: generateNewApplicationHtml({
        organizerName,
        eventName,
        truckName,
        cuisineType,
        applicationCount,
        dashboardUrl: `${BASE_URL}/organizer`,
      }),
    });

    if (error) {
      logError('Failed to send new application email:', error);
      return false;
    }

    logMessage(`New application email sent to organizer ${organizerEmail} for ${eventName}`);
    return true;
  } catch (error) {
    logError('Error sending new application email:', error);
    return false;
  }
}

/**
 * Notify truck owner of event updates (cancellation, date change, etc.)
 */
export async function notifyEventUpdate(params: {
  ownerEmail: string;
  truckName: string;
  eventName: string;
  updateType: 'cancelled' | 'date_changed' | 'location_changed' | 'info_updated';
  details?: string;
}): Promise<boolean> {
  if (!resend) {
    logWarning('Resend not configured, skipping event update email');
    return false;
  }

  const { ownerEmail, truckName, eventName, updateType, details } = params;

  const updateConfig = {
    cancelled: {
      emoji: '❌',
      title: 'Event Cancelled',
      message: `The event <strong>${eventName}</strong> that ${truckName} was scheduled to attend has been cancelled.`,
    },
    date_changed: {
      emoji: '📅',
      title: 'Event Date Changed',
      message: `The date for <strong>${eventName}</strong> has been updated.`,
    },
    location_changed: {
      emoji: '📍',
      title: 'Event Location Changed',
      message: `The location for <strong>${eventName}</strong> has been updated.`,
    },
    info_updated: {
      emoji: 'ℹ️',
      title: 'Event Updated',
      message: `There have been updates to <strong>${eventName}</strong>.`,
    },
  };

  const config = updateConfig[updateType];

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: ownerEmail,
      subject: `${config.emoji} ${eventName}: ${config.title}`,
      html: generateEventUpdateHtml({
        ...config,
        details,
        dashboardUrl: `${BASE_URL}/owner-dashboard?tab=events`,
      }),
    });

    if (error) {
      logError('Failed to send event update email:', error);
      return false;
    }

    logMessage(`Event update email sent to ${ownerEmail}: ${updateType}`);
    return true;
  } catch (error) {
    logError('Error sending event update email:', error);
    return false;
  }
}

// ========== HTML Template Generators ==========

function generateApplicationStatusHtml(params: {
  ownerName?: string;
  title: string;
  message: string;
  color: string;
  organizerMessage?: string;
  eventDate?: string;
  eventLocation?: string;
  dashboardUrl: string;
}): string {
  const {
    ownerName,
    title,
    message,
    color,
    organizerMessage,
    eventDate,
    eventLocation,
    dashboardUrl,
  } = params;

  const escapedOwnerName = ownerName ? escapeHtml(ownerName) : undefined;
  const escapedEventDate = eventDate ? escapeHtml(eventDate) : undefined;
  const escapedEventLocation = eventLocation ? escapeHtml(eventLocation) : undefined;
  const escapedOrganizerMessage = organizerMessage ? escapeHtml(organizerMessage) : undefined;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <!-- Header -->
          <tr>
            <td style="background-color: #000000; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
              <img src="${LOGO_URL}" alt="TruckFull" width="64" height="64" style="display: block; margin: 0 auto 16px; border-radius: 8px;">
              <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: bold;">${title}</h1>
            </td>
          </tr>
          
          <!-- Accent bar -->
          <tr>
            <td style="background-color: ${color}; height: 4px;"></td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="background-color: #ffffff; padding: 24px;">
              <p style="color: #52525b; margin: 0 0 16px;">Hi${escapedOwnerName ? ` ${escapedOwnerName}` : ''},</p>
              <p style="color: #52525b; margin: 0 0 16px;">${message}</p>

              ${
                escapedEventDate || escapedEventLocation
                  ? `
              <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
                ${escapedEventDate ? `<p style="margin: 0 0 8px; color: #18181b;"><strong>📅 Date:</strong> ${escapedEventDate}</p>` : ''}
                ${escapedEventLocation ? `<p style="margin: 0; color: #18181b;"><strong>📍 Location:</strong> ${escapedEventLocation}</p>` : ''}
              </div>
              `
                  : ''
              }

              ${
                escapedOrganizerMessage
                  ? `
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
                <p style="color: #92400e; margin: 0; font-size: 14px;">
                  <strong>Message from Organizer:</strong><br>
                  ${escapedOrganizerMessage}
                </p>
              </div>
              `
                  : ''
              }
              
              <div style="text-align: center; margin: 24px 0;">
                <a href="${dashboardUrl}" style="display: inline-block; background-color: #dc2626; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold;">
                  View in Dashboard
                </a>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #18181b; padding: 16px; text-align: center; border-radius: 0 0 8px 8px;">
              <p style="color: #a1a1aa; font-size: 12px; margin: 0;">TruckFull - Connecting food lovers with amazing trucks</p>
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

function generateNewApplicationHtml(params: {
  organizerName?: string;
  eventName: string;
  truckName: string;
  cuisineType?: string;
  applicationCount: number;
  dashboardUrl: string;
}): string {
  const { organizerName, eventName, truckName, cuisineType, applicationCount, dashboardUrl } =
    params;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <!-- Header -->
          <tr>
            <td style="background-color: #000000; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
              <img src="${LOGO_URL}" alt="TruckFull" width="64" height="64" style="display: block; margin: 0 auto 16px; border-radius: 8px;">
              <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: bold;">New Application Received!</h1>
            </td>
          </tr>
          
          <!-- Accent bar -->
          <tr>
            <td style="background-color: #16a34a; height: 4px;"></td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="background-color: #ffffff; padding: 24px;">
              <p style="color: #52525b; margin: 0 0 16px;">Hi${organizerName ? ` ${organizerName}` : ''},</p>
              <p style="color: #52525b; margin: 0 0 16px;">
                Great news! <strong>${truckName}</strong>${cuisineType ? ` (${cuisineType})` : ''} has applied to participate in <strong>${eventName}</strong>.
              </p>
              
              <div style="background-color: #f0fdf4; padding: 16px; border-radius: 8px; margin: 16px 0; text-align: center;">
                <p style="margin: 0; color: #166534; font-size: 24px; font-weight: bold;">${applicationCount}</p>
                <p style="margin: 4px 0 0; color: #166534; font-size: 14px;">Total Applications</p>
              </div>
              
              <p style="color: #52525b; margin: 0 0 16px;">
                Review this application in your organizer dashboard to accept, reject, or add to your waitlist.
              </p>
              
              <div style="text-align: center; margin: 24px 0;">
                <a href="${dashboardUrl}" style="display: inline-block; background-color: #dc2626; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold;">
                  Review Applications
                </a>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #18181b; padding: 16px; text-align: center; border-radius: 0 0 8px 8px;">
              <p style="color: #a1a1aa; font-size: 12px; margin: 0;">TruckFull - Connecting food lovers with amazing trucks</p>
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

function generateEventUpdateHtml(params: {
  title: string;
  message: string;
  details?: string;
  dashboardUrl: string;
}): string {
  const { title, message, details, dashboardUrl } = params;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <!-- Header -->
          <tr>
            <td style="background-color: #000000; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
              <img src="${LOGO_URL}" alt="TruckFull" width="64" height="64" style="display: block; margin: 0 auto 16px; border-radius: 8px;">
              <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: bold;">${title}</h1>
            </td>
          </tr>
          
          <!-- Accent bar -->
          <tr>
            <td style="background-color: #f59e0b; height: 4px;"></td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="background-color: #ffffff; padding: 24px;">
              <p style="color: #52525b; margin: 0 0 16px;">${message}</p>
              
              ${
                details
                  ? `
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
                <p style="color: #92400e; margin: 0; font-size: 14px;">${details}</p>
              </div>
              `
                  : ''
              }
              
              <p style="color: #52525b; margin: 16px 0;">Check your dashboard for the latest details.</p>
              
              <div style="text-align: center; margin: 24px 0;">
                <a href="${dashboardUrl}" style="display: inline-block; background-color: #dc2626; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold;">
                  View Details
                </a>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #18181b; padding: 16px; text-align: center; border-radius: 0 0 8px 8px;">
              <p style="color: #a1a1aa; font-size: 12px; margin: 0;">TruckFull - Connecting food lovers with amazing trucks</p>
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
