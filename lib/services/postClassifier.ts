import type { ParsedPost } from '@/lib/ai/parseFacebookPost';
import { hasStrictCompleteTimes } from './scheduleSemantics';
import type { TextBasedData } from './textExtractor';

export enum PostType {
  MENU = 'menu',
  LOCATION = 'location',
  SCHEDULE = 'schedule',
  MIXED = 'mixed',
  UNRELATED = 'unrelated',
  AMBIGUOUS = 'ambiguous',
}

export interface Classification {
  type: PostType;
  confidence: number;
  reason: string;
  requiresConfirmation: boolean;
}

const UNRELATED_PATTERNS = [
  /\bthanks?\s+(?:you|for|to|everyone|all)\b/i,
  /\b(?:thanks|thank\s*you)\s+(?:for\s+(?:your|the|all\s+(?:the\s+)?support|love))\b/i,
  /\bwe\s+(?:appreciate|are\s+(?:grateful|thankful))\s+(?:you|everyone|all)\b/i,
  /\bblessed\s+(?:to|for|by)\b/i,
  /\bgrateful\s+(?:for|to)\b/i,
  /\b(?:love|appreciate)\s+(?:and|&)\s+(?:support|prayers)\b/i,
  /\bwant\s+to\s+(?:help|thank|give)\b/i,
  /\b(?:literally\s+)?that\s+simple\b/i,
  /\b(?:excited|thrilled|happy)\s+to\s+(?:be\s+)?participating\b/i,
  /\b(?:shoutout|shout\s*out)\s+(?:to|for)\b/i,
  /\b(?:follow|like|share|subscribe)\s+(?:us|our|this)\b/i,
  /\b(?:check\s+us\s+out|visit\s+our\s+(?:website|page))\b/i,
  /\b(?:new\s+year|happy\s+(?:new\s+year|holidays|birthday))\b/i,
  /\b(?:merry\s+christmas|happy\s+(?:easter|thanksgiving|halloween))\b/i,
];

const GRATITUDE_KEYWORDS = [
  'thanks for',
  'thank you for',
  'appreciate',
  'blessed',
  'love and support',
  'love  and support',
  'prayers',
  'thoughts',
  'wishing',
  'happy holidays',
  'merry christmas',
  'happy new year',
];

const MEME_PHRASES = ['want to help', 'literally that simple', 'just saying', 'no cap'];

const EVENT_PHRASES = [
  'excited to be participating',
  'join us at',
  'come see us at',
  'we will be at',
];

export function classifyPost(
  ocrResult: ParsedPost,
  textData: TextBasedData,
  postMessage?: string,
): Classification {
  const hasFoodItems = ocrResult.food_items && ocrResult.food_items.length > 0;
  const hasLocation = Boolean(ocrResult.location?.address || textData.location?.address);
  const hasTimes = Boolean(ocrResult.times);
  const hasCompleteTimes = hasStrictCompleteTimes(ocrResult.times);

  const isUnrelated = checkIfUnrelated(postMessage);

  if (isUnrelated) {
    return {
      type: PostType.UNRELATED,
      confidence: 0.9,
      reason: 'Post contains gratitude/thanks or non-business content',
      requiresConfirmation: false,
    };
  }

  const dataTypesPresent = [hasFoodItems, hasLocation, hasTimes].filter(Boolean).length;

  if (dataTypesPresent === 0) {
    return {
      type: PostType.UNRELATED,
      confidence: 0.95,
      reason: 'No extractable business data found (no food, location, or time information)',
      requiresConfirmation: false,
    };
  }

  let type: PostType;
  let reason: string;

  if (hasFoodItems && !hasLocation && !hasTimes) {
    type = PostType.MENU;
    reason = `Menu update: ${ocrResult.food_items?.length ?? 0} food items detected`;
  } else if (hasLocation && !hasFoodItems && !hasTimes) {
    type = PostType.LOCATION;
    reason = `Location update: ${ocrResult.location?.address || textData.location?.address || 'unknown'}`;
  } else if (hasTimes && !hasFoodItems && !hasLocation) {
    type = PostType.SCHEDULE;
    reason = hasCompleteTimes ? 'Schedule update detected' : 'Partial schedule data detected';
  } else if (dataTypesPresent >= 2) {
    type = PostType.MIXED;
    reason = `Mixed update: ${hasFoodItems ? 'menu ' : ''}${hasLocation ? 'location ' : ''}${hasTimes ? 'times ' : ''}detected`;
  } else {
    type = PostType.AMBIGUOUS;
    reason = 'Please confirm this post before we apply it';
  }

  const confidence = calculateConfidence(ocrResult, hasLocation, hasTimes);

  const requiresConfirmation = confidence < 0.7;

  if (confidence < 0.5) {
    return {
      type: PostType.AMBIGUOUS,
      confidence,
      reason: `Low confidence (${(confidence * 100).toFixed(0)}%) - ${reason}`,
      requiresConfirmation: true,
    };
  }

  return {
    type,
    confidence,
    reason,
    requiresConfirmation,
  };
}

function checkIfUnrelated(message?: string): boolean {
  if (!message || typeof message !== 'string') {
    return false;
  }

  const lowerMessage = message.toLowerCase();

  for (const keyword of GRATITUDE_KEYWORDS) {
    if (lowerMessage.includes(keyword)) {
      const surroundingContextCount = countBusinessKeywords(lowerMessage);
      if (surroundingContextCount === 0) {
        return true;
      }
    }
  }

  for (const phrase of MEME_PHRASES) {
    if (lowerMessage.includes(phrase)) {
      return true;
    }
  }

  for (const phrase of EVENT_PHRASES) {
    if (lowerMessage.includes(phrase)) {
      const hasFoodOrLocation = checkForFoodOrLocation(lowerMessage);
      if (!hasFoodOrLocation) {
        return true;
      }
    }
  }

  for (const pattern of UNRELATED_PATTERNS) {
    if (pattern.test(message)) {
      return true;
    }
  }

  return false;
}

function countBusinessKeywords(text: string): number {
  const businessKeywords = [
    'menu',
    'special',
    'price',
    'order',
    'open',
    'hours',
    'location',
    'address',
    'serving',
    'tacos',
    'burgers',
    'pizza',
    'food',
  ];
  let count = 0;
  for (const keyword of businessKeywords) {
    if (text.includes(keyword)) {
      count++;
    }
  }
  return count;
}

function checkForFoodOrLocation(text: string): boolean {
  const foodKeywords = [
    'taco',
    'burger',
    'pizza',
    'sandwich',
    'food',
    'menu',
    'special',
    'order',
    'serving',
  ];
  const locationKeywords = [
    'at',
    'near',
    'located',
    'find us',
    'address',
    'street',
    'avenue',
    'park',
  ];

  for (const keyword of foodKeywords) {
    if (text.includes(keyword)) return true;
  }

  for (const keyword of locationKeywords) {
    if (text.includes(keyword)) return true;
  }

  return false;
}

function calculateConfidence(
  ocrResult: ParsedPost,
  hasLocation: boolean,
  hasTimes: boolean,
): number {
  let confidence = ocrResult.confidence || 0.5;

  if (ocrResult.food_items && ocrResult.food_items.length > 0) {
    confidence += 0.15;
  }

  if (hasLocation) {
    confidence += 0.15;
  }

  if (hasTimes) {
    confidence += 0.1;
  }

  if (ocrResult.location?.fuzzy) {
    confidence -= 0.1;
  }

  return Math.min(Math.max(confidence, 0), 1);
}
