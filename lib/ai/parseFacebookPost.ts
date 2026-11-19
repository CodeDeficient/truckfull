import { callLLM } from '@/lib/utils/callLLM';
import { logMessage, logError } from '@/lib/logging';
import { extractJsonSafely } from '@/lib/utils/jsonExtractor';

export interface Location {
  address?: string;
  city?: string;
  state?: string;
  fuzzy?: boolean;
}

export type ScheduleScope = 'recurring_weekly' | 'one_off_date' | 'one_off_unsupported' | 'scope_missing';

export interface Times {
  start?: string;
  end?: string;
  days?: string[];
  dateReference?: string;
  dateReferences?: string[];
  scope?: ScheduleScope;
}

export interface Price {
  item?: string;
  price: number;
}

export interface ParsedPost {
  food_items: string[];
  location?: Location;
  times?: Times;
  prices?: Price[];
  hashtags?: string[];
  confidence: number;
}

const PARSING_PROMPT = `You are extracting food truck business information from a Facebook post. Extract the following information:

1. Food items - List all food items mentioned (tacos, burgers, pizza, etc.)
2. Location - Address, city, state. Mark as fuzzy if it's a landmark or relative location
3. Times - Operating hours (start/end times, days of week, or a date reference)
4. Prices - Menu items with prices
5. Hashtags - Extract relevant hashtags
6. Confidence - How confident are you in this extraction? (0.0-1.0)

IMPORTANT RULES:
- Handle emojis, hashtags, and slang appropriately
- "cheesy goodness" = grilled cheese, "loaded" = with toppings
- For location: fuzzy=true for landmarks, fuzzy=false for exact addresses
- Time formats: "11am-3pm", "11am to 3pm", "11 AM - 3 PM"
- Preserve a single date reference such as "today", "tomorrow", "this Friday", "July 4", or "2026-07-04" in times.dateReference
- Set times.scope to "one_off_date" when a single date reference is present; use "one_off_unsupported" when multiple or ambiguous dates are present
- Prices: Extract as numbers (e.g., 8.99, not "$8.99")
- Confidence threshold: Return early with confidence < 0.7 for ambiguous posts
- If no useful information found, set confidence < 0.7

Post to analyze:
"""{POST_TEXT}"""

Return ONLY valid JSON:
{
  "food_items": ["tacos", "burgers", ...],
  "location": {
    "address": "123 Main St",
    "city": "Augusta",
    "state": "GA",
    "fuzzy": false
  },
  "times": {
    "start": "11am",
    "end": "3pm",
    "days": ["Monday", "Tuesday"],
    "scope": "recurring_weekly"
  },
  "prices": [
    {"item": "tacos", "price": 5},
    {"item": "burgers", "price": 8}
  ],
  "hashtags": ["#foodtruck", "#lunch"],
  "confidence": 0.85
}`;

const DEFAULT_RESULT: ParsedPost = {
  food_items: [],
  location: undefined,
  times: undefined,
  prices: undefined,
  hashtags: undefined,
  confidence: 0,
};

export async function parseFacebookPost(postText: string): Promise<ParsedPost> {
  if (!postText?.trim()) {
    logError('parseFacebookPost: Empty post text provided', new Error('Empty input'));
    return DEFAULT_RESULT;
  }

  try {
    const prompt = PARSING_PROMPT.replace('{POST_TEXT}', postText.slice(0, 2000));

    const response = await callLLM(
      [
        {
          role: 'user',
          content: prompt,
        },
      ],
      { temperature: 0 },
    );

    if (!response.success || !response.data) {
      logError('parseFacebookPost: LLM call failed', response.error);
      return DEFAULT_RESULT;
    }

    const jsonText = extractJsonSafely(response.data);
    if (!jsonText) {
      logError('parseFacebookPost: No valid JSON found in response');
      return DEFAULT_RESULT;
    }

    const parsed = JSON.parse(jsonText) as Partial<ParsedPost>;

    const result: ParsedPost = {
      food_items: parsed.food_items || [],
      location: parsed.location,
      times: parsed.times,
      prices: parsed.prices,
      hashtags: parsed.hashtags,
      confidence: parsed.confidence || 0,
    };

    if (result.confidence < 0.7) {
      logMessage('Low confidence parsing result', {
        confidence: result.confidence,
        extracted: {
          foodItems: result.food_items.length,
          hasLocation: !!result.location,
          hasTimes: !!result.times,
        },
      });
    } else {
      logMessage('Successfully parsed Facebook post', {
        confidence: result.confidence,
        foodItems: result.food_items.length,
        hasLocation: !!result.location,
        hasTimes: !!result.times,
      });
    }

    return result;
  } catch (error) {
    logError('parseFacebookPost: Error during parsing', error);
    return DEFAULT_RESULT;
  }
}

export function isConfidenceAcceptable(confidence: number): boolean {
  return confidence >= 0.7;
}

export function hasExtractableData(post: ParsedPost): boolean {
  return (
    post.food_items.length > 0 ||
    post.location !== undefined ||
    post.times !== undefined ||
    (post.prices !== undefined && post.prices.length > 0)
  );
}

export function formatConfidence(confidence: number): string {
  if (confidence >= 0.9) return 'high';
  if (confidence >= 0.7) return 'medium';
  return 'low';
}
