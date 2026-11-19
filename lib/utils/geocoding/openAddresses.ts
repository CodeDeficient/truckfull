import { execFileSync } from 'node:child_process';

const HOUSE_NUMBER_AND_STREET = /^(\d{1,7})\s+(.+)/;
const DASH_OR_SPACE_RUN = /[-\s]+/;

const DB_PATH = process.env.OPENADDRESSES_DB || '/tmp/openaddresses-sc-ga.db'; // eslint-disable-line sonarjs/publicly-writable-directories

export interface OpenAddressResult {
  lat: number;
  lng: number;
  source: 'openaddresses';
}

function query(statement: string): { lat: number; lon: number } | null {
  try {
    // eslint-disable-next-line sonarjs/no-os-command-from-path
    const result = execFileSync('sqlite3', [DB_PATH, statement], {
      encoding: 'utf8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    if (!result) return null;
    const parts = result.split('|');
    return { lat: Number.parseFloat(parts[0]), lon: Number.parseFloat(parts[1]) };
  } catch {
    return null;
  }
}

function escape(v: string): string {
  return v.replaceAll('\'', "''");
}

export function queryOpenAddresses(
  cleanedAddress: string,
): OpenAddressResult | null {
  const parts = cleanedAddress.split(',').map((p) => p.trim()).filter(Boolean);
  const addressPart = parts[0];
  if (!addressPart) return null;

  const numMatch = addressPart.match(HOUSE_NUMBER_AND_STREET);
  if (!numMatch) return null;

  const number = numMatch[1];
  const street = numMatch[2].toUpperCase();

  const lastPart = parts.at(-1) || '';
  const state = lastPart.length === 2 ? lastPart.toUpperCase() : '';

  const row = query(
    `SELECT lat, lon FROM addresses WHERE number = '${escape(number)}' AND street = '${escape(street)}' AND state = '${escape(state)}' LIMIT 1`,
  );
  if (row) return { lat: row.lat, lng: row.lon, source: 'openaddresses' };

  const streetFirstWord = street.split(DASH_OR_SPACE_RUN)[0];
  if (streetFirstWord && streetFirstWord !== street) {
    const row2 = query(
      `SELECT lat, lon FROM addresses WHERE number = '${escape(number)}' AND street LIKE '${escape(streetFirstWord)}%' AND state = '${escape(state)}' LIMIT 1`,
    );
    if (row2) return { lat: row2.lat, lng: row2.lon, source: 'openaddresses' };
  }

  return null;
}
