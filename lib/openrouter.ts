/**
 * OpenRouter API Client
 *
 * Uses OpenRouter for AI-powered text parsing.
 * Supports multiple model fallbacks (Anthropic, OpenAI, Mistral, etc.)
 */

import { logError, logMessage, logWarning } from '@/lib/logging';

const JSON_CODE_FENCE = /```json?\n?/g;
const TRAILING_CODE_FENCE = /```$/g;

interface OpenRouterResponse {
  success: boolean;
  data?: string;
  error?: string;
  tokensUsed?: number;
}

interface OpenRouterMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface OpenRouterConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean; // Set to false for code generation
}

const HARDCODED_FREE_MODELS = [
  'openai/gpt-oss-20b:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'meta-llama/llama-3.3-70b-instruct:free',
];

const FREE_MODEL_CACHE_TTL_MS = 60 * 60 * 1000;
let cachedFreeModels: string[] | null = null;
let freeModelCacheTime = 0;

const BLOCKED_FREE_MODELS = new Set([
  'google/gemma-3-4b-it:free',
  'google/gemma-3-12b-it:free',
  'google/gemma-3-27b-it:free',
  'arcee-ai/trinity-mini:free',
]);

interface OpenRouterModel {
  id: string;
  context_length?: number;
  architecture?: { modality?: string };
  pricing?: { prompt?: string; completion?: string };
}

function rankFreeModels(models: OpenRouterModel[]): string[] {
  return models
    .filter((m) => {
      if (BLOCKED_FREE_MODELS.has(m.id)) return false;
      const modality = m.architecture?.modality ?? '';
      if (modality.includes('image->text') && !modality.includes('text->text')) return false;
      return true;
    })
    .sort((a, b) => {
      const aCtx = a.context_length ?? 0;
      const bCtx = b.context_length ?? 0;
      return bCtx - aCtx;
    })
    .map((m) => m.id);
}

export async function discoverFreeModels(): Promise<string[]> {
  const now = Date.now();
  if (cachedFreeModels && now - freeModelCacheTime < FREE_MODEL_CACHE_TTL_MS) {
    return cachedFreeModels;
  }

  const apiKey = process.env.OPENROUTER_API_KEY ?? '';
  if (!apiKey) {
    return HARDCODED_FREE_MODELS;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      logWarning(`Model discovery failed: HTTP ${response.status}`);
      return cachedFreeModels ?? HARDCODED_FREE_MODELS;
    }

    const data = (await response.json()) as { data?: OpenRouterModel[] };
    const allModels = data.data ?? [];

    const freeModels = allModels.filter(
      (m) => m.id.endsWith(':free') && !m.id.includes('vision'),
    );

    const ranked = rankFreeModels(freeModels);

    if (ranked.length === 0) {
      logWarning('No free models discovered, using hardcoded list');
      return cachedFreeModels ?? HARDCODED_FREE_MODELS;
    }

    cachedFreeModels = ranked;
    freeModelCacheTime = now;
    logMessage(`Discovered ${ranked.length} free models: ${ranked.slice(0, 3).join(', ')}`);
    return ranked;
  } catch (error) {
    logWarning(`Model discovery error: ${error instanceof Error ? error.message : 'unknown'}`);
    return cachedFreeModels ?? HARDCODED_FREE_MODELS;
  }
}

export function clearModelCache(): void {
  cachedFreeModels = null;
  freeModelCacheTime = 0;
}

const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

const MAX_RETRIES_PER_MODEL = 2;
const BASE_RETRY_DELAY_MS = 500; // 500ms, doubles each retry

/**
 * Sleep helper for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Attempt a single API call to a model
 */
