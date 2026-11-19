export const TRUCKFULL_DEFAULT_LOGO = '/truckfull-fallback-512.webp';
export const TRUCK_FALLBACK_IMAGE = '/truckfull-fallback-512.webp';

// Pass-through: Supabase /render/image/public/ requires dashboard config disabled
// on production. next/image handles all optimization via /_next/image CDN instead.
export function transformPhotoUrl(
  url: string | null | undefined,
  _width = 80,
): string | undefined {
  if (!url) return undefined;
  return url;
}

export function getTruckProfileImage(
  truck:
    | {
        social_media?: { photo_url?: string | null } | null;
      }
    | null
    | undefined,
): string {
  const url = truck?.social_media?.photo_url;
  if (!url) return TRUCKFULL_DEFAULT_LOGO;
  return transformPhotoUrl(url) ?? TRUCKFULL_DEFAULT_LOGO;
}

export function getTruckProfileImageFromUrl(url?: string | null): string {
  if (!url) return TRUCKFULL_DEFAULT_LOGO;
  return transformPhotoUrl(url) ?? TRUCKFULL_DEFAULT_LOGO;
}
