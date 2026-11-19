import { diceCoefficient } from '@/lib/utils/stringSimilarity';

const NON_ALPHANUMERIC_RUN = /[^a-z0-9]+/;

interface RelevanceSignal {
  pattern: RegExp;
  weight: number;
}

export interface RelevanceResult {
  decision: 'relevant' | 'irrelevant' | 'ambiguous';
  score: number;
  confidence: number;
  matchedSignals: string[];
  fuzzyMatches: string[];
  hardExclusionMatched: string | null;
}

const POSITIVE_SIGNALS: RelevanceSignal[] = [
  { pattern: /\bfood\s*truck/i, weight: 5 },
  { pattern: /\bfood\s*fest/i, weight: 5 },
  { pattern: /\bfoodies?\b/i, weight: 4 },
  { pattern: /\bstreet\s*(food|fair|party)/i, weight: 4 },
  { pattern: /\bcook\s*-?\s*off/i, weight: 4 },
  { pattern: /\bcookoff\b/i, weight: 4 },
  { pattern: /\bgrill\s*off/i, weight: 4 },
  { pattern: /\brodeo/i, weight: 4 },
  { pattern: /\bfestival/i, weight: 3 },
  { pattern: /\bfair\b(?!.*(housing|trade|price|market.value|wage|tax|credit))/i, weight: 3 },
  { pattern: /\bblock\s*party/i, weight: 3 },
  { pattern: /\bmarket\b(?!.*(share|research|analysis|value|price|cap|rate|ing.plan))/i, weight: 2 },
  { pattern: /\bfarmers?\s*market/i, weight: 3 },
  { pattern: /\bcelebration/i, weight: 3 },
  { pattern: /\bgrand\s*open/i, weight: 4 },
  { pattern: /\bconcert\b/i, weight: 2 },
  { pattern: /\blive\s*music/i, weight: 2 },
  { pattern: /\bbrunch\b/i, weight: 2 },
  { pattern: /\bbeer\s*(fest|garden|tasting)/i, weight: 3 },
  { pattern: /\bwine\s*(fest|tasting|walk)/i, weight: 2 },
  { pattern: /\btacos?\s*fest/i, weight: 5 },
  { pattern: /\btacos?\b/i, weight: 3 },
  { pattern: /\btequila/i, weight: 3 },
  { pattern: /\boktoberfest/i, weight: 4 },
  { pattern: /\bjazz/i, weight: 2 },
  { pattern: /\bmusic(?:al)?\b/i, weight: 2 },
  { pattern: /\bcar\s*show/i, weight: 3 },
  { pattern: /\b(auto|home|boat|rv|trade)\s*show/i, weight: 2 },
  { pattern: /\bexpo\b/i, weight: 2 },
  { pattern: /\bvendor/i, weight: 3 },
  { pattern: /\btruck\b/i, weight: 2 },
  { pattern: /\bcarnival/i, weight: 3 },
  { pattern: /\bparade\b/i, weight: 2 },
  { pattern: /\bfirework/i, weight: 2 },
  { pattern: /\b(4th|fourth)\s*of\s*july/i, weight: 3 },
  { pattern: /\bindependence\s*day/i, weight: 3 },
  { pattern: /\bmemorial\s*day/i, weight: 2 },
  { pattern: /\bhalloween\b/i, weight: 2 },
  { pattern: /\bchristmas\b/i, weight: 2 },
  { pattern: /\bst?\s*patricks?\s*day/i, weight: 2 },
  { pattern: /\bnew\s*years?\s*eve/i, weight: 2 },
  { pattern: /\bjuneteenth/i, weight: 2 },
  { pattern: /\bpicnic\b/i, weight: 2 },
  { pattern: /\bbar\s*crawl/i, weight: 2 },
  { pattern: /\btailgate/i, weight: 3 },
  { pattern: /\bwatch\s*party/i, weight: 2 },
  { pattern: /\bwing\s*(fest|cook|off)/i, weight: 3 },
  { pattern: /\bcrab\s*feast/i, weight: 4 },
  { pattern: /\bshrimp\s*feast/i, weight: 4 },
  { pattern: /\bseafood\s*fest/i, weight: 4 },
  { pattern: /\bcrawfish/i, weight: 4 },
  { pattern: /\blow\s*country\s*boil/i, weight: 4 },
  { pattern: /\boyster\s*(roast|fest)/i, weight: 4 },
  { pattern: /\bfish\s*fry/i, weight: 3 },
  { pattern: /\bcommunity\s*(day|event|gather|picnic|celebration)/i, weight: 2 },
  { pattern: /\bspring\s*fling/i, weight: 2 },
  { pattern: /\bsummer\s*(bash|kickoff|party|fest)/i, weight: 2 },
  { pattern: /\bfall\s*fest/i, weight: 2 },
  { pattern: /\bharvest\s*fest/i, weight: 2 },
  { pattern: /\bsoiree\b/i, weight: 2 },
  { pattern: /\bshindig/i, weight: 2 },
  { pattern: /\bhoedown/i, weight: 3 },
  { pattern: /\btasting\b/i, weight: 2 },
  { pattern: /\bparty\b/i, weight: 1 },
  { pattern: /\bsip\b/i, weight: 1 },
  { pattern: /\bbash\b/i, weight: 1 },
  { pattern: /\bgala\b/i, weight: 1 },
];

