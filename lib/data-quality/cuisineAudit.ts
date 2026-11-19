import { MENU_ITEM_CUISINES } from '@/redirects/cuisine-redirects.mjs';

const REGEX_SPECIAL_CHARS = /[.*+?^${}()|[\]\\]/g;
const WEST_INDIAN = /west[\s-]+indian/gi;

export interface CuisineAuditInput {
  readonly id: string;
  readonly name: string;
  readonly city: string | null;
  readonly description: string | null;
  readonly cuisine_type: readonly string[] | null;
}

export interface CuisineAuditResult {
  readonly id: string;
  readonly name: string;
  readonly before: readonly string[];
  readonly after: readonly string[];
  readonly reasons: readonly string[];
  readonly needsReview: readonly string[];
}

const WEST_INDIAN_CUISINES = new Set([
  'caribbean',
  'jamaican',
  'trinidadian',
  'haitian',
  'bahamian',
  'west indian',
]);

const INDIAN_EVIDENCE_WORDS = [
  'india',
  'indian',
  'desi',
  'curry',
  'curries',
  'biryani',
  'masala',
  'naan',
  'samosa',
  'samosas',
  'tikka',
  'dosa',
  'dosas',
  'chaat',
  'paneer',
  'punjabi',
  'nizam',
  'kerala',
  'bombay',
  'mumbai',
  'delhi',
  'sri lanka',
  'sri lankan',
  'ceylon',
];

const INDIAN_EVIDENCE_PREFIXES = ['tandoor', 'hyderabad', 'nepal', 'pakistan', 'bangladesh'];

function escapeRegExp(value: string): string {
  return value.replaceAll(REGEX_SPECIAL_CHARS, String.raw`\$&`);
}

function containsWord(haystack: string, word: string): boolean {
  return new RegExp(String.raw`\b${escapeRegExp(word)}\b`, 'i').test(haystack);
}

function evidenceText(truck: CuisineAuditInput): string {
  let text = `${truck.name} ${truck.description ?? ''}`;
  if (truck.city) text = text.replaceAll(new RegExp(escapeRegExp(truck.city), 'gi'), ' ');
  return text.replaceAll(WEST_INDIAN, ' ');
}

function hasIndianEvidence(truck: CuisineAuditInput): boolean {
  const text = evidenceText(truck);
  return (
    INDIAN_EVIDENCE_WORDS.some((word) => containsWord(text, word)) ||
    INDIAN_EVIDENCE_PREFIXES.some((prefix) => new RegExp(String.raw`\b${prefix}`, 'i').test(text))
  );
}

function replaceMenuItems(cuisines: string[], reasons: string[]): string[] {
  return cuisines.map((cuisine) => {
    const replacement = (MENU_ITEM_CUISINES as Readonly<Record<string, string>>)[
      cuisine.toLowerCase()
    ];
    if (!replacement) return cuisine;
    reasons.push(`menu item "${cuisine}" is not a cuisine; use "${replacement}"`);
    return replacement;
  });
}

function dropWestIndianIndian(cuisines: string[], reasons: string[]): string[] {
  const isWestIndian = cuisines.some((cuisine) => WEST_INDIAN_CUISINES.has(cuisine.toLowerCase()));
  if (!isWestIndian || !cuisines.includes('Indian')) return cuisines;
  reasons.push('"Indian" next to Caribbean cuisine is a West Indian mislabel');
  return cuisines.filter((cuisine) => cuisine !== 'Indian');
}

function dropCityLeaks(cuisines: string[], truck: CuisineAuditInput, reasons: string[]): string[] {
  const city = truck.city;
  if (!city) return cuisines;
  const text = evidenceText(truck);
  return cuisines.filter((cuisine) => {
    if (!containsWord(city, cuisine)) return true;
    const supported = cuisine === 'Indian' ? hasIndianEvidence(truck) : containsWord(text, cuisine);
    if (supported) return true;
    reasons.push(`"${cuisine}" comes from the city name "${city}"`);
    return false;
  });
}

function dedupe(cuisines: readonly string[]): string[] {
  return [...new Set(cuisines)];
}

export function auditTruckCuisines(truck: CuisineAuditInput): CuisineAuditResult {
  const before = [...(truck.cuisine_type ?? [])];
  const reasons: string[] = [];
  let after = replaceMenuItems(before, reasons);
  after = dropWestIndianIndian(after, reasons);
  after = dropCityLeaks(after, truck, reasons);
  after = dedupe(after);

  const needsReview: string[] = [];
  if (after.includes('Indian') && !hasIndianEvidence(truck)) {
    needsReview.push('"Indian" has no support in the name or description');
  }

  return { id: truck.id, name: truck.name, before, after, reasons, needsReview };
}

export function cuisinesChanged(result: CuisineAuditResult): boolean {
  return (
    result.before.length !== result.after.length ||
    result.before.some((cuisine, index) => cuisine !== result.after[index])
  );
}
