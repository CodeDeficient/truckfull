import { notFound, permanentRedirect } from 'next/navigation';
import { parseCitySlug } from '@/lib/utils/slugify';
import {
  collectCuisineSlugs,
  getCachedCuisineTypes,
  shouldRedirectToCuisine,
} from '@/lib/seo/cuisineRedirect';

export const revalidate = 15_552_000;

interface BestPageProps {
  readonly params: Promise<{ slug: string }>;
}

export function generateStaticParams(): { slug: string }[] {
  return [];
}

async function findCuisineRedirect(slug: string): Promise<string | null> {
  try {
    return shouldRedirectToCuisine(slug, collectCuisineSlugs(await getCachedCuisineTypes()));
  } catch {
    return null;
  }
}

export default async function BestRedirectPage({ params }: BestPageProps): Promise<never> {
  const { slug } = await params;
  if (parseCitySlug(slug)) permanentRedirect(`/city/${slug}`);
  const cuisinePath = await findCuisineRedirect(slug);
  if (cuisinePath) permanentRedirect(cuisinePath);
  notFound();
}
