/**
 * Notification Service
 * Sends confirmation notifications to truck owners
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { logMessage, logWarning } from '@/lib/logging';
import type { UpdateType } from './confirmationQueue';

const HTML_SPECIAL_CHARS = /[&<>"']/g;

function getUpdateTypeLabel(updateType: UpdateType): string {
  if (updateType === 'menu') {
    return 'Menu Update';
  }
  if (updateType === 'location') {
    return 'Location Update';
  }
  if (updateType === 'schedule') {
    return 'Schedule Update';
  }
  return 'Multiple Updates';
}

function getEmailConfig(): { resendApiKey: string | undefined; baseUrl: string } {
  return {
    resendApiKey: globalThis.process?.env?.RESEND_API_KEY,
    baseUrl: globalThis.process?.env?.NEXT_PUBLIC_APP_URL || 'https://truckfull.app',
  };
}

const FROM_EMAIL = 'TruckFull <noreply@truckfull.food>';

interface OwnerInfo {
  email: string;
  name?: string;
  truckName: string;
}

async function getOwnerInfo(truckId: string): Promise<OwnerInfo | null> {
  try {
    const supabase = getSupabaseAdmin();

    const { data: truck, error: truckError } = await supabase
      .from('food_trucks')
      .select('id, name, owner_id')
      .eq('id', truckId)
      .single();

    if (truckError || !truck || !truck.owner_id) {
      logWarning('Truck not found or has no owner', { truckId, error: truckError?.message });
      return null;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', truck.owner_id)
      .single();

    if (profileError || !profile) {
      const { data: user, error: userError } = await supabase.auth.admin.getUserById(
        truck.owner_id,
      );

      if (userError || !user.user) {
        logWarning('Owner profile not found', { truckId, ownerId: truck.owner_id });
        return null;
      }

      return {
        email: user.user.email || '',
        name: user.user.user_metadata?.full_name,
        truckName: truck.name,
      };
    }

    return {
      email: profile.email || '',
      name: profile.full_name || undefined,
      truckName: truck.name,
    };
  } catch (error) {
    logWarning('Error fetching owner info', { truckId, error });
    return null;
  }
}

export async function sendConfirmationNotifications(
  truckId: string,
  updateType: UpdateType,
  proposedData: Record<string, unknown>,
): Promise<boolean> {
  const ownerInfo = await getOwnerInfo(truckId);

  if (!ownerInfo || !ownerInfo.email) {
    logWarning('No owner email found for confirmation notification', { truckId });
    return false;
  }

  const updateTypeLabel = getUpdateTypeLabel(updateType);

  const subject = `Confirm Your Food Truck ${updateTypeLabel}?`;

  const { resendApiKey, baseUrl } = getEmailConfig();

  const html = generateConfirmationEmail({
    ownerName: ownerInfo.name,
    truckName: ownerInfo.truckName,
    updateType,
    proposedData,
    confirmUrl: `${baseUrl}/owner-dashboard`,
    dashboardUrl: `${baseUrl}/owner-dashboard`,
  });

  try {
    if (!resendApiKey) {
      logWarning('RESEND_API_KEY not configured, skipping confirmation email');
      return false;
    }

    const resend = await import('resend');
    const resendClient = new resend.Resend(resendApiKey);

    const { error } = await resendClient.emails.send({
      from: FROM_EMAIL,
      to: ownerInfo.email,
      subject,
      html,
    });

    if (error) {
      logWarning('Failed to send confirmation email', { truckId, email: ownerInfo.email, error });
      return false;
    }

    logMessage('Confirmation email sent', {
      truckId,
      email: ownerInfo.email,
      updateType,
    });

    return true;
  } catch (error) {
    logWarning('Error sending confirmation email', { truckId, error });
    return false;
  }
}

function generateEmailHeader(updateTypeLabel: string): string {
  return `
    <tr>
      <td style="background-color: #000000; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: bold;">
          🧪 Confirm Your ${updateTypeLabel}
        </h1>
      </td>
    </tr>
    <tr>
      <td style="background-color: #f59e0b; height: 4px;"></td>
    </tr>`;
}

function generateEmailBody(params: {
  ownerGreeting: string;
  truckName: string;
  updateTypeLabel: string;
  proposedDataHtml: string;
  confirmUrl: string;
  dashboardUrl: string;
}): string {
  const { ownerGreeting, truckName, updateTypeLabel, proposedDataHtml, confirmUrl, dashboardUrl } =
    params;

  return `
    <tr>
      <td style="background-color: #ffffff; padding: 24px;">
        <p style="color: #52525b; margin: 0 0 16px;">
          Hi${ownerGreeting},
        </p>
        <p style="color: #52525b; margin: 0 0 16px;">
          We found a potential <strong>${updateTypeLabel}</strong> for <strong>${truckName}</strong> from your Facebook post.
        </p>
        
        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
          <p style="color: #92400e; margin: 0; font-size: 14px;">
            We couldn't fully understand this Facebook post. Please confirm it if the update looks right, or reject it if it does not.
          </p>
        </div>
        
        ${proposedDataHtml}
        
        <p style="color: #52525b; margin: 24px 0 16px;">
          This confirmation will expire in <strong>48 hours</strong>.
        </p>
        
        <div style="text-align: center; margin: 24px 0;">
          <a href="${confirmUrl}" style="display: inline-block; background-color: #16a34a; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; margin-right: 12px;">
            Review & Confirm
          </a>
        </div>
        
        <p style="color: #71717a; font-size: 14px; margin: 16px 0;">
          Or view all pending updates in your <a href="${dashboardUrl}" style="color: #dc2626; text-decoration: underline;">Owner Dashboard</a>.
        </p>
      </td>
    </tr>`;
}

function generateEmailFooter(): string {
  return `
    <tr>
      <td style="background-color: #18181b; padding: 16px; text-align: center; border-radius: 0 0 8px 8px;">
        <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
          TruckFull - Connecting food lovers with amazing trucks
        </p>
      </td>
    </tr>`;
}

function generateConfirmationEmail(params: {
  ownerName?: string;
  truckName: string;
  updateType: UpdateType;
  proposedData: Record<string, unknown>;
  confirmUrl: string;
  dashboardUrl: string;
}): string {
  const { ownerName, truckName, updateType, proposedData, confirmUrl, dashboardUrl } = params;

  const updateTypeLabel = getUpdateTypeLabel(updateType);
  const proposedDataHtml = formatProposedData(proposedData, updateType);

  const escapedTruckName = escapeHtml(truckName);
  const escapedOwnerName = ownerName ? escapeHtml(ownerName) : undefined;
  const ownerGreeting = escapedOwnerName ? ` ${escapedOwnerName}` : '';

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
          ${generateEmailHeader(updateTypeLabel)}
          ${generateEmailBody({
            ownerGreeting,
            truckName: escapedTruckName,
            updateTypeLabel,
            proposedDataHtml,
            confirmUrl,
            dashboardUrl,
          })}
          ${generateEmailFooter()}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

function formatProposedData(data: Record<string, unknown>, updateType: UpdateType): string {
  const parts: string[] = [];

  if (updateType === 'menu' || updateType === 'both') {
    const foodItems = data.food_items;
    if (Array.isArray(foodItems) && foodItems.length > 0) {
      const itemsHtml = foodItems.map((item) => `<li>${escapeHtml(String(item))}</li>`).join('');
      parts.push(`
        <div style="background-color: #f0fdf4; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <h3 style="color: #166534; margin: 0 0 8px; font-size: 16px;">📋 Proposed Menu Items</h3>
          <ul style="margin: 0; padding-left: 20px;">${itemsHtml}</ul>
        </div>
      `);
    }
  }

  if (updateType === 'location' || updateType === 'both') {
    const location = data.location as { address?: string } | undefined;
    if (location?.address) {
      parts.push(`
        <div style="background-color: #eff6ff; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <h3 style="color: #1e40af; margin: 0 0 8px; font-size: 16px;">📍 Proposed Location</h3>
          <p style="margin: 0; color: #1e40af;">${escapeHtml(location.address)}</p>
        </div>
      `);
    }
  }

  const times = data.times as
    | { start?: string; end?: string; days?: string[]; scope?: string }
    | undefined;
  if (times && (times.start || times.end || (times.days && times.days.length > 0))) {
    const scheduleParts: string[] = [];

    if (times.days && times.days.length > 0) {
      scheduleParts.push(
        `<p style="margin: 0 0 4px;">Days: ${escapeHtml(times.days.join(', '))}</p>`,
      );
    }

    if (times.start || times.end) {
      const timeStr =
        times.start && times.end
          ? `${escapeHtml(times.start)} - ${escapeHtml(times.end)}`
          : times.start
            ? `Opens: ${escapeHtml(times.start)}`
            : `Closes: ${escapeHtml(times.end!)}`;
      scheduleParts.push(`<p style="margin: 0;">${timeStr}</p>`);
    }

    parts.push(`
      <div style="background-color: #fff7ed; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <h3 style="color: #9a3412; margin: 0 0 8px; font-size: 16px;">🕐 Proposed Schedule</h3>
        ${scheduleParts.join('')}
      </div>
    `);
  }

  return parts.join('');
}

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
