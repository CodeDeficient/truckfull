/** @jest-environment node */
import { afterAll, describe, expect, it } from '@jest/globals';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dir = mkdtempSync(path.join(tmpdir(), 'openaddresses-'));
const dbPath = path.join(dir, 'addresses.db');
const marker = path.join(dir, 'PWNED');
const originalCwd = process.cwd();

execFileSync('sqlite3', [
  dbPath,
  "CREATE TABLE addresses (number TEXT, street TEXT, state TEXT, lat REAL, lon REAL); INSERT INTO addresses VALUES ('100', 'MAIN ST', 'SC', 33.5, -81.9);",
]);
process.env.OPENADDRESSES_DB = dbPath;
process.chdir(dir);
const { queryOpenAddresses } = await import('@/lib/utils/geocoding/openAddresses');

afterAll(() => {
  process.chdir(originalCwd);
  rmSync(dir, { recursive: true, force: true });
});

describe('queryOpenAddresses', () => {
  it('finds an exact address match', () => {
    expect(queryOpenAddresses('100 Main St, Augusta, SC')).toEqual({
      lat: 33.5,
      lng: -81.9,
      source: 'openaddresses',
    });
  });

  it('returns null when no row matches', () => {
    expect(queryOpenAddresses('999 Nowhere Rd, Augusta, SC')).toBeNull();
  });

  it.each(['100 $(>PWNED) St, SC', '100 `>PWNED` St, SC'])(
    'never runs shell syntax from the address: %s',
    (address) => {
      expect(queryOpenAddresses(address)).toBeNull();
      expect(existsSync(marker)).toBe(false);
    },
  );

  it('treats quotes in the address as data', () => {
    expect(queryOpenAddresses(`100 Main" St'; DROP TABLE addresses; --, SC`)).toBeNull();
    expect(queryOpenAddresses('100 Main St, Augusta, SC')).not.toBeNull();
  });
});
