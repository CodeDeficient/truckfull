/**
 * Fraud Detection API
 * WBS: 6.7.1
 *
 * GET: Fetch fraud indicators and suspicious entities
 * POST: Take action (shadowban, suspend, flag, require verification)
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/utils/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { logError, logMessage } from '@/lib/logging';
import { z } from 'zod';

const ActionSchema = z.object({
  action: z.enum(['shadowban', 'suspend', 'require_verification', 'flag_refund', 'clear_flag']),
  entity_type: z.enum(['organizer', 'event', 'application']),
  entity_id: z.string().uuid(),
  notes: z.string().optional(),
});

// GET: Fetch fraud indicators
export async function GET(_request: Request) {
  try {
    const supabase = createClient();

    // Verify admin auth
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

    const adminClient = getSupabaseAdmin();

    // 1. Newly created organizers (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: newOrganizers } = await adminClient
      .from('event_organizers')
      .select(
        `
        id, business_name, contact_email, verification_status, 
        average_rating, review_count, created_at,
        user:profiles(full_name, email)
      `,
      )
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    // 2. Unverified organizers with paid events
    const { data: unverifiedWithPaidEvents } = await adminClient
      .from('event_organizers')
      .select(
        `
        id, business_name, verification_status,
        events:eventfull_events(id, name, vendor_fee, status)
      `,
      )
      .neq('verification_status', 'verified')
      .not('events', 'is', null);

    // Filter to only those with paid events
    const suspiciousOrganizers = (unverifiedWithPaidEvents ?? []).filter((org) => {
      const events = org.events as Array<{ vendor_fee?: number; status?: string }> | null;
      return events?.some((e) => e.vendor_fee && e.vendor_fee > 0 && e.status === 'published');
    });

    // 3. Low-rated organizers (potential shadowban candidates)
    const { data: lowRatedOrganizers } = await adminClient
      .from('event_organizers')
      .select(
        `
        id, business_name, average_rating, review_count, verification_status
      `,
      )
      .lt('average_rating', 2.5)
      .gte('review_count', 2);

    // 4. Suspended/shadowbanned organizers
    const { data: restrictedOrganizers } = await adminClient
      .from('event_organizers')
      .select(
        `
        id, business_name, verification_status, suspended_at, suspension_reason
      `,
      )
      .or('verification_status.eq.shadowbanned,verification_status.eq.suspended');

    // 5. Flagged applications (duplicate or suspicious)
    const { data: flaggedEvents } = await adminClient
      .from('eventfull_events')
      .select(
        `
        id, name, vendor_fee, status, fraud_flags,
        organizer:event_organizers(business_name, verification_status)
      `,
      )
      .not('fraud_flags', 'is', null);

    // 6. Events with refund requests
    const { data: refundRequests } = await adminClient
      .from('eventfull_events')
      .select(
        `
        id, name, refund_requested_at, refund_request_notes,
        organizer:event_organizers(business_name)
      `,
      )
      .not('refund_requested_at', 'is', null);

    return NextResponse.json({
      indicators: {
        new_organizers: {
          count: newOrganizers?.length ?? 0,
          data: newOrganizers ?? [],
        },
        unverified_paid_events: {
          count: suspiciousOrganizers.length,
          data: suspiciousOrganizers,
        },
        low_rated: {
          count: lowRatedOrganizers?.length ?? 0,
          data: lowRatedOrganizers ?? [],
        },
        restricted: {
          count: restrictedOrganizers?.length ?? 0,
          data: restrictedOrganizers ?? [],
        },
        flagged_events: {
          count: flaggedEvents?.length ?? 0,
          data: flaggedEvents ?? [],
        },
        refund_requests: {
          count: refundRequests?.length ?? 0,
          data: refundRequests ?? [],
        },
      },
      summary: {
        total_alerts:
          suspiciousOrganizers.length +
          (lowRatedOrganizers?.length ?? 0) +
          (flaggedEvents?.length ?? 0) +
          (refundRequests?.length ?? 0),
      },
    });
  } catch (error) {
    logError('Error in fraud detection GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Take action on suspicious entity
export async function POST(request: Request) {
  try {
    const supabase = createClient();

    // Verify admin auth
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

    // Parse body
    const body = await request.json();
    const validated = ActionSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validated.error.flatten() },
        { status: 400 },
      );
    }

    const { action, entity_type, entity_id, notes } = validated.data;
    const adminClient = getSupabaseAdmin();

    // Note: These operations should ideally be wrapped in a database transaction
    // for atomicity. Currently they are separate operations which could lead to
    // inconsistent state if one fails after another succeeds.
    // TODO: Create Supabase RPC function to handle this atomically

    let result;

    switch (action) {
      case 'shadowban': {
        if (entity_type !== 'organizer') {
          return NextResponse.json(
            { error: 'Shadowban only applies to organizers' },
            { status: 400 },
          );
        }
        result = await adminClient
          .from('event_organizers')
          .update({
            verification_status: 'shadowbanned',
            suspension_reason: notes ?? 'Low ratings or suspicious activity',
            suspended_at: new Date().toISOString(),
            suspended_by: user.id,
          })
          .eq('id', entity_id);
        break;
      }

      case 'suspend': {
        if (entity_type !== 'organizer') {
          return NextResponse.json(
            { error: 'Suspend only applies to organizers' },
            { status: 400 },
          );
        }
        result = await adminClient
          .from('event_organizers')
          .update({
            verification_status: 'suspended',
            suspension_reason: notes ?? 'Account suspended by admin',
            suspended_at: new Date().toISOString(),
            suspended_by: user.id,
          })
          .eq('id', entity_id);
        break;
      }

      case 'require_verification': {
        if (entity_type !== 'organizer') {
          return NextResponse.json(
            { error: 'Verification only applies to organizers' },
            { status: 400 },
          );
        }
        // Set status to unverified, preventing paid event publishing
        result = await adminClient
          .from('event_organizers')
          .update({
            verification_status: 'unverified',
            verification_required_reason: notes ?? 'Admin requested verification',
          })
          .eq('id', entity_id);
        break;
      }

      case 'flag_refund': {
        if (entity_type !== 'event') {
          return NextResponse.json({ error: 'Refund flags only apply to events' }, { status: 400 });
        }
        result = await adminClient
          .from('eventfull_events')
          .update({
            refund_requested_at: new Date().toISOString(),
            refund_request_notes: notes ?? 'Flagged by admin for refund review',
          })
          .eq('id', entity_id);
        break;
      }

      case 'clear_flag': {
        if (entity_type === 'organizer') {
          result = await adminClient
            .from('event_organizers')
            .update({
              verification_status: 'verified',
              suspension_reason: null,
              suspended_at: null,
              suspended_by: null,
            })
            .eq('id', entity_id);
        } else if (entity_type === 'event') {
          result = await adminClient
            .from('eventfull_events')
            .update({
              fraud_flags: null,
              refund_requested_at: null,
              refund_request_notes: null,
            })
            .eq('id', entity_id);
        }
        break;
      }

      default: {
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
      }
    }

    if (result?.error) {
      logError('Failed to execute fraud action:', result.error);
      return NextResponse.json({ error: 'Failed to execute action' }, { status: 500 });
    }

    logMessage(`Fraud action ${action} on ${entity_type} ${entity_id} by admin ${user.id}`);

    return NextResponse.json({
      success: true,
      action,
      entity_type,
      entity_id,
    });
  } catch (error) {
    logError('Error in fraud detection POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
