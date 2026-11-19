import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/utils/server';
import { logError, logMessage } from '@/lib/logging';
import { z } from 'zod';

const FeedbackSchema = z.object({
  eventId: z.string().uuid(),
  feedback: z.enum(['helpful', 'not_helpful']),
  comment: z.string().max(1000).optional(),
});

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = FeedbackSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid feedback data' }, { status: 400 });
    }

    const { eventId, feedback, comment } = parsed.data;

    logMessage(`Research feedback: ${feedback} for event ${eventId} from user ${user.id}`);

    const { error } = await supabase.from('research_feedback').upsert(
      {
        event_id: eventId,
        user_id: user.id,
        feedback,
        comment: comment ?? null,
      },
      { onConflict: 'event_id,user_id' },
    );

    if (error) {
      logError('Failed to save research feedback:', error);
      return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logError('Research feedback API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
