import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/utils/server';
import { Resend } from 'resend';
import { logError, logMessage } from '@/lib/logging';
import { z } from 'zod';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Validation schema for invite request
const InviteSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .max(254, 'Email too long')
    .transform((e) => e.toLowerCase().trim()),
  truckId: z.string().uuid('Invalid truck ID').optional(),
  truckName: z.string().max(200).optional(),
  cuisineType: z
    .union([z.string().max(100), z.array(z.string().max(100))])
    .transform((v) => (Array.isArray(v) ? v.filter(Boolean).join(', ') || undefined : v))
    .optional(),
  location: z.string().max(200).optional(),
});

/**
 * POST: Send invite email to a food truck owner
 *
 * This uses Resend for consistent, customizable emails instead of Supabase's
 * built-in templates (which are harder to customize and don't support dynamic
 * truck data in email body).
 *
 * Flow:
 * 1. Admin selects truck and enters owner email
 * 2. We create invite_token record in pending_invites table
 * 3. Send custom branded email via Resend
 * 4. Owner clicks link -> /auth/accept-invite?token=xxx
 * 5. Accept-invite page creates account + auto-claims truck
 */
export async function POST(request: Request) {
  try {
    // Verify admin auth
    const supabase = createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validated = InviteSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validated.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { email, truckId, truckName, cuisineType, location } = validated.data;

    // Use Resend for custom emails if configured
    if (resend && truckId) {
      return await sendCustomInviteEmail(email, truckId, truckName, cuisineType, location, user.id);
    }

    // Fallback to Supabase invite (for generic invites or if Resend not configured)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Build user metadata - available in user.user_metadata after sign up
    // Truck info stays in user_metadata for the accept-invite page to display.
    const userData: Record<string, string> = {};
    if (truckName) userData.truck_name = truckName;
    if (cuisineType) userData.cuisine_type = cuisineType;
    if (location) userData.location = location;
    if (truckId) userData.pending_truck_id = truckId;

    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: userData,
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.truckfull.food'}/auth/complete-signup`,
    });

    if (error) {
      logError('Supabase invite error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Set invited_role in app_metadata (admin-only, not client-writable)
    // so the handle_new_user() trigger reads it from raw_app_meta_data
    // instead of raw_user_meta_data which clients can forge.
    // Note: the trigger fires BEFORE this update runs (on INSERT), so the role
    // will be 'customer' until the user completes the accept-invite flow.
    if (data?.user?.id) {
      const { error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(
        data.user.id,
        { app_metadata: { invited_role: 'food_truck_owner' } },
      );
      if (metadataError) {
        logError('Failed to set invited_role in app_metadata:', metadataError);
        // Don't fail the invite — the email was sent. Log the error for manual follow-up.
        // The accept-invite route will correct the role when the user claims their truck.
      }
    }

    logMessage(`Invite sent via Supabase to ${email} for truck ${truckName || 'generic'}`);

    return NextResponse.json({
      success: true,
      message: `Invite sent to ${email}`,
      userId: data.user?.id,
      method: 'supabase',
    });
  } catch (error) {
    logError('Error sending invite:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Sends a custom branded invite email via Resend with real truck data
 */
async function sendCustomInviteEmail(
  email: string,
  truckId: string,
  truckName?: string,
  cuisineType?: string,
  location?: string,
  adminId?: string,
) {
  if (!resend) {
    return NextResponse.json({ error: 'Email service not configured' }, { status: 503 });
  }

  try {
    // Create invite token using admin client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Generate unique token
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiry

    // Store pending invite
    const { error: insertError } = await supabaseAdmin.from('pending_invites').insert({
      token,
      email,
      truck_id: truckId,
      expires_at: expiresAt.toISOString(),
      invited_by: adminId,
    });

    if (insertError) {
      // Check if it's a duplicate
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'This email has already been invited for this truck' },
          { status: 409 },
        );
      }
      logError('Failed to create invite token:', insertError);
      return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
    }

    // Build invite URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.truckfull.food';
    const inviteUrl = `${baseUrl}/auth/accept-invite?token=${token}`;

    // Send email via Resend
    // Using support@ instead of noreply@ increases inbox trust and deliverability
    // Recipients can reply with questions, reducing spam reports
    const { error: emailError } = await resend.emails.send({
      from: 'TruckFull <support@truckfull.food>',
      to: email,
      subject: truckName
        ? `${truckName} is on TruckFull - Claim Your Listing!`
        : "You're Invited to TruckFull!",
      html: generateInviteEmailHtml(inviteUrl, truckName, cuisineType, location),
    });

    if (emailError) {
      logError('Resend email error:', emailError);
      // Clean up the invite token since email failed
      await supabaseAdmin.from('pending_invites').delete().eq('token', token);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    logMessage(`Custom invite email sent to ${email} for truck ${truckName}`);

    return NextResponse.json({
      success: true,
      message: `Invite sent to ${email}`,
      method: 'resend',
    });
  } catch (error) {
    logError('Custom invite email error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Generates the HTML email template with real truck data
 */
function generateInviteEmailHtml(
  inviteUrl: string,
  truckName?: string,
  cuisineType?: string,
  location?: string,
): string {
  const logoUrl = 'https://www.truckfull.food/truckfull-icon.png';

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
          <!-- Header - Pure black -->
          <tr>
            <td style="background-color: #000000; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
              <img src="${logoUrl}" alt="TruckFull" width="100" height="100" style="display: block; margin: 0 auto 16px; border-radius: 8px; object-fit: contain;">
              <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: bold;">
                ${truckName ? `${truckName} is on TruckFull!` : "You're Invited to TruckFull!"}
              </h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="background-color: #ffffff; padding: 24px;">
              <p style="color: #52525b; margin: 0 0 16px;">Hi there,</p>
              
              ${
                truckName
                  ? `
              <p style="color: #52525b; margin: 0 0 16px;">
                We found <strong>${truckName}</strong>${cuisineType ? ` serving up amazing <strong>${cuisineType}</strong> food` : ''}${location ? ` in the <strong>${location}</strong> area` : ''}, and we've added you to TruckFull.
              </p>
              
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
                <p style="color: #92400e; margin: 0; font-size: 14px;">
                  <strong>Is this information correct?</strong> Claim your listing to verify and update your details.
                </p>
              </div>
              `
                  : `
              <p style="color: #52525b; margin: 0 0 16px;">
                We're building the ultimate platform for food truck owners to connect with hungry customers. 
                Claim your spot on TruckFull today!
              </p>
              `
              }
              
              <div style="background-color: #f8fafc; border-left: 4px solid #dc2626; padding: 16px; margin: 16px 0; border-radius: 4px;">
                <p style="color: #18181b; margin: 0 0 8px; font-weight: 600;">
                  ${truckName ? 'Once you claim your listing, you can:' : 'With TruckFull, you can:'}
                </p>
                <ul style="color: #52525b; margin: 0; padding-left: 20px; font-size: 14px;">
                  <li style="margin-bottom: 4px;">Update your location and operating hours</li>
                  <li style="margin-bottom: 4px;">Showcase your menu and specialties</li>
                  <li style="margin-bottom: 4px;">Connect with local food lovers</li>
                  <li style="margin-bottom: 4px;">Get discovered by new customers</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 24px 0;">
                <a href="${inviteUrl}" style="display: inline-block; background-color: #dc2626; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                  ${truckName ? 'Claim Your Truck for Free' : 'Join TruckFull'}
                </a>
              </div>
              
              <p style="color: #71717a; font-size: 14px; text-align: center; margin: 16px 0 0;">
                This invitation is valid for 7 days. Questions? Reply to this email.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #18181b; padding: 16px; text-align: center; border-radius: 0 0 8px 8px;">
              <p style="color: #a1a1aa; font-size: 12px; margin: 0 0 4px;">
                <a href="https://www.truckfull.food/privacy" style="color: #dc2626; text-decoration: none;">Privacy</a> · 
                <a href="https://www.truckfull.food/terms" style="color: #dc2626; text-decoration: none;">Terms</a>
              </p>
              <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
                TruckFull - Connecting food lovers with amazing trucks
              </p>
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
