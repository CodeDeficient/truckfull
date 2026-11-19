import { logError } from '@/lib/logging';

const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

export const INDEXNOW_KEY = process.env.INDEXNOW_KEY ?? '';
const SITE_HOST = 'www.truckfull.food';

/** Delay between individual URL submissions to avoid "batch mode" flag from Bing. */
const STREAM_DELAY_MS = 200;

export function filterIndexNowUrls(urls: string[]): string[] {
  return urls.filter((url) => {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname;
      const bareHost = SITE_HOST.replace('www.', '');
      if (host === bareHost || host === SITE_HOST) return true;
      const suffix = `.${bareHost}`;
      if (host.endsWith(suffix)) {
        const subdomain = host.slice(0, -suffix.length);
        return subdomain.length > 0 && !subdomain.includes('.');
      }
      return false;
    } catch {
      return false;
    }
  });
}

export function buildIndexNowBody(url: string): string {
  return JSON.stringify({ host: SITE_HOST, key: INDEXNOW_KEY, urlList: [url] });
}

/**
 * Submit URLs in streaming mode (1 per POST with delay between each).
 *
 * Bing explicitly warns against batch mode (200 URLs per POST) because it
 * causes server overload and indexing delays. Streaming submits each URL
 * individually so Bing sees them as immediate, incremental updates.
 */
export async function pingIndexNow(urls: string[]): Promise<void> {
  const validUrls = filterIndexNowUrls(urls);
  if (validUrls.length === 0) return;

  for (const url of validUrls) {
    try {
      const response = await fetch(INDEXNOW_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: buildIndexNowBody(url),
      });

      if (!response.ok) {
        logError('IndexNow ping failed', {
          status: response.status,
          statusText: response.statusText,
          url,
        });
      }
    } catch (error) {
      logError('IndexNow ping error', { error, url });
    }

    // Small delay between individual submissions to prevent server overload
    if (validUrls.length > 1) {
      await new Promise((resolve) => setTimeout(resolve, STREAM_DELAY_MS));
    }
  }
}

export function buildTruckUrl(slug: string): string {
  return `https://${SITE_HOST}/${slug}`;
}

export function buildBlogUrl(slug: string): string {
  return `https://${SITE_HOST}/blog/${slug}`;
}

export function buildCityUrl(citySlug: string): string {
  return `https://${SITE_HOST}/city/${citySlug}`;
}

export function buildCuisineUrl(cuisineSlug: string): string {
  return `https://${SITE_HOST}/cuisine/${cuisineSlug}`;
}
