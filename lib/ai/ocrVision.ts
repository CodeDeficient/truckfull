import { logMessage, logError } from '@/lib/logging';
import {
  getVisionModelFallbacks,
  OLLAMA_VISION_MODELS,
} from '@/lib/ai/modelConfig';
import type { ParsedPost } from '@/lib/ai/parseFacebookPost';

const LOCATION_PHRASE = /(?:at|located at|we're at|find us at)\s+([^.!?\n]+)/i;
const STREET_ADDRESS =
  /(\d+\s+[a-z]+(?:\s+(?:st|street|ave|avenue|blvd|boulevard|rd|road|ln|lane|dr|drive|ct|court|pl|place|way))?(?:\s+(?:n|s|e|w|ne|nw|se|sw))?(?:\s*,?\s*[a-z]+(?:\s+[a-z]+)*)?(?:\s*,?\s*[A-Z]{2})?(?:\s+\d{5})?)/i;
const TIME_RANGE =
  /(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*[-–to]+\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i;
const HOURS_RANGE =
  /(?:open|hours)[:\s]+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*[-–to]+\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i;
const WHITESPACE_RUNS = /\s+/g;

export type ImageType = 'story' | 'photo';

const OPENROUTER_VISION_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const OLLAMA_VISION_ENDPOINT = process.env.OLLAMA_CLOUD_URL ?? 'https://ollama.com/v1/chat/completions';
const IMAGE_DOWNLOAD_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 1;
const RETRY_DELAY_MS = 800;

const OCR_PROMPT = 'Extract ALL text from this image. Return the raw text only, preserving layout. No explanations.';

function getOpenRouterApiKey(): string | undefined {
  return process.env.OPENROUTER_API_KEY;
}

function getOllamaApiKey(): string | undefined {
  return process.env.OLLAMA_CLOUD_API_KEY;
}

function isOllamaModel(model: string): boolean {
  return (OLLAMA_VISION_MODELS as readonly string[]).includes(model);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface VisionContent {
  type: string;
  text?: string;
  image_url?: { url: string };
}

async function fetchImageAsBase64(imageUrl: string): Promise<{ base64: string; mediaType: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), IMAGE_DOWNLOAD_TIMEOUT_MS);

  try {
    const response = await fetch(imageUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') ?? 'image/jpeg';
    const base64 = Buffer.from(buffer).toString('base64');

    return { base64, mediaType: contentType };
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Image download timeout');
    }
    throw error;
  }
}

function buildImageContent(imageInput: string): VisionContent {
  if (imageInput.startsWith('data:')) {
    return { type: 'image_url', image_url: { url: imageInput } };
  }
  return { type: 'image_url', image_url: { url: imageInput } };
}

async function resolveImageInput(imageInput: string): Promise<VisionContent> {
  if (imageInput.startsWith('data:')) {
    return buildImageContent(imageInput);
  }

  if (imageInput.startsWith('http://') || imageInput.startsWith('https://')) {
    const { base64, mediaType } = await fetchImageAsBase64(imageInput);
    return {
      type: 'image_url',
      image_url: { url: `data:${mediaType};base64,${base64}` },
    };
  }

  return {
    type: 'image_url',
    image_url: { url: `data:image/png;base64,${imageInput}` },
  };
}

async function callVisionModel(
  messages: VisionContent[],
  model: string,
  maxTokens: number,
): Promise<{ success: boolean; content?: string; error?: string; errorType?: string }> {
  const useOllama = isOllamaModel(model);
  const endpoint = useOllama ? OLLAMA_VISION_ENDPOINT : OPENROUTER_VISION_ENDPOINT;
  const apiKey = useOllama ? getOllamaApiKey() : getOpenRouterApiKey();

  if (!apiKey) {
    return { success: false, error: `${useOllama ? 'OLLAMA_CLOUD_API_KEY' : 'OPENROUTER_API_KEY'} not set`, errorType: 'AUTH_ERROR' };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };
  if (!useOllama) {
    headers['HTTP-Referer'] = 'https://truckfull.food';
    headers['X-Title'] = 'TruckFull OCR';
  }

  const body: Record<string, unknown> = {
    model,
    messages: [{ role: 'user', content: messages }],
    max_tokens: maxTokens,
  };
  if (useOllama) {
    body.temperature = 0;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorType = 'API_ERROR';
    switch (true) {
      case response.status === 429: {
        errorType = 'RATE_LIMIT';
        break;
      }
      case response.status === 503 || response.status === 502: {
        errorType = 'SERVICE_UNAVAILABLE';
        break;
      }
      case response.status === 401 || response.status === 403: {
        errorType = 'AUTH_ERROR';
        break;
      }
      case response.status >= 500: {
        errorType = 'SERVER_ERROR';
        break;
      }
    }

    return { success: false, error: `HTTP ${response.status}: ${errorText.slice(0, 200)}`, errorType };
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    return { success: false, error: 'Model returned empty content', errorType: 'EMPTY_RESPONSE' };
  }

  return { success: true, content };
}

async function extractTextWithVision(imageInput: string): Promise<{ text: string; model: string }> {
  const imageContent = await resolveImageInput(imageInput);
  const models = getVisionModelFallbacks();

  if (models.length === 0) {
    throw new Error('No OCR vision models configured');
  }

  for (const model of models) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        logMessage(`OCR: Trying ${model} (attempt ${attempt})`);
        const result = await callVisionModel(
          [
            { type: 'text', text: OCR_PROMPT },
            imageContent,
          ],
          model,
          4096,
        );

        if (result.success && result.content) {
          logMessage(`OCR: ${model} succeeded (${result.content.length} chars)`);
          return { text: result.content, model };
        }

        logMessage(`OCR: ${model} attempt ${attempt} failed: [${result.errorType}] ${result.error?.slice(0, 80)}`);

        if (result.errorType === 'AUTH_ERROR' || result.errorType === 'RATE_LIMIT') break;

        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAY_MS);
        }
      } catch (error) {
        logMessage(`OCR: ${model} attempt ${attempt} threw: ${error instanceof Error ? error.message : 'unknown'}`);
        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAY_MS);
        }
      }
    }
  }

  throw new Error('All OCR vision models failed');
}

