import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const BUILD_ENV_FILE = '.container-build.env';
const EXPECTED_SUPABASE_ENV = 'EXPECTED_PRODUCTION_SUPABASE_URL';
const REQUIRED_PUBLIC_KEYS = [
  'NEXT_PUBLIC_APP_ENV',
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
];
const BILLING_PRICE_KEYS = [
  'NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY',
  'NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY',
  'NEXT_PUBLIC_STRIPE_PRICE_PRO_FOUNDING',
  'NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY_FOUNDING',
];
const FORBIDDEN_VALUE_PATTERN =
  /workers\.dev|localhost|127\.0\.0\.1|::1|\bstaging\b|\bpreview\b|\bdevelopment\b|\btest\b|ngrok|pk_test_|rk_test_|sk_test_|whsec_/i;

function isEmptyValue(value) {
  const normalized = normalizeValue(value);
  return normalized === '' || normalized === '""' || normalized === "''";
}

function normalizeValue(value) {
  const normalized = value.trim();
  const quote = normalized[0];
  if (quote !== '"' && quote !== "'") return normalized;
  if (normalized.length < 2 || normalized.at(-1) !== quote) {
    throw new Error('Malformed quoted environment value');
  }
  return normalized.slice(1, -1);
}

export function parseProductionBuildEnv(contents) {
  const entries = new Map();

  for (const [index, line] of contents.split(/\r?\n/).entries()) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;

    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line);
    if (!match) {
      throw new Error(`Malformed environment line ${index + 1}`);
    }

    const [, key, value] = match;
    if (entries.has(key)) {
      throw new Error(`Duplicate environment key: ${key}`);
    }
    if (!key.startsWith('NEXT_PUBLIC_') && key !== 'INDEXNOW_KEY') {
      throw new Error(`Non-public environment key: ${key}`);
    }

    entries.set(key, normalizeValue(value));
  }

  return entries;
}

function requireNonEmpty(entries, key) {
  const value = entries.get(key);
  if (value === undefined || isEmptyValue(value)) {
    throw new Error(`Missing required value: ${key}`);
  }
  return value;
}

function validateForbiddenValues(contents) {
  if (FORBIDDEN_VALUE_PATTERN.test(contents)) {
    throw new Error('Forbidden staging, local, preview, test, or workers.dev value');
  }
}

function validateBilling(entries) {
  if (entries.get('NEXT_PUBLIC_BILLING_ENABLED') !== 'true') return;

  const publishableKey = requireNonEmpty(entries, 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
  if (!publishableKey.startsWith('pk_live_')) {
    throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must be a live key');
  }

  for (const key of BILLING_PRICE_KEYS) {
    requireNonEmpty(entries, key);
  }
}

export function validateProductionBuildEnv(contents, expectedSupabaseUrl) {
  validateForbiddenValues(contents);

  const entries = parseProductionBuildEnv(contents);
  for (const key of REQUIRED_PUBLIC_KEYS) {
    requireNonEmpty(entries, key);
  }

  if (entries.get('NEXT_PUBLIC_APP_ENV') !== 'production') {
    throw new Error('NEXT_PUBLIC_APP_ENV must be production');
  }
  if (entries.get('NEXT_PUBLIC_APP_URL') !== 'https://www.truckfull.food') {
    throw new Error('NEXT_PUBLIC_APP_URL must be the production origin');
  }
  if (expectedSupabaseUrl === undefined || isEmptyValue(expectedSupabaseUrl)) {
    throw new Error(`Missing deployment environment value: ${EXPECTED_SUPABASE_ENV}`);
  }
  if (entries.get('NEXT_PUBLIC_SUPABASE_URL') !== expectedSupabaseUrl.trim()) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL does not match the expected production URL');
  }

  validateBilling(entries);
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
    validateProductionBuildEnv(contents, process.env[EXPECTED_SUPABASE_ENV]);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Production build validation failed';
    console.error(`[production-build-env] ${message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run();
}
