import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { logError, logMessage, logWarning } from '@/lib/logging';
import { Resend } from 'resend';
import { randomInt } from 'node:crypto';
import { provisionFreeTrial } from '@/lib/subscription/trialProvisioning';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const MAX_VERIFICATION_ATTEMPTS = 5;

// Helper to generate cryptographically secure 6-digit code
function generateCode(): string {
  return randomInt(100_000, 1_000_000).toString();
}

/**
 * Sends a verification code to the truck's public email
 */
export async function sendVerificationCode(
  truckId: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();
  let codeRecordId: string | null = null;

  try {
    // 1. Get Truck Email
    const { data: truck, error: truckError } = await supabase
      .from('food_trucks')
      .select('id, name, contact_info')
      .eq('id', truckId)
      .single();

    if (truckError || !truck) {
      return { success: false, error: 'Truck not found or no email on file' };
    }

    const contactInfo = truck.contact_info as Record<string, unknown>;
    const email = contactInfo?.email as string;

    if (!email) {
      return { success: false, error: 'Truck has no public email address' };
    }

    // 2. Generate Code
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins

    // 3. Store in DB
    const { data: insertedCode, error: insertError } = await supabase
      .from('claim_verification_codes')
      .insert({
        food_truck_id: truckId,
        code: code,
        expires_at: expiresAt,
        used: false,
        attempts: 0,
      })
      .select('id')
      .single();

    if (insertError || !insertedCode) {
      console.error('Error inserting verification code:', insertError);
      return { success: false, error: 'Failed to generate verification code' };
    }

    codeRecordId = insertedCode.id;

    // 4. Send Email (with proper error handling)
    if (RESEND_API_KEY) {
      try {
        const resend = new Resend(RESEND_API_KEY);
        const { error: emailError } = await resend.emails.send({
          from: 'TruckFull Support <verify@truckfull.food>',
          to: email,
          subject: `Verify ownership of ${truck.name}`,
          html: `<p>Your verification code for <strong>${truck.name}</strong> is: <strong>${code}</strong></p><p>This code expires in 15 minutes.</p>`,
        });

        if (emailError) {
          throw emailError;
        }
      } catch (emailSendError) {
        // Email failed - invalidate the code so it can't be used
        console.error('Email send failed, invalidating code:', {
          error: emailSendError,
          truckId: truck.id,
          email: (() => {
            const [local, domain] = email.split('@');
            if (!domain) return '***@***';
            const visible = Math.min(local.length, 2);
            const masked = `${local.slice(0, Math.max(0, visible))}${'*'.repeat(Math.max(8 - visible, 4))}@${domain.replaceAll('.', '*.')}`;
            return masked;
          })(),
          codeId: codeRecordId,
        });

        // Mark the code as used/invalid so it cannot be verified
        await supabase
          .from('claim_verification_codes')
          .update({ used: true, used_at: new Date().toISOString() })
          .eq('id', codeRecordId);

        return { success: false, error: 'Failed to send verification email. Please try again.' };
      }
    } else {
      // In dev mode, log code for testing but don't expose in production
      if (process.env.NODE_ENV === 'development') {
        console.info('[DEV] Verification code:', code);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error in sendVerificationCode:', error);

    // If we created a code but something else failed, invalidate it
    if (codeRecordId) {
      await supabase
        .from('claim_verification_codes')
        .update({ used: true, used_at: new Date().toISOString() })
        .eq('id', codeRecordId);
    }

    return { success: false, error: 'Internal error sending code' };
  }
}

/**
 * Verifies the code and claims the truck
 */
export async function verifyClaimCode(
  truckId: string,
  code: string,
  userId: string,
): Promise<{ success: boolean; error?: string; trialStarted?: boolean }> {
  try {
    const supabase = getSupabaseAdmin();

    // 1. Find the most recent valid code for this truck
    const { data: codeRecord, error: codeError } = await supabase
      .from('claim_verification_codes')
      .select('id, code, locked_at')
      .eq('food_truck_id', truckId)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (codeError) {
      console.error('Error fetching verification code:', codeError);
      return { success: false, error: 'Failed to verify code' };
    }

    if (!codeRecord) {
      return {
        success: false,
        error: 'No active verification code found. Please request a new code.',
      };
    }

    // 2. Check if code is locked due to too many attempts
    if (codeRecord.locked_at) {
      return {
        success: false,
        error:
          'This code has been locked due to too many failed attempts. Please request a new code.',
      };
    }

    // 3. Check if code matches
    if (codeRecord.code !== code) {
      // TRULY ATOMIC: Use RPC function to increment attempts and lock in a single DB operation
      // This returns the actual new values from the database, not calculated client-side
      interface IncrementResult {
        new_attempts: number;
        is_locked: boolean;
        was_updated: boolean;
      }

      const { data: incrementResult, error: incrementError } = await supabase
        .rpc('increment_verification_attempts', {
          p_code_id: codeRecord.id,
          p_max_attempts: MAX_VERIFICATION_ATTEMPTS,
        })
        .single();

      if (incrementError) {
        console.error('Error incrementing attempts:', incrementError);
        // Fall back to simple error message on RPC failure
        return { success: false, error: 'Invalid code' };
      }

      // Use actual DB values for remaining attempts calculation
      const result = incrementResult as IncrementResult;
      const actualNewAttempts = result?.new_attempts ?? MAX_VERIFICATION_ATTEMPTS;
      const isLocked = result?.is_locked ?? true;
      const remainingAttempts = MAX_VERIFICATION_ATTEMPTS - actualNewAttempts;

      if (isLocked || remainingAttempts <= 0) {
        return { success: false, error: 'Too many failed attempts. Please request a new code.' };
      }

      return {
        success: false,
        error: `Invalid code. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining.`,
      };
    }

    // 4. Perform Claim
    // A. Claim Truck - ONLY if not already claimed (prevents takeover attacks)
    const { data: claimData, error: truckUpdateError } = await supabase
      .from('food_trucks')
      .update({
        owner_id: userId,
        is_claimed: true,
        claimed_at: new Date().toISOString(),
        claimed_by: userId,
        claim_verification_method: 'email_domain',
      })
      .eq('id', truckId)
      .eq('is_claimed', false) // Guard: only claim unclaimed trucks
      .is('owner_id', null) // Guard: only claim trucks with no owner
      .select('id');

    if (truckUpdateError) {
      console.error(
        'Error claiming truck:',
        truckUpdateError.message,
        truckUpdateError.code,
        truckUpdateError.details,
      );
      return { success: false, error: 'Unable to complete claim. Please contact support.' };
    }

    // Check if any rows were actually updated (prevents takeover of already-claimed trucks)
    if (!claimData || claimData.length === 0) {
      logWarning(`Claim attempt for already-claimed truck ${truckId} by user ${userId}`);
      return {
        success: false,
        error:
          'This truck has already been claimed. Please contact support if you believe this is an error.',
      };
    }

    logMessage(`Truck ${truckId} claimed by user ${userId}`);

    // B. Update User Role
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ role: 'food_truck_owner' })
      .eq('id', userId);

    if (profileError) {
      logError('Error updating profile:', profileError);
      // Non-blocking but bad.
    }

    // C. Mark Code Used
    const { error: codeUpdateError } = await supabase
      .from('claim_verification_codes')
      .update({ used: true, used_at: new Date().toISOString(), used_by: userId })
      .eq('id', codeRecord.id);

    if (codeUpdateError) {
      console.error('Error marking code used:', codeUpdateError);
    }

    // D. Provision 30-day free trial
    const trialResult = await provisionFreeTrial(userId, 'verification_code');
    if (!trialResult.success) {
      logError('Trial provisioning failed for user', userId);
    }

    return { success: true, trialStarted: trialResult.success ? trialResult.provisioned : false };
  } catch (error) {
    console.error('Error in verifyClaimCode:', error);
    return { success: false, error: 'Internal verification error' };
  }
}
