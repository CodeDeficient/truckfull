import { type NextRequest, NextResponse } from 'next/server';
import { isIP } from 'node:net';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { logError, logWarning } from '@/lib/logging';
import { checkRateLimited, claimSubmissionLimiter, getClientIp } from '@/lib/middleware/rateLimit';
import {
  SUBMISSION_ALLOWED_IMAGE_TYPES,
  SUBMISSION_MAX_FILE_SIZE,
  SUBMISSION_MAX_TOTAL_UPLOAD_SIZE,
  TRUCK_LISTING_SOURCE,
  isSubmissionFileAllowed,
  isSubmissionTotalUploadAllowed,
  validateTruckListingSubmission,
} from '@/lib/claim/truckListingSubmission';
import {
  isSubmissionImageSanitizeError,
  sanitizeSubmissionImage,
  submissionImageSanitizeErrorLabel,
} from '@/lib/claim/submissionImageSanitizer';
import { sendTruckListingSubmissionNotifications } from '@/lib/email/truckListingNotifications';

const SUBMISSION_BUCKET = 'truck-listing-submissions';

function isValidIpAddress(value: string): boolean {
  return isIP(value) > 0;
}

function buildUploadPath(submissionId: string, prefix: 'logo' | 'menu'): string {
  return `${submissionId}/${prefix}-${Date.now()}.webp`;
}

async function recordUploadPaths(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  submissionId: string,
  logoPath: string | null,
  menuAssetPath: string | null,
): Promise<void> {
  if (!logoPath && !menuAssetPath) {
    return;
  }
  const { error: pathError } = await supabase
    .from('truck_listing_submissions')
    .update({ logo_path: logoPath, menu_asset_path: menuAssetPath })
    .eq('id', submissionId);
  if (pathError) {
    logWarning('claim-your-truck submit: failed to record upload paths', {
      submissionId,
      error: pathError.message,
    });
  }
}