export async function ocrWithVision(imageUrl: string, _imageType: ImageType): Promise<ParsedPost> {
  if (!imageUrl || typeof imageUrl !== 'string') {
    logError('ocrVision: Invalid image URL');
    return { food_items: [], confidence: 0 };
  }

  try {
    const { text } = await extractTextWithVision(imageUrl);
    return parseOcrResult(text);
  } catch (error) {
    logError('ocrVision: Error during OCR processing', error);
    return { food_items: [], confidence: 0 };
  }
}

export interface RawOcrResult {
  text: string;
  success: boolean;
  error?: string;
}

export async function extractRawText(imageInput: string): Promise<RawOcrResult> {
  if (!imageInput) return { text: '', success: false, error: 'No image input' };

  if (!isOcrAvailable()) {
    return { text: '', success: false, error: 'No OCR API keys configured (OLLAMA_CLOUD_API_KEY or OPENROUTER_API_KEY)' };
  }

  try {
    const { text } = await extractTextWithVision(imageInput);
    if (!text) return { text: '', success: false, error: 'No text extracted' };
    return { text, success: true };
  } catch (error) {
    return {
      text: '',
      success: false,
      error: error instanceof Error ? error.message : 'OCR failed',
    };
  }
}

export function isOcrAvailable(): boolean {
  return !!getOllamaApiKey() || !!getOpenRouterApiKey();
}

function parseOcrResult(text: string): ParsedPost {
  const result: ParsedPost = {
    food_items: [],
    confidence: 0.5,
  };

  result.food_items = extractFoodItems(text);

  const location = extractLocation(text);
  if (location) result.location = location;

  const times = extractTimes(text);
  if (times) result.times = times;

  let confidence = 0.5;
  if (result.food_items.length > 0) confidence += 0.15;
  if (result.location) confidence += 0.2;
  if (result.times) confidence += 0.15;
  confidence = Math.min(confidence, 1);
  result.confidence = confidence;

  return result;
}

function extractFoodItems(text: string): string[] {
  const lowerText = text.toLowerCase();
  const foodKeywords = [
    'taco', 'burrito', 'burger', 'pizza', 'sandwich', 'hot dog',
    'quesadilla', 'nachos', 'fries', 'chicken', 'beef', 'pork',
    'veggie', 'vegetarian', 'vegan', 'salsa', 'guacamole', 'guac',
    'cheese', 'soda', 'drink', 'water', 'coffee', 'tea', 'smoothie',
    'shake', 'dessert', 'ice cream', 'cookie', 'brownie',
  ];

  const foundItems: string[] = [];
  for (const keyword of foodKeywords) {
    if (lowerText.includes(keyword)) {
      const capitalized = keyword.charAt(0).toUpperCase() + keyword.slice(1);
      if (!foundItems.includes(capitalized)) foundItems.push(capitalized);
    }
  }
  return foundItems;
}

function extractLocation(text: string): { address: string; fuzzy: boolean } | undefined {
  const locationPatterns = [
    LOCATION_PHRASE,
    STREET_ADDRESS,
  ];

  for (const pattern of locationPatterns) {
    const match = text.match(pattern);
    if (match) {
      const addressPart = match[1]?.trim() ?? '';
      return {
        address: addressPart,
        fuzzy: addressPart.toLowerCase().includes('near') || addressPart.toLowerCase().includes('by'),
      };
    }
  }
  return undefined;
}

function extractTimes(text: string): { start: string; end: string } | undefined {
  const timePatterns = [
    TIME_RANGE,
    HOURS_RANGE,
  ];

  for (const pattern of timePatterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        start: match[1]?.toLowerCase().replaceAll(WHITESPACE_RUNS, '') ?? '',
        end: match[2]?.toLowerCase().replaceAll(WHITESPACE_RUNS, '') ?? '',
      };
    }
  }
  return undefined;
}
