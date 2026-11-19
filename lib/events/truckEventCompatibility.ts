import { Redis } from '@upstash/redis';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { logError } from '@/lib/logging';

const WHITESPACE = /\s+/;

export interface CompatibilityResult {
  score: number;
  label: 'excellent' | 'good' | 'fair' | 'poor' | 'incompatible';
  matchedCuisines: string[];
  conflictDetected: boolean;
  conflicts: string[];
  reasoning: string;
}

interface TruckProfile {
  id: string;
  name: string;
  cuisine_type: string[];
}

interface EventProfile {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
}

const INCOMPATIBILITY_RULES: Array<[RegExp, RegExp, string]> = [
  [
    /\b(?:bbq|barbecue|meat|steak|burger|sausage|chicken|ribs)\b/i,
    /\b(?:vegan|vegetarian|plant.?based)\b/i,
    'Meat-heavy menu vs. vegan/vegetarian event',
  ],
  [
    /\b(?:ice.?cream|gelato|shaved.?ice|dessert)\b/i,
    /\b(?:cold|winter|christmas|holiday)\b/i,
    'Cold dessert vs. cold weather event',
  ],
  [
    /\b(?:seafood|fish|shrimp|crab|lobster|oyster)\b/i,
    /\b(?:kosher|halal)\b/i,
    'Seafood may not meet dietary requirements',
  ],
];

const POSITIVE_ASSOCIATIONS: Array<[RegExp, RegExp, number]> = [
  [/\b(?:bbq|barbecue|grill|smoker)\b/i, /\b(?:bbq|barbecue|grill|smoke|cook.?off|rib)\b/i, 1.5],
  [
    /\b(?:taco|mexican|tex.?mex)\b/i,
    /\b(?:cinco.?de.?mayo|fiesta|hispanic|latino|mexican)\b/i,
    1.5,
  ],
  [/\b(?:pizza|italian)\b/i, /\b(?:italian|pizza|pasta)\b/i, 1.3],
  [/\b(?:asian|thai|chinese|japanese|sushi)\b/i, /\b(?:asian|lunar|chinese|japanese|thai)\b/i, 1.3],
  [/\b(?:coffee|espresso|latte)\b/i, /\b(?:morning|breakfast|brunch|coffee)\b/i, 1.4],
  [
    /\b(?:ice.?cream|dessert|sweet|baked)\b/i,
    /\b(?:fair|festival|carnival|family|kids|children)\b/i,
    1.3,
  ],
];

const COMPATIBILITY_CACHE_TTL = 24 * 60 * 60;

let redisClient: Redis | null = null;
let hasLoggedRedisWarning = false;

function getRedisClient(): Redis | null {
  if (redisClient) return redisClient;

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    if (!hasLoggedRedisWarning) {
      hasLoggedRedisWarning = true;
      logError('[COMPATIBILITY] Upstash Redis not configured. Caching disabled.');
    }
    return null;
  }

  redisClient = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  return redisClient;
}

export function calculateCompatibility(
  truck: TruckProfile,
  event: EventProfile,
): CompatibilityResult {
  const truckCuisines = truck.cuisine_type ?? [];
  if (truckCuisines.length === 0) {
    return {
      score: 50,
      label: 'fair',
      matchedCuisines: [],
      conflictDetected: false,
      conflicts: [],
      reasoning: 'No cuisine type available for this truck',
    };
  }

  const eventText = [event.title, event.description, event.category]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const conflicts: string[] = [];
  const truckCuisineText = truckCuisines.join(' ');

  for (const [truckPattern, eventPattern, reason] of INCOMPATIBILITY_RULES) {
    if (truckPattern.test(truckCuisineText) && eventPattern.test(eventText)) {
      conflicts.push(reason);
    }
  }

  let score = 50;

  let positiveBoost = 0;
  const matchedCuisines: string[] = [];

  for (const [truckPattern, eventPattern, multiplier] of POSITIVE_ASSOCIATIONS) {
    for (const cuisine of truckCuisines) {
      if (truckPattern.test(cuisine) && eventPattern.test(eventText)) {
        positiveBoost += 15 * multiplier;
        matchedCuisines.push(cuisine);
      }
    }
  }

  for (const cuisine of truckCuisines) {
    const cuisineWords = cuisine.toLowerCase().split(WHITESPACE);
    for (const word of cuisineWords) {
      if (word.length > 2 && eventText.includes(word)) {
        positiveBoost += 10;
        if (!matchedCuisines.includes(cuisine)) {
          matchedCuisines.push(cuisine);
        }
      }
    }
  }

  score += Math.min(positiveBoost, 50);

  if (conflicts.length > 0) {
    score -= conflicts.length * 30;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let label: CompatibilityResult['label'];
  if (score >= 80) label = 'excellent';
  else if (score >= 60) label = 'good';
  else if (score >= 40) label = 'fair';
  else if (score >= 20) label = 'poor';
  else label = 'incompatible';

  const reasoningParts: string[] = [];
  if (matchedCuisines.length > 0) {
    reasoningParts.push(`Cuisine match: ${matchedCuisines.join(', ')}`);
  }
  if (conflicts.length > 0) {
    reasoningParts.push(`Conflicts: ${conflicts.join('; ')}`);
  }
  if (reasoningParts.length === 0) {
    reasoningParts.push('No strong positive or negative signals');
  }

  return {
    score,
    label,
    matchedCuisines,
    conflictDetected: conflicts.length > 0,
    conflicts,
    reasoning: reasoningParts.join('. '),
  };
}

export async function getCompatibilityScore(
  truckId: string,
  eventId: string,
): Promise<CompatibilityResult | null> {
  const redis = getRedisClient();
  if (redis) {
    const cacheKey = `compat:${truckId}:${eventId}`;
    const cached = await redis.get<CompatibilityResult>(cacheKey);
    if (cached) return cached;
  }

  const supabase = getSupabaseAdmin();

  const [truckResult, eventResult] = await Promise.all([
    supabase.from('food_trucks').select('id, name, cuisine_type').eq('id', truckId).single(),
    supabase
      .from('external_events')
      .select('id, title, description, category')
      .eq('id', eventId)
      .single(),
  ]);

  if (truckResult.error || !truckResult.data) {
    logError('Truck not found for compatibility:', truckResult.error);
    return null;
  }

  if (eventResult.error || !eventResult.data) {
    logError('Event not found for compatibility:', eventResult.error);
    return null;
  }

  const result = calculateCompatibility(
    {
      id: truckResult.data.id,
      name: truckResult.data.name,
      cuisine_type: truckResult.data.cuisine_type ?? [],
    },
    {
      id: eventResult.data.id,
      title: eventResult.data.title,
      description: eventResult.data.description,
      category: eventResult.data.category,
    },
  );

  if (redis) {
    const cacheKey = `compat:${truckId}:${eventId}`;
    await redis.set(cacheKey, result, { ex: COMPATIBILITY_CACHE_TTL });
  }

  return result;
}
