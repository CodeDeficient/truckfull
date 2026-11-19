#!/usr/bin/env node
/**
 * Collects the build-time public environment for the container image.
 *
 * The Next.js build runs in Docker and needs NEXT_PUBLIC_* values because
 * they are inlined into the client bundle and used by generateStaticParams.
 * Private runtime secrets (service-role key, webhook secrets, provider API
 * keys) are NOT needed to build and must never reach BuildKit.
 *
 * This script reads the local env file and writes ONLY public values to the
 * output path, so the file mounted as a build secret cannot contain anything
 * sensitive unless the operator passes it explicitly via --set (operator-
 * supplied values are written verbatim, so keep secrets out of --set).
 * NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are
 * mandatory: without them the build would succeed with no database baked
 * into the client bundle and prerendered pages.
 *
 * Usage: node scripts/container/collect-public-build-env.mjs .env.local .container-build.env [--exclude PREFIX1,PREFIX2] [--set KEY=VALUE,...]
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const BUILD_TIME_PUBLIC = new Set(['INDEXNOW_KEY']);
const PUBLIC_PREFIX = 'NEXT_PUBLIC_';
const REQUIRED_PUBLIC = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'];

const argv = process.argv.slice(2);
const collectFlagIndices = (flagName) =>
  argv.reduce((indices, arg, index) => {
    if (arg === flagName) indices.push(index);
    return indices;
  }, []);
if (collectFlagIndices('--exclude').length > 1) {
  console.error('error: --exclude was given multiple times; pass one flag with a comma-separated list');
  process.exit(1);
}
if (collectFlagIndices('--set').length > 1) {
  console.error('error: --set was given multiple times; pass one flag with a comma-separated list');
  process.exit(1);
}
const excludeFlagIndex = collectFlagIndices('--exclude')[0] ?? -1;
const setFlagIndex = collectFlagIndices('--set')[0] ?? -1;
const excludedIndices = [];
if (excludeFlagIndex !== -1) {
  excludedIndices.push(excludeFlagIndex, excludeFlagIndex + 1);
}
if (setFlagIndex !== -1) {
  excludedIndices.push(setFlagIndex, setFlagIndex + 1);
}
const excludePrefixes = [];
if (excludeFlagIndex !== -1) {
  if (excludeFlagIndex + 1 >= argv.length) {
    console.error('error: --exclude requires a comma-separated prefix list');
    process.exit(1);
  }
  excludePrefixes.push(
    ...argv[excludeFlagIndex + 1]
      .split(',')
      .map((prefix) => prefix.trim())
      .filter(Boolean),
  );
  if (excludePrefixes.length === 0) {
    console.error('error: --exclude resolved to no prefixes; a no-op exclusion would silently keep everything');
    process.exit(1);
  }
}
const setOverrides = [];
if (setFlagIndex !== -1) {
  if (setFlagIndex + 1 >= argv.length) {
    console.error('error: --set requires at least one KEY=VALUE entry');
    process.exit(1);
  }
  setOverrides.push(
    ...argv[setFlagIndex + 1]
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean),
  );
  if (setOverrides.length === 0) {
    console.error('error: --set resolved to no entries; a no-op override would silently keep the source value');
    process.exit(1);
  }
}
const positionalArgs = argv.filter((arg, index) => !excludedIndices.includes(index));
const [sourcePath, outputPath] = positionalArgs;

if (!sourcePath || !outputPath) {
  console.error(
    'usage: collect-public-build-env.mjs <source> <output> [--exclude PREFIX1,PREFIX2] [--set KEY=VALUE1,KEY=VALUE2]',
  );
  process.exit(1);
}
for (const override of setOverrides) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*=/.test(override)) {
    console.error(`error: --set expects KEY=VALUE pairs, got: ${override}`);
    process.exit(1);
  }
  const separator = override.indexOf('=');
  const key = override.slice(0, separator);
  if (!key.startsWith(PUBLIC_PREFIX) && !BUILD_TIME_PUBLIC.has(key)) {
    console.error(`error: --set only accepts public build-time variables, got: ${key}`);
    process.exit(1);
  }
  const value = override.slice(separator + 1);
  if (/[\r\n]/.test(value)) {
    console.error('error: --set values must not contain newline characters');
    process.exit(1);
  }
}

export function parseEnv(contents) {
  const entries = new Map();
  for (const rawLine of contents.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    entries.set(key, line.slice(separator + 1).trim());
  }
  return entries;
}

export function collectPublicEntries(contents, excludePrefixes = []) {
  const entries = parseEnv(contents);
  const publicCandidates = [...entries].filter(
    ([key]) => key.startsWith(PUBLIC_PREFIX) || BUILD_TIME_PUBLIC.has(key),
  );
  const prefixMatches = new Map(excludePrefixes.map((prefix) => [prefix, 0]));
  const publicEntries = publicCandidates.filter(([key]) => {
    const matched = excludePrefixes.find((prefix) => key.startsWith(prefix));
    if (matched !== undefined) {
      prefixMatches.set(matched, (prefixMatches.get(matched) ?? 0) + 1);
      return false;
    }
    return true;
  });
  return {
    publicEntries,
    excludedCount: entries.size - publicCandidates.length,
    prefixMatchCounts: prefixMatches,
  };
}

export function applySetOverrides(publicEntries, setOverrides) {
  const entries = new Map(publicEntries);
  for (const override of setOverrides) {
    const separator = override.indexOf('=');
    entries.set(override.slice(0, separator), override.slice(separator + 1));
  }
  return [...entries];
}

export function renderEnvFile(publicEntries) {
  const output = publicEntries.map(([key, value]) => `${key}=${value}`).join('\n');
  return output ? `${output}\n` : '';
}

let source = '';
try {
  source = readFileSync(sourcePath, 'utf8');
} catch {
  console.error(`[container] no env file at ${sourcePath}`);
}

const { publicEntries, excludedCount, prefixMatchCounts } = collectPublicEntries(source, excludePrefixes);
const overriddenEntries = applySetOverrides(publicEntries, setOverrides);
const overriddenMap = new Map(overriddenEntries);
const missing = REQUIRED_PUBLIC.filter((key) => {
  const value = overriddenMap.get(key);
  const normalized = value?.trim();
  if (normalized === undefined || normalized === '') return true;
  const isDoubleQuoted = normalized.startsWith('"') && normalized.endsWith('"');
  const isSingleQuoted = normalized.startsWith("'") && normalized.endsWith("'");
  return (isDoubleQuoted || isSingleQuoted) && normalized.slice(1, -1).trim() === '';
});

const unmatchedPrefixes = [...prefixMatchCounts].filter(([, count]) => count === 0).map(([prefix]) => prefix);
if (unmatchedPrefixes.length > 0) {
  console.error(
    `[container] --exclude prefix(es) matched no variables: ${unmatchedPrefixes.join(', ')}. ` +
      'Failing the build: a no-op exclusion would silently keep the variables it was meant to drop.',
  );
  process.exit(1);
}

if (missing.length > 0) {
  console.error(
    `[container] missing required public build-time variable(s): ${missing.join(', ')}. ` +
      'Failing the build: without them the client bundle and prerendered pages would have no database.',
  );
  process.exit(1);
}

mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, renderEnvFile(overriddenEntries));

console.info(
  `[container] wrote ${overriddenEntries.length} public build-time variable(s); ` +
    `excluded ${excludedCount} non-public value(s)` +
    (excludePrefixes.length > 0
      ? `; exclude prefixes matched: ${[...prefixMatchCounts].map(([prefix, count]) => `${prefix}=${count}`).join(', ')}`
      : '') +
    (setOverrides.length > 0 ? `; set overrides applied: ${setOverrides.map((entry) => entry.split('=')[0]).join(', ')}` : ''),
);
