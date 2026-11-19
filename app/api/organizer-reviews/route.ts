/**
 * Organizer Reviews API
 * WBS: 6.2.7
 *
 * POST: Submit a review for an organizer
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/utils/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { logError, logMessage } from '@/lib/logging';
import { z } from 'zod';

const ReviewSchema = z.object({
  organizer_id: z.string().uuid(),
  event_id: z.string().uuid(),
  rating: z.number().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

export async function POST(request: Request) {
  try {
    const supabase = createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Parse body
    const body = await request.json();
    const validated = ReviewSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validated.error.flatten() },
        { status: 400 },
      );
    }

    const { organizer_id, event_id, rating, comment } = validated.data;

    // Verify user has an accepted application to this event
    const { data: application } = await supabase
      .from('event_applications')
      .select('id, truck:food_trucks!inner(owner_id)')
      .eq('event_id', event_id)
      .eq('status', 'accepted')
      .eq('truck.owner_id', user.id)
      .maybeSingle();

    if (!application) {
      return NextResponse.json(
        { error: 'You can only review events you participated in' },
        { status: 403 },
      );
    }

    // Verify event has ended and validate organizer_id matches the event
    const { data: event } = await supabase
      .from('eventfull_events')
      .select('end_date, organizer_id')
      .eq('id', event_id)
      .single();

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (event.organizer_id !== organizer_id) {
      return NextResponse.json({ error: 'Invalid organizer for this event' }, { status: 400 });
    }

    if (!event.end_date || new Date(event.end_date) > new Date()) {
      return NextResponse.json(
        { error: 'You can only review after the event has ended' },
        { status: 400 },
      );
    }

    // Check for existing review
    const adminClient = getSupabaseAdmin();
    const { data: existing } = await adminClient
      .from('organizer_reviews')
      .select('id')
      .eq('reviewer_id', user.id)
      .eq('event_id', event_id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'You have already reviewed this organizer for this event' },
        { status: 409 },
      );
    }

    // Create review
    const { data: review, error: insertError } = await adminClient
      .from('organizer_reviews')
      .insert({
        organizer_id,
        reviewer_id: user.id,
        event_id,
        rating,
        comment: comment ?? null,
      })
      .select('id, rating')
      .single();

    if (insertError) {
      logError('Failed to create review:', insertError);
      return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 });
    }

    // Update organizer rating (trigger does this, but we can also do it here for safety)
    // Note: This should be wrapped in a transaction or use a DB trigger for atomicity
    try {
      const { data: allReviews } = await adminClient
        .from('organizer_reviews')
        .select('rating')
        .eq('organizer_id', organizer_id);

      if (allReviews && allReviews.length > 0) {
        const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

        const { error: updateError } = await adminClient
          .from('event_organizers')
          .update({
            rating_avg: Math.round(avgRating * 10) / 10,
            rating_count: allReviews.length,
          })
          .eq('id', organizer_id);

        if (updateError) {
          logError('Failed to update organizer rating:', updateError);
        }
      }
    } catch (ratingError) {
      logError('Error updating organizer rating:', ratingError);
    }

    logMessage(`Review ${review.id} created for organizer ${organizer_id} by user ${user.id}`);

    return NextResponse.json({
      success: true,
      review: {
        id: review.id,
        rating: review.rating,
      },
    });
  } catch (error) {
    logError('Error in review POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
