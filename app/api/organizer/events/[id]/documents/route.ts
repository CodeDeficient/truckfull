/**
 * Event Documents API
 * WBS: 6.3.3
 *
 * GET: List documents for an event
 * POST: Upload a new document
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/utils/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { logError, logMessage } from '@/lib/logging';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: List documents for an event
export async function GET(_request: Request, context: RouteParams) {
  try {
    const { id: eventId } = await context.params;
    const supabase = createClient();
    const adminClient = getSupabaseAdmin();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify ownership
    const { data: organizer } = await supabase
      .from('event_organizers')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!organizer) {
      return NextResponse.json({ error: 'Not an organizer' }, { status: 403 });
    }

    const { data: event } = await supabase
      .from('eventfull_events')
      .select('organizer_id')
      .eq('id', eventId)
      .single();

    if (!event || event.organizer_id !== organizer.id) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const { data: documents, error } = await supabase
      .from('event_documents')
      .select('*')
      .eq('event_id', eventId)
      .order('uploaded_at', { ascending: false });

    if (error) {
      logError('Error fetching documents:', error);
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }

    if (documents) {
      await Promise.all(
        documents.map(async (doc) => {
          if (doc.file_url) {
            const { data: urlData, error: urlError } = await adminClient.storage
              .from('event-documents')
              .createSignedUrl(doc.file_url, 60 * 60);
            if (urlError) {
              logError('Failed to generate signed URL for document:', {
                docId: doc.id,
                error: urlError,
              });
            } else if (urlData?.signedUrl) {
              doc.file_url = urlData.signedUrl;
            }
          }
        })
      );
    }

    return NextResponse.json({ documents: documents ?? [] });
  } catch (error) {
    logError('Error in documents GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Upload a new document
export async function POST(request: Request, context: RouteParams) {
  try {
    const { id: eventId } = await context.params;
    const supabase = createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify ownership
    const { data: organizer } = await supabase
      .from('event_organizers')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!organizer) {
      return NextResponse.json({ error: 'Not an organizer' }, { status: 403 });
    }

    const { data: event } = await supabase
      .from('eventfull_events')
      .select('organizer_id')
      .eq('id', eventId)
      .single();

    if (!event || event.organizer_id !== organizer.id) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const documentType = formData.get('document_type') as string;

    if (!file || !documentType) {
      return NextResponse.json({ error: 'File and document_type required' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Only PDF, JPEG, and PNG files allowed' }, { status: 400 });
    }

    // Max file size: 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    // Upload to Supabase Storage
    const adminClient = getSupabaseAdmin();
    const fileName = `${eventId}/${documentType}_${Date.now()}.${file.name.split('.').pop()}`;

    const { error: uploadError } = await adminClient.storage
      .from('event-documents')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      logError('Storage upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    const { data: doc, error: insertError } = await adminClient
      .from('event_documents')
      .insert({
        event_id: eventId,
        document_type: documentType,
        file_url: fileName,
        verified: false,
      })
      .select()
      .single();

    if (insertError) {
      logError('Failed to create document record:', insertError);
      return NextResponse.json({ error: 'Failed to save document' }, { status: 500 });
    }

    logMessage(`Document ${doc.id} uploaded for event ${eventId}`);

    return NextResponse.json({
      success: true,
      document: doc,
    });
  } catch (error) {
    logError('Error in documents POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
