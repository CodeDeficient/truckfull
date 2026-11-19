import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const BUILD_ENV_FILE = '.container-build-staging.env';
const STAGING_SUPABASE_REF = 'examplestagingref000';
const PRODUCTION_SUPABASE_REF = 'exampleprodref000000';
const REQUIRED_PUBLIC_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
];

function normalizeValue(value) {
  const normalized = value.trim();
  const quote = normalized[0];
  if (quote !== '"' && quote !== "'") return normalized;
  if (normalized.length < 2 || normalized.at(-1) !== quote) {
    throw new Error('Malformed quoted environment value');
  }
  return normalized.slice(1, -1);
}

export function parseStagingBuildEnv(contents) {
  const entries = new Map();

  for (const [index, line] of contents.split(/\r?\n/).entries()) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;

    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line);
    if (!match) {
      throw new Error(`Malformed environment line ${index + 1}`);
    }

    const [, key, value] = match;
    if (!key.startsWith('NEXT_PUBLIC_') && key !== 'INDEXNOW_KEY') {
      throw new Error(`Non-public environment key: ${key}`);
    }

    entries.set(key, normalizeValue(value));
  }

  return entries;
}

export function validateStagingBuildEnv(contents) {
  const entries = parseStagingBuildEnv(contents);

  for (const key of REQUIRED_PUBLIC_KEYS) {
    const value = entries.get(key);
    if (value === undefined || value === '') {
      throw new Error(`Missing required value: ${key}`);
    }
  }

  const supabaseUrl = entries.get('NEXT_PUBLIC_SUPABASE_URL');
  if (!supabaseUrl.includes(STAGING_SUPABASE_REF)) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not the staging project');
  }
  if (supabaseUrl.includes(PRODUCTION_SUPABASE_REF)) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL points at the production project');
  }
  if (/workers\.dev|localhost|127\.0\.0\.1|::1|ngrok/i.test(supabaseUrl)) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is a local or tunnel URL');
  }

  const appEnv = entries.get('NEXT_PUBLIC_APP_ENV');
  if (appEnv !== undefined && appEnv !== '' && appEnv !== 'staging') {
    throw new Error('NEXT_PUBLIC_APP_ENV must be staging');
  }

  return entries;
}

function run() {
  let contents;
  try {
    contents = readFileSync(BUILD_ENV_FILE, 'utf8');
  } catch {
    console.error(`Unable to read ${BUILD_ENV_FILE}`);
    process.exitCode = 1;
    return;
  }

  try {
    validateStagingBuildEnv(contents);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Staging build validation failed';
    console.error(`[staging-build-env] ${message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run();
}
