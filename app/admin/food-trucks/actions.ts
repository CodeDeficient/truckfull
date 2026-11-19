'use server';

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { GoogleGenAI } from '@google/genai';
import { revalidatePath } from 'next/cache';
import { logWarning, logError } from '@/lib/logging';
import { extractJsonSafely } from '@/lib/utils/jsonExtractor';
import { invalidatePublicTruckBySlug } from '@/lib/services/publicTruckPage';
import { invalidateMetadataTruckCount } from '@/lib/seo/truckCountInvalidation';
import { checkAdminAccessServer } from '@/lib/auth/adminAuthHelpers';

const NON_ALPHANUMERIC = /[^a-z0-9]/g;

const MAX_RAW_TEXT_LENGTH = 20_000;

// Interface for AI-parsed truck data
interface ParsedTruckData {
  name?: string;
  facebook_url?: string;
  website?: string;
  instagram?: string;
  email?: string;
  phone?: string;
  description?: string;
  cuisine_type?: string[];
}

// Interface for truck row returned from database
interface TruckRow {
  id: string;
  name: string;
}

async function rejectUnauthorizedInput(rawText: unknown): Promise<string | null> {
  const access = await checkAdminAccessServer();
  if (!access.success) {
    return 'Admin access required';
  }
  if (typeof rawText !== 'string' || rawText.length > MAX_RAW_TEXT_LENGTH) {
    return 'Text is too long';
  }
  return null;
}

export async function parseAndAddTruck(rawText: string) {
  const rejection = await rejectUnauthorizedInput(rawText);
  if (rejection) {
    return { success: false, error: rejection };
  }

  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const googleKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

  if (!openRouterKey && !googleKey) {
    return { success: false, error: 'Missing API Keys (OpenRouter or Google)' };
  }

  const prompt = `
    Extract food truck information from the following text and return a JSON object.
    
    Fields to extract:
    - name (string, required)
    - facebook_url (string, absolute URL)
    - website (string)
    - instagram (string)
    - email (string)
    - phone (string)
    - description (string, summarize if long)
    - cuisine_type (array of strings)
    
    Text:
    ${rawText.slice(0, 5000)}
    
    Return ONLY valid JSON.
  `;

  let parsed: ParsedTruckData | null = null;
  let parsingError = '';

  // 1. Try OpenRouter (Preferred)
  if (openRouterKey) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://truckfull.food',
          'X-Title': 'TruckFull Admin',
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3-haiku', // Efficient and accurate
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1, // Deterministic
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        const jsonText = extractJsonSafely(content || '');
        if (jsonText) parsed = JSON.parse(jsonText);
      } else {
        logWarning(`OpenRouter failed: ${response.status}`);
      }
    } catch (error_) {
      logError('OpenRouter error:', error_);
      parsingError = (error_ as Error).message;
    }
  }

  // 2. Fallback to Gemini if OpenRouter failed or wasn't configured
  if (!parsed && googleKey) {
    try {
      const genAI = new GoogleGenAI({ apiKey: googleKey });
      // Correct syntax for @google/genai package
      const result = await genAI.models.generateContent({
        model: 'gemini-2.0-flash-lite-001',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      // @google/genai response structure: 'result' is the response object
      const responseText = result.text;
      if (responseText) {
        const jsonText = extractJsonSafely(responseText);
        if (jsonText) parsed = JSON.parse(jsonText);
      }
    } catch (error_) {
      logError('Gemini error:', error_);
      parsingError = parsingError
        ? `${parsingError} | Gemini: ${(error_ as Error).message}`
        : (error_ as Error).message;
    }
  }

  if (!parsed) {
    return { success: false, error: `Parsing failed. ${parsingError}` };
  }

  if (!parsed.name) {
    return { success: false, error: 'Could not extract truck name from text' };
  }

  const supabase = getSupabaseAdmin();

  // Check for duplicate
  const normalizedName = parsed.name.toLowerCase().replaceAll(NON_ALPHANUMERIC, '');
  const { data: existing } = await supabase.from('food_trucks').select('id, name');
  const duplicate = existing?.find(
    (t: TruckRow) => t.name.toLowerCase().replaceAll(NON_ALPHANUMERIC, '') === normalizedName,
  );

  if (duplicate) {
    return { success: false, error: `Truck already exists: ${duplicate.name}` };
  }

  const truckData = {
    name: parsed.name,
    description: parsed.description,
    cuisine_type: parsed.cuisine_type || [],
    contact_info: {
      email: parsed.email,
      phone: parsed.phone,
      website: parsed.website,
    },
    social_media: {
      facebook: parsed.facebook_url,
      instagram: parsed.instagram,
    },
    verification_status: 'pending',
    data_quality_score: 0.5, // Silver (AI parsed)
    is_active: true,
    // Default location (Augusta)
    current_location: {
      lat: 33.4735,
      lng: -82.0105,
      address: 'Augusta, GA area (fallback)',
    },
  };

  const { data: inserted, error } = await supabase
    .from('food_trucks')
    .insert(truckData)
    .select('slug')
    .single();

  if (error) {
    return { success: false, error: `Database error: ${error.message}` };
  }

  if (inserted?.slug) {
    invalidatePublicTruckBySlug(inserted.slug);
  }

  invalidateMetadataTruckCount();

  revalidatePath('/admin/food-trucks');
  return { success: true, message: `Added ${parsed.name}` };
}
