import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { generateFoodTruckJsonLd, jsonLdScriptContent } from '@/lib/seo/jsonLd';
import { buildTruckMetadata } from '@/lib/seo/truckMetadata';
import { getPublicTruckBySlug } from '@/lib/services/publicTruckPage';
import { fromFoodTruckRow } from '@/lib/mappers/domain';
import { buildTruckProfileView } from '@/lib/truck-profile/profileView';
import { getRelatedTrucks } from '@/lib/truck-profile/relatedTrucks';
import { resolveCuisineTheme } from '@/lib/truck-profile/theme';
import { buildTruckBreadcrumbs, truckBreadcrumbJsonLd } from '@/lib/truck-profile/breadcrumbs';
import { safeJsonLdStringify } from '@/lib/utils/jsonUtils';
import TruckProfileShell from '@/components/truck-profile/TruckProfileShell';

export const revalidate = 86_400;

interface TruckPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: TruckPageProps): Promise<Metadata> {
  const { slug } = await params;
  const row = await getPublicTruckBySlug(slug);

  if (!row) {
    notFound();
  }

  const socialMedia = (row.social_media ?? {}) as Record<string, unknown> | null;
  const photoUrlFromSocial = socialMedia?.photo_url;

  return buildTruckMetadata(
    {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      cuisine_type: row.cuisine_type,
      city: row.city,
      state: row.state,
      image_url: typeof photoUrlFromSocial === 'string' ? photoUrlFromSocial : null,
      social_media: socialMedia,
      is_active: row.is_active === true,
      has_menu: Array.isArray(row.menu) && row.menu.length > 0,
      has_hours: row.operating_hours != null,
    },
    slug,
  );
}

export function generateStaticParams(): { slug: string }[] {
  return [];
}

export default async function TruckPage({ params }: TruckPageProps) {
  const { slug } = await params;
  const row = await getPublicTruckBySlug(slug);
  if (!row) notFound();

  const truck = buildTruckProfileView(row);
  const origin = truck.lat !== null && truck.lng !== null ? { lat: truck.lat, lng: truck.lng } : null;
  const related = await getRelatedTrucks(origin, truck.cuisines, truck.id);
  const theme = resolveCuisineTheme(truck.cuisines);

  const domainTruck = fromFoodTruckRow(row);
  const canonicalUrl = `https://www.truckfull.food/${truck.slug}`;
  const jsonLd = generateFoodTruckJsonLd(domainTruck, canonicalUrl);
  const breadcrumbs = buildTruckBreadcrumbs(truck);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScriptContent(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(truckBreadcrumbJsonLd(breadcrumbs)) }}
      />
      <TruckProfileShell
        truck={truck}
        slug={truck.slug}
        theme={theme}
        related={related}
        breadcrumbs={breadcrumbs}
      />
    </>
  );
}
