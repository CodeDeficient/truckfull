export const HUB_SHOWCASE_SLUGS: readonly string[] = [
  'kono-pizza-of-augusta',
  'californias-mexican-grill',
  'amaya-tacos',
  'dark-shark-taco-attack',
  'ice-cream-island',
  'sofrito-fusion-food-truck',
  'smokin-jays',
  'burgerbachi',
  'bessies-bites-and-sweet-delights',
  'nacho-business-food-truck',
  'mac-daddy',
  '876-nyamminz',
  'the-beefy-trio',
  'the-stop-food-truck',
  'just-loafn',
  'gigis-street-treats',
  'the-flame-district',
  'yumbai-food-truck',
  'cosmic-empanadas',
  'don-ques-southern-bbq',
  'belen-de-la-cruz-empanadas-pastries',
  'big-up-jerk-truck',
  'wrap-and-roll-kitchen',
  'snowie-atlanta-creations',
  'twisted-bowl',
  'pretty-little-tacos-roswell',
  'plant-based-pizzeria-mobile',
  'smashleys-food-truck',
  'tacos-las-brisas',
  'pubfare-burger',
  'juke-n-jive-creamery',
  'box-yo-daddy-bbq',
  'the-southern-peel',
  'outlaw-dogs-llc',
  'droolers-street-dogs',
  'bowtie-barbecue-co',
  'la-birria-loca',
  'the-atomic-dog',
  '95-wingz',
  'gorditas-locas',
  'crawdaddys-lowcountry-boil',
  'snack-shack',
  'farm-dogs-aiken',
  'baby-susies-chicken',
  'giant-baby-bottle',
  'eggroll-boyz',
  'jays-big-city-dogs',
  'marilyns-kitchen',
];

interface ShowcaseCandidate {
  readonly slug: string | null;
  readonly photo_url: string | null;
}

export function pickShowcasePhotos(
  catalog: readonly ShowcaseCandidate[],
  slugs: readonly string[] = HUB_SHOWCASE_SLUGS,
): string[] {
  const photoBySlug = new Map<string, string>();
  for (const row of catalog) {
    if (row.slug && row.photo_url) photoBySlug.set(row.slug, row.photo_url);
  }
  return slugs.flatMap((slug) => {
    const photo = photoBySlug.get(slug);
    return photo ? [photo] : [];
  });
}
