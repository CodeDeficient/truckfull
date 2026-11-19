import { callOpenRouter } from '@/lib/openrouter';
import { logMessage, logError } from '@/lib/logging';
import { extractJsonSafely } from '@/lib/utils/jsonExtractor';
import { getBestVisionModel } from '@/lib/ai/modelConfig';
import { ocrWithVision, isOcrAvailable } from '@/lib/ai/ocrVision';
import type { ParsedPost } from '@/lib/ai/parseFacebookPost';

export type ImageType = 'story' | 'photo';

const OCR_PROMPT = `You are extracting text and food truck business information from an image. The image may be a Facebook Story or photo post.

Image URL: {IMAGE_URL}
Image Type: {IMAGE_TYPE}

Analyze the image and extract:
1. Any text visible in the image
2. Food items mentioned in the text
3. Location information (address, city, state)
4. Operating hours or times
5. Menu prices if visible
6. Confidence level (0.0-1.0) based on text clarity and completeness

IMPORTANT RULES:
- Extract ALL visible text, even if partial
- For Stories: Pay attention to overlays, stickers, and text decorations
- For photos: Look for menu boards, signs, banners
- If image contains no readable text, set confidence < 0.7
- Handle handwriting, stylized text, and text overlays
- Location: Mark fuzzy=true if it's a landmark or relative location
- Time formats: "11am-3pm", "11:00-15:00", etc.

Return ONLY valid JSON:
{
  "extracted_text": "full text extracted from image",
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
    "days": ["Monday", "Tuesday"]
  },
  "prices": [
    {"item": "tacos", "price": 5},
    {"item": "burgers", "price": 8}
  ],
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

function isValidImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidImageType(type: string): type is ImageType {
  return type === 'story' || type === 'photo';
}

export async function ocrImage(imageUrl: string, imageType: ImageType): Promise<ParsedPost> {
  if (!isValidImageUrl(imageUrl)) {
    logError('ocrImage: Invalid image URL', new Error(`Invalid URL: ${imageUrl}`));
    return DEFAULT_RESULT;
  }

  if (!isValidImageType(imageType)) {
    logError('ocrImage: Invalid image type', new Error(`Invalid type: ${imageType}`));
    return DEFAULT_RESULT;
  }

  if (isOcrAvailable()) {
    const result = await ocrWithVision(imageUrl, imageType);
    if (result.confidence >= 0.5) {
      logMessage('ocrImage: Using OpenRouter vision OCR', {
        confidence: result.confidence,
        foodItems: result.food_items.length,
      });
      return logAndReturn(result, imageType);
    }
    logMessage('ocrImage: Vision OCR result below threshold, trying LLM fallback', {
      confidence: result.confidence,
    });
  }

  return ocrWithOpenRouter(imageUrl, imageType);
}

async function ocrWithOpenRouter(imageUrl: string, imageType: ImageType): Promise<ParsedPost> {
  try {
    const prompt = OCR_PROMPT.replace('{IMAGE_URL}', imageUrl).replace('{IMAGE_TYPE}', imageType);
    const selectedModel = getBestVisionModel();

    const response = await callOpenRouter(
      [
        {
          role: 'user',
          content: prompt,
        },
      ],
      {
        temperature: 0,
        model: selectedModel,
      },
    );

    if (!response.success || !response.data) {
      logError('ocrImage: OpenRouter call failed', response.error);
      return DEFAULT_RESULT;
    }

    const jsonText = extractJsonSafely(response.data);
    if (!jsonText) {
      logError('ocrImage: No valid JSON found in response');
      return DEFAULT_RESULT;
    }

    const parsed = JSON.parse(jsonText) as Partial<ParsedPost & { extracted_text?: string }>;

    const result: ParsedPost = {
      food_items: parsed.food_items || [],
      location: parsed.location,
      times: parsed.times,
      prices: parsed.prices,
      hashtags: undefined,
      confidence: parsed.confidence || 0,
    };

    return logAndReturn(result, imageType);
  } catch (error) {
    logError('ocrImage: Error during OCR processing', error);
    return DEFAULT_RESULT;
  }
}

function logAndReturn(result: ParsedPost, imageType: ImageType): ParsedPost {
  if (result.confidence < 0.7) {
    logMessage('Low confidence OCR result', {
      type: imageType,
      confidence: result.confidence,
      extracted: {
        foodItems: result.food_items.length,
        hasLocation: !!result.location,
        hasTimes: !!result.times,
      },
    });
  } else {
    logMessage('Successfully processed image with OCR', {
      type: imageType,
      confidence: result.confidence,
      foodItems: result.food_items.length,
      hasLocation: !!result.location,
      hasTimes: !!result.times,
    });
  }

  return result;
}

export function hasReadableText(result: ParsedPost): boolean {
  return (
    result.confidence >= 0.7 &&
    (result.food_items.length > 0 ||
      result.location !== undefined ||
      result.times !== undefined ||
      (result.prices !== undefined && result.prices.length > 0))
  );
}

export function shouldProcessImage(result: ParsedPost): boolean {
  return hasReadableText(result) && result.confidence >= 0.7;
}