function firstErrorField(formData: FormData): string | null {
  const truckName = String(formData.get('truckName') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();

  if (!truckName) {
    return 'Truck name is required.';
  }
  if (!email) {
    return 'Email is required.';
  }
  return null;
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  // The rate-limit key must not be rotatable by spoofed proxy headers. When
  // the IP is not a valid address (e.g. direct-to-app deployments where
  // x-forwarded-for is client-controlled), fall back to a single shared key
  // so the per-IP limit degrades to a global limit instead of a per-request
  // bypass. On Vercel the platform overwrites x-forwarded-for with the real
  // client IP, so this fallback is never hit in production. Note this does
  // not stop valid-format header rotation on untrusted-proxy deployments;
  // a trusted-proxy policy for getClientIp() is tracked in issue #1025.
  const rateLimitKey = isValidIpAddress(ip) ? ip : 'unknown';

  let rateLimitResult: Awaited<ReturnType<typeof checkRateLimited>>;
  try {
    rateLimitResult = await checkRateLimited(
      `claim-submission:${rateLimitKey}`,
      claimSubmissionLimiter,
    );
  } catch (error) {
    // Redis unreachable: fail open (same posture as the unconfigured state)
    // rather than returning a non-JSON 500 for a submission the limit
    // could not evaluate.
    logError('claim-your-truck submit: rate limit check failed', error);
    rateLimitResult = { allowed: true, remaining: 0, reset: 0 };
  }

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many submissions. Please try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': String(rateLimitResult.retryAfter) },
      },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (error) {
    logError('claim-your-truck submit: invalid form data', error);
    return NextResponse.json({ error: 'Invalid submission.' }, { status: 400 });
  }

  const missingField = firstErrorField(formData);
  if (missingField) {
    return NextResponse.json({ error: missingField }, { status: 400 });
  }

  const rawPayload = {
    truckName: String(formData.get('truckName') ?? ''),
    email: String(formData.get('email') ?? ''),
    contactName: String(formData.get('contactName') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    city: String(formData.get('city') ?? ''),
    state: String(formData.get('state') ?? ''),
    website: String(formData.get('website') ?? ''),
    instagram: String(formData.get('instagram') ?? ''),
    facebook: String(formData.get('facebook') ?? ''),
    menuText: String(formData.get('menuText') ?? ''),
    notes: String(formData.get('notes') ?? ''),
    website_hp: String(formData.get('website_hp') ?? ''),
  };

  const validation = validateTruckListingSubmission(rawPayload);

  if (!validation.success || !validation.data) {
    return NextResponse.json(
      { error: validation.errors?.join(' ') ?? 'Invalid submission.' },
      { status: 400 },
    );
  }

  const data = validation.data;
  const isSpam = data.isSpam;

  if (isSpam) {
    // Honeypot tripped: pretend success, persist nothing.
    return NextResponse.json({ success: true });
  }

  const logoFile = formData.get('logo');
  const menuFile = formData.get('menu');

  const logo = logoFile instanceof File && logoFile.size > 0 ? logoFile : null;
  const menu = menuFile instanceof File && menuFile.size > 0 ? menuFile : null;

  const files = [logo, menu].filter((file): file is File => file !== null);
  if (files.length > 0 && !isSubmissionTotalUploadAllowed(files)) {
    return NextResponse.json(
      { error: `Uploads together must be ${SUBMISSION_MAX_TOTAL_UPLOAD_SIZE / (1024 * 1024)}MB or less.` },
      { status: 400 },
    );
  }

  if (logo && !isSubmissionFileAllowed(logo)) {
    return NextResponse.json(
      { error: `Logo must be an image (${SUBMISSION_ALLOWED_IMAGE_TYPES.join(', ')}) up to ${SUBMISSION_MAX_FILE_SIZE / (1024 * 1024)}MB.` },
      { status: 400 },
    );
  }

  if (menu && !isSubmissionFileAllowed(menu)) {
    return NextResponse.json(
      { error: `Menu file must be an image up to ${SUBMISSION_MAX_FILE_SIZE / (1024 * 1024)}MB.` },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();

  const { data: inserted, error: insertError } = await supabase
    .from('truck_listing_submissions')
    .insert({
      status: 'new',
      truck_name: data.truckName,
      contact_name: data.contactName,
      contact_email: data.email,
      phone: data.phone,
      city: data.city,
      state: data.state,
      website: data.website,
      instagram_url: data.instagram,
      facebook_url: data.facebook,
      menu_text: data.menuText,
      notes: data.notes,
      source: TRUCK_LISTING_SOURCE,
      ip_address: isValidIpAddress(ip) ? ip : null,
      user_agent: request.headers.get('user-agent') ?? null,
    })
    .select('id, truck_name')
    .single();

  if (insertError || !inserted) {
    logError('claim-your-truck submit: failed to persist submission', insertError);
    return NextResponse.json({ error: 'Failed to save your submission. Please try again.' }, { status: 500 });
  }

  // Secondary operations below. Failures are logged but never discard the
  // persisted submission and never fail the request.

  const submissionId = inserted.id;
  let logoPath: string | null = null;
  let menuAssetPath: string | null = null;
  const assetWarnings: string[] = [];
  let logoHandled = false;
  let menuHandled = false;

  if (logo || menu) {
    try {
      if (logo) {
        const sanitized = await sanitizeSubmissionImage(Buffer.from(await logo.arrayBuffer()));
        if (isSubmissionImageSanitizeError(sanitized)) {
          logWarning('claim-your-truck submit: logo rejected after decode', {
            submissionId,
            reason: sanitized,
          });
          assetWarnings.push(`Logo: ${submissionImageSanitizeErrorLabel(sanitized)}`);
        } else {
          const uploadPath = buildUploadPath(submissionId, 'logo');
          const { error: uploadError } = await supabase.storage
            .from(SUBMISSION_BUCKET)
            .upload(uploadPath, sanitized.buffer, {
              contentType: sanitized.contentType,
              cacheControl: '3600',
              upsert: false,
            });
          if (uploadError) {
            logWarning('claim-your-truck submit: logo upload failed', {
              submissionId,
              error: uploadError.message,
            });
            assetWarnings.push('Logo: could not be uploaded.');
          } else {
            logoPath = uploadPath;
          }
        }
        logoHandled = true;
      }

      if (menu) {
        const sanitized = await sanitizeSubmissionImage(Buffer.from(await menu.arrayBuffer()));
        if (isSubmissionImageSanitizeError(sanitized)) {
          logWarning('claim-your-truck submit: menu rejected after decode', {
            submissionId,
            reason: sanitized,
          });
          assetWarnings.push(`Menu: ${submissionImageSanitizeErrorLabel(sanitized)}`);
        } else {
          const uploadPath = buildUploadPath(submissionId, 'menu');
          const { error: uploadError } = await supabase.storage
            .from(SUBMISSION_BUCKET)
            .upload(uploadPath, sanitized.buffer, {
              contentType: sanitized.contentType,
              cacheControl: '3600',
              upsert: false,
            });
          if (uploadError) {
            logWarning('claim-your-truck submit: menu upload failed', {
              submissionId,
              error: uploadError.message,
            });
            assetWarnings.push('Menu: could not be uploaded.');
          } else {
            menuAssetPath = uploadPath;
          }
        }
        menuHandled = true;
      }

      if (logoPath || menuAssetPath) {
        try {
          await recordUploadPaths(supabase, submissionId, logoPath, menuAssetPath);
        } catch (pathUpdateError) {
          logError('claim-your-truck submit: path recording exception', pathUpdateError);
        }
      }
    } catch (uploadError) {
      logError('claim-your-truck submit: upload exception', uploadError);
      // An unexpected throw (e.g. arrayBuffer or sharp failure) must still
      // surface a warning so the submitter knows an asset was not stored.
      // Only warn for assets whose processing did not complete: a throw
      // after one asset succeeded must not claim that asset failed.
      if (logo && !logoHandled) {
        assetWarnings.push('Logo: could not be processed.');
      }
      if (menu && !menuHandled) {
        assetWarnings.push('Menu: could not be processed.');
      }
      // A throw between an upload and the path-recording update would
      // orphan the stored asset; record whatever was uploaded. This must
      // never throw: the catch block is the last line of defense for the
      // "never fail the request" invariant.
      try {
        await recordUploadPaths(supabase, submissionId, logoPath, menuAssetPath);
      } catch (pathUpdateError) {
        logError('claim-your-truck submit: path recording exception', pathUpdateError);
      }
    }
  }

  const emailResult = await sendTruckListingSubmissionNotifications({
    submitterEmail: data.email,
    truckName: data.truckName,
    contactName: data.contactName,
    phone: data.phone,
    city: data.city,
    state: data.state,
    website: data.website,
    instagram: data.instagram,
    facebook: data.facebook,
    menuText: data.menuText,
    notes: data.notes,
    submissionId,
  });

  if (!emailResult.internalSent || !emailResult.confirmationSent) {
    logWarning('claim-your-truck submit: one or more notification emails failed', {
      submissionId,
      ...emailResult,
    });
  }

  if (assetWarnings.length > 0) {
    return NextResponse.json({ success: true, warnings: assetWarnings });
  }

  return NextResponse.json({ success: true });
}
