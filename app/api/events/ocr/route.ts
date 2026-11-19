import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/utils/server';
import { logError, logMessage } from '@/lib/logging';
import { extractRawText, isOcrAvailable } from '@/lib/ai/ocrVision';
import { validateImageBase64, sanitizeExtractedText } from '@/lib/validation/imageValidation';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    if (profile?.subscription_tier !== 'pro') {
      return NextResponse.json({ error: 'Pro subscription required' }, { status: 403 });
    }

    if (!isOcrAvailable()) {
      return NextResponse.json({ error: 'OCR service unavailable' }, { status: 503 });
    }

    const formData = await request.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Allowed: JPEG, PNG, WebP` },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: 5MB` },
        { status: 400 },
      );
    }

    if (file.size === 0) {
      return NextResponse.json({ error: 'Empty file' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');

    const sizeCheck = validateImageBase64(base64Data);
    if (!sizeCheck.valid) {
      return NextResponse.json({ error: sizeCheck.error }, { status: 400 });
    }

    logMessage(`OCR request from user ${user.id}, file: ${file.type}, ${file.size} bytes`);

    const dataUrl = `data:${file.type};base64,${base64Data}`;
    const result = await extractRawText(dataUrl);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        text: '',
        error: result.error ?? 'OCR extraction failed',
      });
    }

    const extractedText = sanitizeExtractedText(result.text);

    if (!extractedText) {
      return NextResponse.json({
        success: true,
        text: '',
        warning: 'No text could be extracted from this image',
      });
    }

    return NextResponse.json({
      success: true,
      text: extractedText,
    });
  } catch (error) {
    logError('OCR API error:', error);
    return NextResponse.json({ error: 'OCR processing failed' }, { status: 500 });
  }
}