async function attemptModelCall(
  model: string,
  messages: OpenRouterMessage[],
  config: OpenRouterConfig,
  apiKey: string,
): Promise<{
  success: boolean;
  data?: string;
  tokensUsed?: number;
  error?: string;
  errorType?: string;
}> {
  const requestBody: Record<string, unknown> = {
    model: model,
    messages,
    temperature: config.temperature ?? 0,
    max_tokens: config.maxTokens ?? 2048,
  };

  if (config.jsonMode !== false) {
    requestBody.response_format = { type: 'json_object' };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://truckfull.food',
    'X-Title': 'TruckFull Admin Parser',
    Authorization: `Bearer ${apiKey}`,
  };

  const response = await fetch(OPENROUTER_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.text();
    let errorType = 'API_ERROR';

    // Categorize error for better debugging
    switch (response.status) {
      case 429: {
        errorType = 'RATE_LIMIT';

        break;
      }
      case 503:
      case 502: {
        errorType = 'SERVICE_UNAVAILABLE';

        break;
      }
      case 401:
      case 403: {
        errorType = 'AUTH_ERROR';

        break;
      }
      default: {
        if (response.status >= 500) {
          errorType = 'SERVER_ERROR';
        }
      }
    }

    return {
      success: false,
      error: `HTTP ${response.status}: ${errorData.slice(0, 300)}`,
      errorType,
    };
  }

  const data = await response.json();

  // Check if we actually got message content (sometimes free models return empty)
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    return {
      success: false,
      error: 'Model returned empty content',
      errorType: 'EMPTY_RESPONSE',
    };
  }

  const tokensUsed = data.usage?.total_tokens ?? 0;

  return {
    success: true,
    data: content,
    tokensUsed,
  };
}

export async function callOpenRouter(
  messages: OpenRouterMessage[],
  config: OpenRouterConfig = {},
): Promise<OpenRouterResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY ?? '';

  const modelsToTry = config.model ? [config.model] : await discoverFreeModels();

  if (!apiKey) {
    logWarning('OPENROUTER_API_KEY not configured');
    return {
      success: false,
      error: 'OpenRouter API key not configured',
    };
  }

  let lastError: string | undefined;
  let lastErrorType: string | undefined;

  for (const model of modelsToTry) {
    logMessage(`Trying model: ${model}`);

    // Retry loop for each model
    for (let attempt = 1; attempt <= MAX_RETRIES_PER_MODEL; attempt++) {
      try {
        const result = await attemptModelCall(model, messages, config, apiKey);

        if (result.success) {
          if (attempt > 1) {
            logMessage(`${model} succeeded on attempt ${attempt}`);
          } else {
            logMessage(`${model} succeeded`);
          }
          return {
            success: true,
            data: result.data,
            tokensUsed: result.tokensUsed,
          };
        }

        // Log the failure reason
        lastError = result.error;
        lastErrorType = result.errorType;

        logWarning(
          `Attempt ${attempt}/${MAX_RETRIES_PER_MODEL} failed: [${result.errorType}] ${result.error?.slice(0, 100)}`,
        );

        // If it's an auth error, don't retry - it won't help
        if (result.errorType === 'AUTH_ERROR') {
          logWarning(`Auth error - skipping remaining retries for ${model}`);
          break;
        }

        // Wait before retrying (exponential backoff: 1s, 2s, 4s)
        if (attempt < MAX_RETRIES_PER_MODEL) {
          const delayMs = BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
          logMessage(`Waiting ${delayMs}ms before retry...`);
          await sleep(delayMs);
        }
      } catch (error) {
        // Network or unexpected error
        lastError = error instanceof Error ? error.message : 'Unknown error';
        lastErrorType = 'NETWORK_ERROR';

        logWarning(
          `Attempt ${attempt}/${MAX_RETRIES_PER_MODEL} threw error: [NETWORK_ERROR] ${lastError}`,
        );
        logError(`OpenRouter fetch error (${model}, attempt ${attempt}):`, error);

        // Wait before retrying
        if (attempt < MAX_RETRIES_PER_MODEL) {
          const delayMs = BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
          logMessage(`Waiting ${delayMs}ms before retry...`);
          await sleep(delayMs);
        }
      }
    }

    // All retries for this model exhausted, move to next
    logWarning(`All ${MAX_RETRIES_PER_MODEL} attempts failed for ${model}, trying next model...`);
  }

  // If we get here, all models failed
  const finalError = `All AI models failed. Last error [${lastErrorType}]: ${lastError}`;
  logWarning(finalError);

  return {
    success: false,
    error: finalError,
  };
}

/**
 * Parse food truck data from unstructured text using OpenRouter
 */