const NEGATIVE_SIGNALS: RelevanceSignal[] = [
  { pattern: /\bcertif\w+\b/i, weight: 5 },
  { pattern: /\btraining\b/i, weight: 5 },
  { pattern: /\bbootcamp\b/i, weight: 4 },
  { pattern: /\bhomeschool/i, weight: 4 },
  { pattern: /\binformation\s*session/i, weight: 3 },
  { pattern: /\blunch\s*[&and]\s*learn/i, weight: 4 },
  { pattern: /\bmeetup\b/i, weight: 3 },
  { pattern: /\bnetworking\b/i, weight: 2 },
  { pattern: /\bcasting\s*call/i, weight: 4 },
  { pattern: /\banime\b/i, weight: 3 },
  { pattern: /\bgolf\s*(classic|tournament)/i, weight: 3 },
  { pattern: /\balzheimer/i, weight: 4 },
  { pattern: /\bblood\s*(drive|mobile|donation)/i, weight: 4 },
  { pattern: /\breal\s*estate\b/i, weight: 4 },
  { pattern: /\btravel\s*biz/i, weight: 4 },
  { pattern: /\bnursing\s*(info|session|program)/i, weight: 3 },
  { pattern: /\b(?:bird(?:ing|walk|watch)|nature\s*walk|hike\b|stroll\s*series)/i, weight: 3 },
  { pattern: /\bafterschool/i, weight: 3 },
  { pattern: /\byouth\s*bird/i, weight: 3 },
  { pattern: /\btech\s*talk/i, weight: 3 },
  { pattern: /\bpodcast\s*summit/i, weight: 3 },
  { pattern: /\bline\s*dance/i, weight: 2 },
  { pattern: /\bpre[-\s]?party\b/i, weight: 4 },
  { pattern: /\bpre[-\s]?concert\b/i, weight: 4 },
  { pattern: /\bpre[-\s]?show\b/i, weight: 4 },
  { pattern: /\b\w+\s+walk\b/i, weight: 4 },
  { pattern: /\b(?:5k|10k|half\s*marathon|marathon|fun\s*run|run\s*for|awareness\s*walk)\b/i, weight: 4 },
  { pattern: /\bcharity\s*(walk|run|event)/i, weight: 4 },
  { pattern: /\bfilm\s*(premiere|screening|festival)/i, weight: 4 },
  { pattern: /\bbook\s*festival\b/i, weight: 4 },
  { pattern: /\bopera\b/i, weight: 4 },
  { pattern: /\btheatre|\btheater|\bplay\b|stage\s*play/i, weight: 3 },
  { pattern: /\blibrary\s*presents/i, weight: 3 },
  { pattern: /\bdrag\b/i, weight: 4 },
  { pattern: /\bbachelor(?:ette)?\s*party/i, weight: 3 },
  { pattern: /\bbach\s*(party|bar\s*crawl)/i, weight: 3 },
  { pattern: /\blego\b/i, weight: 4 },
  { pattern: /\bhome\s*show\b/i, weight: 4 },
  { pattern: /\bscreening\b|\bmovie\s*night\b/i, weight: 3 },
  { pattern: /\bsymphony\b|\bphilharmonic\b/i, weight: 4 },
  { pattern: /\b(?:museum\s*of|museum,|\bmuseum\b.*rotunda|\bmuseum\b.*gallery|\bhistory\s*museum|\bart\s*museum)/i, weight: 4 },
  { pattern: /\bconvention\s*center\b/i, weight: 4 },
  { pattern: /\bperforming\s*arts\s*center\b/i, weight: 4 },
  { pattern: /\blibrary\b/i, weight: 3 },
  { pattern: /\bkoger\s*center\b/i, weight: 4 },
  { pattern: /\bmiller\s*theater\b/i, weight: 4 },
  { pattern: /\bnickelodeon\s*theatre\b/i, weight: 4 },
  { pattern: /\bwild\s*adventures\b/i, weight: 4 },
  { pattern: /\baugusta\s*museum\s*of\s*history\b/i, weight: 4 },
];

