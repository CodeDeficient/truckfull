/**
 * Post Classification Module
 * WBS: 3.2.1
 *
 * Classifies social media posts into categories for automated processing.
 */

import { callOpenRouter } from '@/lib/openrouter';
import { logMessage, logError } from '@/lib/logging';
import { z } from 'zod';
import { UpdateCategory } from '@/lib/config/riskLevels';
import { extractJsonSafely } from '@/lib/utils/jsonExtractor';

// Schema for classification response
const ClassificationResponseSchema = z.object({
  category: z.enum([
    'location_update',
    'hours_update',
    'menu_update',
    'cuisine_change',
    'general_content',
  ]),
  confidence: z.number().min(0).max(1),
  extracted_data: z.record(z.string(), z.unknown()).optional(),
  reasoning: z.string().optional(),
});

export type ClassificationResult = z.infer<typeof ClassificationResponseSchema>;

const CLASSIFICATION_PROMPT = `You are classifying a social media post from a food truck.

Classify the post into ONE of these categories:
- location_update: The post mentions WHERE the truck is or will be located (address, intersection, landmark, event name)
- hours_update: The post mentions WHEN the truck is open/closed or changes to schedule
- menu_update: The post mentions NEW menu items, price changes, or menu specials
- cuisine_change: The post suggests the truck is changing its type of food (rare)
- general_content: Thank you posts, photos without location info, general announcements

IMPORTANT:
- If a post mentions BOTH location AND hours, classify as "location_update" (the location is the key action)
- Be conservative - if unsure between location_update and general_content, choose general_content
- Confidence should reflect how certain you are (0.0 = random guess, 1.0 = absolutely certain)

Post to classify:
"""
{POST_TEXT}
"""

Return ONLY valid JSON:
{
  "category": "...",
  "confidence": 0.XX,
  "extracted_data": { "location": "...", "time": "...", "date": "...", etc. },
  "reasoning": "Brief explanation"
}`;

/**
 * Classifies a social media post using AI.
 *
 * @param postText - The text content of the post
 * @returns Classification result with category, confidence, and extracted data
 */
export async function classifyPost(postText: string): Promise<ClassificationResult | null> {
  if (!postText?.trim()) {
    logError('classifyPost: Empty post text provided');
    return null;
  }

  try {
    const prompt = CLASSIFICATION_PROMPT.replace('{POST_TEXT}', postText.slice(0, 2000)); // Limit input size

    const response = await callOpenRouter(
      [{ role: 'user', content: prompt }],
      { temperature: 0 },
    );

    if (!response.success || !response.data) {
      logError('classifyPost: OpenRouter call failed', response.error);
      return null;
    }

    const jsonText = extractJsonSafely(response.data);
    if (!jsonText) {
      logError('classifyPost: No valid JSON found in response');
      return null;
    }

    const parsed = JSON.parse(jsonText);
    const validated = ClassificationResponseSchema.safeParse(parsed);

    if (!validated.success) {
      logError('classifyPost: Invalid response schema', validated.error);
      return null;
    }

    logMessage('Post classified:', {
      category: validated.data.category,
      confidence: validated.data.confidence,
    });

    return validated.data;
  } catch (error) {
    logError('classifyPost: Error during classification', error);
    return null;
  }
}

/**
 * Converts classification category string to UpdateCategory enum.
 */
export function toUpdateCategory(category: string): UpdateCategory {
  const mapping: Record<string, UpdateCategory> = {
    location_update: UpdateCategory.LOCATION_UPDATE,
    hours_update: UpdateCategory.HOURS_UPDATE,
    menu_update: UpdateCategory.MENU_UPDATE,
    cuisine_change: UpdateCategory.CUISINE_CHANGE,
    general_content: UpdateCategory.GENERAL_CONTENT,
  };
  return mapping[category] ?? UpdateCategory.GENERAL_CONTENT;
}
