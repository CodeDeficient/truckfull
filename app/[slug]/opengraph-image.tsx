import { ImageResponse } from 'next/og';
import { buildOgStyles } from '@/lib/og/styles';
import { isAllowedTruckSlug } from '@/lib/utils/slugify';
import { getPublicTruckBySlug } from '@/lib/services/publicTruckPage';

export const alt = 'TruckFull Food Truck';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export async function generateImageMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<{ id: string; alt: string }[]> {
  if (!process.env.VERCEL) return [];
  try {
    const { slug } = await params;
    if (!slug || typeof slug !== 'string') return [];
    if (!isAllowedTruckSlug(slug)) return [];

    const truck = await getPublicTruckBySlug(slug);

    if (!truck || !truck.slug) return [];

    return [{ id: truck.slug, alt: `${truck.name} on TruckFull` }];
  } catch (error) {
    console.error('[og] generateImageMetadata error:', error);
    return [];
  }
}

function renderFallbackImage(): ImageResponse {
  const s = buildOgStyles();
  return new ImageResponse(
    (
      <div style={s.container}>
        <div style={s.headerRow}>
          <span style={s.brandText}>TruckFull</span>
        </div>
        <div style={s.body}>
          <h1 style={s.title}>Food Truck</h1>
          <p style={s.location}>Find food trucks near you</p>
        </div>
        <div style={s.footer}>
          <span style={s.footerSubtitle}>truckfull.food</span>
        </div>
      </div>
    ),
    { ...size },
  );
}

export default async function Image({
  params,
  id,
}: {
  params: Promise<{ slug: string }>;
  id: Promise<string | number>;
}): Promise<ImageResponse> {
  try {
    const { slug: routeSlug } = await params;
    if (!isAllowedTruckSlug(routeSlug)) return renderFallbackImage();

    const slug = String(await id);
    if (!isAllowedTruckSlug(slug)) return renderFallbackImage();

    const truck = await getPublicTruckBySlug(slug);

    if (!truck) return renderFallbackImage();

    const name = truck?.name ?? 'Food Truck';
    const location = [truck?.city, truck?.state].filter(Boolean).join(', ') ?? '';
    const cuisines = Array.isArray(truck?.cuisine_type) ? truck.cuisine_type : [];

    const iconUrl = new URL('/tf-icon-80.webp', 'https://www.truckfull.food');
    const s = buildOgStyles();

    return new ImageResponse(
      (
        <div style={s.container}>
          <div style={s.glowCircle} />

          <div style={s.headerRow}>
            <img
              src={iconUrl.toString()}
              width={48}
              height={48}
              alt="TruckFull"
              style={s.iconWrapper}
            />
            <span style={s.brandText}>TruckFull</span>
          </div>

          <div style={s.body}>
            <div style={s.accentBar} />
            <h1 style={s.title}>{name}</h1>

            {location && <p style={s.location}>{location}</p>}

            {cuisines.length > 0 && (
              <div style={s.cuisineTagRow}>
                {cuisines.slice(0, 4).map((cuisine) => (
                  <span key={cuisine} style={s.cuisineTag}>
                    {cuisine}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div style={s.footer}>
            <span style={s.footerSubtitle}>Find food trucks near you</span>
            <span style={s.footerBrand}>truckfull.food</span>
          </div>
        </div>
      ),
      { ...size },
    );
  } catch {
    return renderFallbackImage();
  }
}
