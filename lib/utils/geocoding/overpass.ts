import { logError } from '@/lib/logging';

const INTERSECTION_SEPARATOR = /(?:&|and)/;
const CITY_STATE_SUFFIX = /,\s*([A-Za-z]+(?:\s+[A-Za-z]+)?),\s*([A-Z]{2})/;
const INTERSECTION_ADDRESS = new RegExp(
  `^(.+?)\\s+${INTERSECTION_SEPARATOR.source}\\s+(.+?)(?:${CITY_STATE_SUFFIX.source})?$`,
  'i',
);

const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';
const TIMEOUT_SECONDS = 10;

interface OverpassNode {
  type: 'node';
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassNode[];
}

export function parseIntersectionStreets(
  address: string,
): { street1: string; street2: string; city: string; state: string } | null {
  if (!address) return null;

  const match = address.match(INTERSECTION_ADDRESS);

  if (!match) return null;

  const street1 = match[1]?.trim() ?? '';
  const street2 = match[2]?.trim() ?? '';
  const city = match[3]?.trim() ?? '';
  const state = match[4]?.trim() ?? '';

  if (!street1 || !street2) return null;

  return { street1, street2, city, state };
}

export function buildQuery(street1: string, street2: string, area: string): string {
  return [
    `[out:json][timeout:${TIMEOUT_SECONDS}];`,
    `area[name="${area}"]->.city;`,
    `way[highway][name="${street1}"](area.city)->.w1;`,
    `way[highway][name="${street2}"](area.city)->.w2;`,
    `node(w.w1)(w.w2);`,
    `out;`,
  ].join('\n');
}

export async function geocodeIntersection(
  street1: string,
  street2: string,
  area: string,
): Promise<{ lat: number; lng: number; success: boolean }> {
  if (!street1?.trim() || !street2?.trim()) {
    return { lat: Number.NaN, lng: Number.NaN, success: false };
  }

  try {
    const query = buildQuery(street1.trim(), street2.trim(), area.trim());
    const url = `${OVERPASS_API_URL}?data=${encodeURIComponent(query)}`;

    const response = await fetch(url);

    if (!response.ok) {
      logError('Overpass API error', { status: response.status });
      return { lat: Number.NaN, lng: Number.NaN, success: false };
    }

    const data = (await response.json()) as OverpassResponse;

    const nodes = (data.elements ?? []).filter((e) => e.type === 'node');

    if (nodes.length === 0) {
      return { lat: Number.NaN, lng: Number.NaN, success: false };
    }

    const avgLat = nodes.reduce((sum, n) => sum + n.lat, 0) / nodes.length;
    const avgLng = nodes.reduce((sum, n) => sum + n.lon, 0) / nodes.length;

    return { lat: avgLat, lng: avgLng, success: true };
  } catch (error) {
    logError('Overpass geocoding error', { error });
    return { lat: Number.NaN, lng: Number.NaN, success: false };
  }
}
