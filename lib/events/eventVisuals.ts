/**
 * Pure visual helpers for event landing pages.
 * No data access — these map known values to deterministic Tailwind classes.
 */

const GRADIENTS = [
  'from-orange-500 to-rose-500',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-fuchsia-600',
  'from-emerald-500 to-teal-600',
  'from-sky-500 to-indigo-600',
  'from-violet-500 to-purple-600',
  'from-yellow-500 to-orange-500',
  'from-red-500 to-rose-700',
] as const;

/** Deterministically pick a gradient for a truck card from its cuisine/name. */
export function gradientFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = Math.trunc(hash * 31 + (seed.codePointAt(i) ?? 0));
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

/** What-to-expect items paired with simple inline SVG icon keys. */
export interface ExpectationItem {
  readonly label: string;
  readonly icon: 'truck' | 'festival' | 'market' | 'bbq' | 'craft' | 'holiday' | 'beer' | 'community';
}

/** Detect "what to expect" facets from an event title, with icon keys. */
export function detectExpectations(title: string): ExpectationItem[] {
  const t = title.toLowerCase();
  const items: ExpectationItem[] = [];
  if (t.includes('food truck')) items.push({ label: 'Food trucks as a primary feature', icon: 'truck' });
  if (t.includes('festival') || t.includes('fest'))
    items.push({ label: 'Festival atmosphere with multiple vendors', icon: 'festival' });
  if (t.includes('market') || t.includes('bazaar'))
    items.push({ label: 'Market with vendor booths and food options', icon: 'market' });
  if (t.includes('bbq') || t.includes('barbecue') || t.includes('cookout'))
    items.push({ label: 'BBQ and food-focused community event', icon: 'bbq' });
  if (t.includes('craft')) items.push({ label: 'Craft vendors and handmade goods', icon: 'craft' });
  if (t.includes('christmas') || t.includes('holiday'))
    items.push({ label: 'Seasonal holiday celebration', icon: 'holiday' });
  if (t.includes('oktoberfest')) items.push({ label: 'German food and beer festival', icon: 'beer' });
  if (items.length === 0)
    items.push({ label: 'Community event with potential food truck participation', icon: 'community' });
  return items;
}