const HARD_EXCLUSIONS: ReadonlyArray<{ pattern: RegExp; label: string }> = [
  { pattern: /\b(?:PMP|ITIL|CAPM|CISSP)\b/i, label: 'certification_exam' },
  { pattern: /\b(?:exam\s+prep|test\s+prep)\b/i, label: 'test_prep' },
  { pattern: /\b(?:5k|10k|half\s+marathon)\s+(?:run|walk|race|challenge)\b/i, label: 'foot_race' },
  { pattern: /\b(?:walkathon|fun\s+run)\b/i, label: 'charity_walk_run' },
  { pattern: /\bblood\s+(?:drive|mobile|donation)\b/i, label: 'blood_drive' },
  { pattern: /\b(?:hospital\s+tour|OB\s+tour|NICU\s+tour)\b/i, label: 'hospital_tour' },
  { pattern: /\b(?:pottery|bandsaw|woodworking|sewing|knitting)\s+(?:class|workshop)\b/i, label: 'craft_class' },
  { pattern: /\b(?:cancer\s+support|support\s+group|grief\s+support)\b/i, label: 'support_group' },
  { pattern: /\bhomeschool\b/i, label: 'homeschool' },
  { pattern: /\bgolf\s+(?:classic|tournament)\b/i, label: 'golf_event' },
];

export const FOOD_TRUCK_RELEVANCE_THRESHOLD = 5;

const FUZZY_MATCH_THRESHOLD = 0.7;

const CORE_FOOD_TRUCK_TERMS = [
  'food', 'truck', 'trucks', 'festival', 'market', 'taco', 'tacos',
  'beer', 'wine', 'brunch', 'concert', 'party', 'vendor', 'carnival',
  'parade', 'fair', 'music', 'brew', 'feast', 'fry', 'roast',
  'farmers', 'oktoberfest', 'celebration', 'bbq', 'grill',
  'seafood', 'crawfish', 'shrimp', 'oyster', 'wing', 'crab',
  'community', 'block', 'tailgate', 'picnic', 'harvest',
];

function checkHardExclusions(text: string): string | null {
  for (const exclusion of HARD_EXCLUSIONS) {
    if (exclusion.pattern.test(text)) {
      return exclusion.label;
    }
  }
  return null;
}

function findFuzzyMatches(text: string): string[] {
  const words = text.toLowerCase().split(NON_ALPHANUMERIC_RUN).filter(Boolean);
  const matches: string[] = [];

  for (const word of words) {
    for (const term of CORE_FOOD_TRUCK_TERMS) {
      if (word.length < 2 || term.length < 2) continue;
      if (word === term) continue;
      if (word.startsWith(term) || term.startsWith(word)) continue;
      const score = diceCoefficient(word, term);
      if (score >= FUZZY_MATCH_THRESHOLD) {
        matches.push(`${word}→${term}(${score.toFixed(2)})`);
      }
    }
  }

  return [...new Set(matches)];
}

export function classifyRelevance(title: string, description: string): number {
  const result = classifyRelevanceDetailed(title, description);
  return result.score;
}

export function classifyRelevanceDetailed(
  title: string,
  description: string,
): RelevanceResult {
  const text = `${title} ${description}`;

  const hardExclusion = checkHardExclusions(text);
  if (hardExclusion) {
    return {
      decision: 'irrelevant',
      score: 0,
      confidence: 1,
      matchedSignals: [],
      fuzzyMatches: [],
      hardExclusionMatched: hardExclusion,
    };
  }

  let score = 0;
  const matchedSignals: string[] = [];
  const fuzzyMatches = findFuzzyMatches(title);

  for (const signal of POSITIVE_SIGNALS) {
    if (signal.pattern.test(text)) {
      score += signal.weight;
      matchedSignals.push(signal.pattern.source);
    }
  }

  for (const signal of NEGATIVE_SIGNALS) {
    if (signal.pattern.test(text)) {
      score -= signal.weight;
      matchedSignals.push(`negative:${signal.pattern.source}`);
    }
  }

  score = Math.max(0, Math.min(10, score));

  if (score >= FOOD_TRUCK_RELEVANCE_THRESHOLD) {
    const negativeOverlap = matchedSignals.filter((s) => s.startsWith('negative:')).length;
    const confidence = negativeOverlap > 0 ? 0.8 : 1;
    return {
      decision: 'relevant',
      score,
      confidence,
      matchedSignals,
      fuzzyMatches,
      hardExclusionMatched: null,
    };
  }

  if (score === 0) {
    const negativeCount = matchedSignals.filter((s) => s.startsWith('negative:')).length;
    const negativeConfidence = negativeCount >= 2 ? 1 : negativeCount >= 1 ? 0.9 : 0.7;
    return {
      decision: 'irrelevant',
      score,
      confidence: negativeConfidence,
      matchedSignals,
      fuzzyMatches,
      hardExclusionMatched: null,
    };
  }

  if (score < FOOD_TRUCK_RELEVANCE_THRESHOLD && score > 0) {
    return {
      decision: 'ambiguous',
      score,
      confidence: 0.4,
      matchedSignals,
      fuzzyMatches,
      hardExclusionMatched: null,
    };
  }

  throw new Error(`unreachable: score=${score} not covered by exhaustive branches`);
}
