#!/usr/bin/env node
/**
 * Builds the production container image locally, faithfully reproducing what
 * `wrangler deploy --config wrangler.container-production.jsonc` builds.
 *
 * Why this exists: `npm run build` compiles against `.env.local` (local values)
 * and does not set NEXT_OUTPUT_STANDALONE, so it can pass while the production
 * image is broken. This runs the real Docker build against
 * `.container-build.env`, which is the only pre-deploy check that catches
 * production-only build failures.
 *
 * The expected production Supabase URL is read from the tracked Wrangler config
 * (the authoritative production source), NOT from `.container-build.env`. If it
 * were read from the build env file, the validator's "must match the expected
 * production URL" check would compare a value against itself and never fail —
 * a staging URL copied into `.container-build.env` would pass silently.
 *
 * Usage: npm run build:container
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const productionConfigPath = path.join(repoRoot, 'wrangler.container-production.jsonc');
const imageTag = 'truckfull-container-production:local';

/**
 * Extract the authoritative production Supabase URL from the tracked config.
 * Both line and block comments are stripped first, so a value mentioned inside
 * a comment cannot shadow the real one.
 */
export function readAuthoritativeSupabaseUrl(configContents) {
  const code = configContents
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n');

  const match = /"NEXT_PUBLIC_SUPABASE_URL"\s*:\s*"([^"]+)"/.exec(code);
  if (!match) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL not found in wrangler.container-production.jsonc');
  }
  return match[1];
}

function main() {
  const expectedSupabaseUrl = readAuthoritativeSupabaseUrl(
    readFileSync(productionConfigPath, 'utf8'),
  );

  execFileSync('node', [path.join(repoRoot, 'scripts/container/validate-production-public-build-env.mjs')], {
    cwd: repoRoot,
    stdio: 'inherit',
    env: { ...process.env, EXPECTED_PRODUCTION_SUPABASE_URL: expectedSupabaseUrl },
  });

  execFileSync('docker', ['build', '-f', 'Dockerfile.container', '-t', imageTag, '.'], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(`[build:container] ${error instanceof Error ? error.message : 'build failed'}`);
    process.exitCode = 1;
  }
}
