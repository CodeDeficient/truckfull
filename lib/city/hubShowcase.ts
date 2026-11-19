export const HUB_SHOWCASE_SLUGS: readonly string[] = [
  ...new Set(
    (process.env.HUB_SHOWCASE_SLUGS ?? '')
      .split(',')
      .map((slug) => slug.trim())
      .filter(Boolean),
  ),
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
