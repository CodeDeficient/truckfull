'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { logError } from '@/lib/logging';
import {
  TRUCK_LISTING_SUBMISSION_STATUSES,
  type TruckListingSubmissionStatus,
} from '@/lib/claim/truckListingSubmission';

function isSubmissionStatus(value: string): value is TruckListingSubmissionStatus {
  return (TRUCK_LISTING_SUBMISSION_STATUSES as readonly string[]).includes(value);
}

function isAdminRole(role: string | null): boolean {
  return role === 'admin' || role === 'superadmin';
}

async function requireAdmin(): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: 'Not authenticated' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!isAdminRole(profile?.role ?? null)) {
    return { ok: false, error: 'Admin access required' };
  }

  return { ok: true };
}

export async function updateListingSubmissionStatus(
  submissionId: string,
  status: string,
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }

  if (!isSubmissionStatus(status)) {
    return { success: false, error: 'Invalid status' };
  }

  const adminClient = getSupabaseAdmin();
  const { data: updated, error } = await adminClient
    .from('truck_listing_submissions')
    .update({ status })
    .eq('id', submissionId)
    .select('id')
    .maybeSingle();

  if (error) {
    logError('Failed to update listing submission status', error);
    return { success: false, error: 'Failed to update status' };
  }

  if (!updated) {
    return {
      success: false,
      error:
        'The status change did not take effect — the submission no longer exists. Refresh to see the latest state.',
    };
  }

  revalidatePath('/admin/listing-submissions');
  return { success: true };
}

export async function updateListingSubmissionAdminNotes(
  submissionId: string,
  adminNotes: string,
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }

  const adminClient = getSupabaseAdmin();
  const { data: updated, error } = await adminClient
    .from('truck_listing_submissions')
    .update({ admin_notes: adminNotes })
    .eq('id', submissionId)
    .select('id')
    .maybeSingle();

  if (error) {
    logError('Failed to update listing submission admin notes', error);
    return { success: false, error: 'Failed to update notes' };
  }

  if (!updated) {
    return {
      success: false,
      error:
        'The notes change did not take effect — the submission no longer exists. Refresh to see the latest state.',
    };
  }

  revalidatePath('/admin/listing-submissions');
  return { success: true };
}
