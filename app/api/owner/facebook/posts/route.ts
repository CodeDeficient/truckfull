import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/utils/server';
import { parseFullPicture } from '@/lib/facebook/postImages';
import { logError } from '@/lib/logging';

interface FacebookPostRow {
  id: string;
  truck_id: string;
  facebook_post_id: string;
  message: string | null;
  raw_text: string | null;
  attachments: unknown;
  raw_payload: string | null;
  created_time: string;
  processed_at: string | null;
  status: string;
  confidence: number | null;
  source: string;
  created_at: string;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const truckId = searchParams.get('truckId');
  const status = searchParams.get('status');
  const limitStr = searchParams.get('limit') ?? '20';
  const parsedLimit = Number.parseInt(limitStr, 10);
  const limit = Number.isNaN(parsedLimit) ? 20 : Math.min(parsedLimit, 100);

  if (!truckId) {
    return NextResponse.json({ error: 'truckId is required' }, { status: 400 });
  }

  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: truck, error: truckError } = await getSupabaseAdmin()
    .from('food_trucks')
    .select('id')
    .eq('id', truckId)
    .eq('owner_id', user.id)
    .single();

  if (truckError || !truck) {
    return NextResponse.json({ error: 'Truck not found or access denied' }, { status: 404 });
  }

  let query = supabase
    .from('facebook_posts')
    .select(
      'id, truck_id, facebook_post_id, message, raw_text, attachments, raw_payload, created_time, processed_at, status, confidence, source, created_at',
    )
    .eq('truck_id', truckId);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query.order('created_time', { ascending: false }).limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const posts = (data as FacebookPostRow[] | null)?.map((post) => ({
    id: post.id,
    truckId: post.truck_id,
    facebookPostId: post.facebook_post_id,
    message: post.message,
    rawText: post.raw_text,
    attachments: post.attachments,
    fullPicture: parseFullPicture(post.raw_payload),
    createdTime: post.created_time,
    processedAt: post.processed_at,
    status: post.status,
    confidence: post.confidence,
    source: post.source,
    createdAt: post.created_at,
  }));

  return NextResponse.json({ posts: posts ?? [] });
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    let body: { postId?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const postId = body.postId;

    if (!postId) {
      return NextResponse.json({ error: 'postId is required' }, { status: 400 });
    }

    const { data: post, error: postError } = await supabase
      .from('facebook_posts')
      .select('id, truck_id')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const { data: truck, error: truckError } = await getSupabaseAdmin()
      .from('food_trucks')
      .select('id')
      .eq('id', post.truck_id)
      .eq('owner_id', user.id)
      .single();

    if (truckError || !truck) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const { error: deleteError } = await supabase
      .from('facebook_posts')
      .delete()
      .eq('id', postId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logError('DELETE /api/owner/facebook/posts error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