export async function parseTextWithOpenRouter(
  text: string,
  sourceUrl?: string,
): Promise<{
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}> {
  // Truncate text to ~50k tokens (200k chars) for faster processing
  const MAX_CHARS = 200_000;
  const truncatedText =
    text.length > MAX_CHARS
      ? text.slice(0, MAX_CHARS) + '\n\n[Content truncated due to length...]'
      : text;

  const prompt = `Extract food truck business information from this Facebook page HTML.

Source URL: ${sourceUrl ?? 'Unknown'}

${truncatedText}

Return JSON only (no markdown):
{
  "name": "string (food truck name)",
  "description": "string (brief description of the food truck - remove follower counts, page type labels, metadata)",
  "cuisineType": ["array", "of", "cuisine", "types"],
  "phone": "string (phone number XXX-XXX-XXXX)",
  "email": "string (email address)",
  "website": "string (website URL - NOT social media)",
  "facebookUrl": "string (Facebook URL)",
  "instagramHandle": "string (Instagram handle without @)",
  "profileImage": "string (profile image URL - look for scontent- or fbcdn URLs)",
  "menu": [
    {
      "category": "string (menu category)",
      "items": [
        {
          "name": "string (item name)",
          "price": "number (price as number, not string with $)",
          "description": "string (item description)"
        }
      ]
    }
  ],
  "location": {
    "address": "string (physical address if found)",
    "city": "string (city name)",
    "state": "string (state abbreviation like GA, SC, NC)",
    "latitude": "number (GPS coordinates if found)",
    "longitude": "number (GPS coordinates if found)"
  },
  "operatingHours": {
    "monday": {"open": "string (HH:MM 24h format)", "close": "string (HH:MM 24h format)"},
    "tuesday": {"open": "string (HH:MM 24h format)", "close": "string (HH:MM 24h format)"},
    "wednesday": {"open": "string (HH:MM 24h format)", "close": "string (HH:MM 24h format)"},
    "thursday": {"open": "string (HH:MM 24h format)", "close": "string (HH:MM 24h format)"},
    "friday": {"open": "string (HH:MM 24h format)", "close": "string (HH:MM 24h format)"},
    "saturday": {"open": "string (HH:MM 24h format)", "close": "string (HH:MM 24h format)"},
    "sunday": {"open": "string (HH:MM 24h format)", "close": "string (HH:MM 24h format)"}
  }
}

IMPORTANT RULES:
1. Extract AS MUCH information as possible - don't give up early
2. Look carefully for phone numbers in various formats: (555) 123-4567, 555-123-4567, 555.123.4567
3. Look for email addresses - common patterns: contact@, info@, hello@
4. Look for websites - exclude social media URLs (facebook.com, instagram.com, twitter.com, tiktok.com)
5. Look for operating hours in common formats: "Mon-Fri 11am-8pm", "Mon: 11:00-20:00", "Open 11-8 daily"
6. Convert all times to 24-hour format (e.g., "14:30" for 2:30 PM, "20:00" for 8:00 PM)
7. Look for location information: addresses, cross streets, "located at", "find us at"
8. Look for menu items with prices - common patterns: "Burger $9.99", "Taco: $5", "Item - $12"
9. Look for cuisine types in description, page name, or posts
10. Look for profile images - scontent-*.fbcdn.net URLs are profile pictures
11. Remove ALL metadata from description: follower counts, "talking about this", page type labels
12. Use null for missing fields (except operatingHours - omit entire field if no hours found)
13. For operatingHours: only include days with explicit hours, omit closed days entirely
14. For menu: extract as many items as possible with categories if available
15. Parse prices as numbers only (e.g., 12.99, not "$12.99" or "12.99")
16. Return ONLY the JSON object, no markdown code blocks, no explanations`;

  const response = await callOpenRouter([{ role: 'user', content: prompt }], {
    temperature: 0,
  });

  if (!response.success || !response.data) {
    return {
      success: false,
      error: response.error ?? 'Failed to parse with OpenRouter',
    };
  }

  try {
    // Clean up response (remove markdown code blocks if present)
    let jsonText = response.data.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText
        .replaceAll(JSON_CODE_FENCE, '')
        .replaceAll(TRAILING_CODE_FENCE, '')
        .trim();
    }

    const parsed = JSON.parse(jsonText);
    return {
      success: true,
      data: parsed,
    };
  } catch (parseError) {
    logError('Failed to parse OpenRouter JSON response:', parseError);
    return {
      success: false,
      error: 'Failed to parse AI response as JSON',
    };
  }
}
