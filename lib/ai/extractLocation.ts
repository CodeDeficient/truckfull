/**
 * Location Extraction Module
 * WBS: 3.2.2
 *
 * Extracts structured location data from social media post text.
 */

import { callOpenRouter } from '@/lib/openrouter';
import { logMessage, logError } from '@/lib/logging';
import { z } from 'zod';
import { extractJsonSafely } from '@/lib/utils/jsonExtractor';

// Schema for extracted location
const ExtractedLocationSchema = z.object({
  address: z.string().optional(),
  intersection: z.string().optional(),
  landmark: z.string().optional(),
  business_name: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  event_name: z.string().optional(),
  confidence: z.number().min(0).max(1),
  raw_text: z.string(), // The original text snippet that was parsed
});

export type ExtractedLocation = z.infer<typeof ExtractedLocationSchema>;

const EXTRACTION_PROMPT = `You are extracting location information from a food truck's social media post.

RULES:
1. Extract ONLY explicit location mentions (don't guess or infer)
2. If the post says "same spot as yesterday" or similar, that's NOT an extractable location
3. Look for: street addresses, intersections, business names, event names, landmarks
4. Include city/state if mentioned
5. Confidence should be 0.9+ only if you have a complete, unambiguous address

Post text:
"""
{POST_TEXT}
"""

Return ONLY valid JSON:
{
  "address": "123 Main St" or null,
  "intersection": "Main St & 5th Ave" or null,
  "landmark": "Next to Home Depot" or null,
  "business_name": "Riverview Shopping Center" or null,
  "city": "Augusta" or null,
  "state": "GA" or null,
  "zip": "30901" or null,
  "event_name": "Saturday Market" or null,
  "confidence": 0.XX,
  "raw_text": "the exact snippet from the post that contains location info"
}`;

/**
 * Extracts location data from post text using AI.
 *
 * @param postText - The text content of the post
 * @returns Extracted location data or null if extraction failed
 */
export async function extractLocation(postText: string): Promise<ExtractedLocation | null> {
  if (!postText?.trim()) {
    logError('extractLocation: Empty post text provided');
    return null;
  }

  try {
    const prompt = EXTRACTION_PROMPT.replace('{POST_TEXT}', postText.slice(0, 2000));

    const response = await callOpenRouter(
      [{ role: 'user', content: prompt }],
      { temperature: 0 }, // Zero temperature for consistent extraction
    );

    if (!response.success || !response.data) {
      logError('extractLocation: OpenRouter call failed', response.error);
      return null;
    }

    const jsonText = extractJsonSafely(response.data);
    if (!jsonText) {
      logError('extractLocation: No valid JSON found in response');
      return null;
    }

    const parsed = JSON.parse(jsonText);
    const validated = ExtractedLocationSchema.safeParse(parsed);

    if (!validated.success) {
      logError('extractLocation: Invalid response schema', validated.error);
      return null;
    }

    // If no actual location data was extracted, return null
    const loc = validated.data;
    const hasLocation =
      loc.address || loc.intersection || loc.landmark || loc.business_name || loc.event_name;

    if (!hasLocation) {
      logMessage('extractLocation: No location found in post');
      return null;
    }

    logMessage('Location extracted:', {
      address: loc.address,
      city: loc.city,
      confidence: loc.confidence,
    });

    return validated.data;
  } catch (error) {
    logError('extractLocation: Error during extraction', error);
    return null;
  }
}

/**
 * Builds a geocoding query string from extracted location data.
 * Prioritizes more specific fields over general ones.
 */
export function buildGeocodingQuery(location: ExtractedLocation): string {
  const parts: string[] = [];

  // Prefer most specific to least specific
  if (location.address) {
    parts.push(location.address);
  } else if (location.intersection) {
    parts.push(location.intersection);
  } else if (location.business_name) {
    parts.push(location.business_name);
  } else if (location.landmark) {
    parts.push(location.landmark);
  } else if (location.event_name) {
    parts.push(location.event_name);
  }

  // Add city/state for context
  if (location.city) {
    parts.push(location.city);
  }
  if (location.state) {
    parts.push(location.state);
  }
  if (location.zip) {
    parts.push(location.zip);
  }

  return parts.join(', ');
}
