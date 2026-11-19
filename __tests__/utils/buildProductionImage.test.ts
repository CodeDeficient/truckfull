import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.resolve(TEST_DIR, '../../scripts/container/build-production-image.mjs');

const FIXTURE_URL = 'https://fixture-project.supabase.co';
const DECOY_URL = 'https://decoy-project.supabase.co';

function extract(config: string): string {
  const program = [
    `import(${JSON.stringify(SCRIPT)}).then((m) => {`,
    '  process.stdout.write(m.readAuthoritativeSupabaseUrl(process.argv[1]));',
    '});',
  ].join('\n');

  return execFileSync('node', ['--input-type=module', '-e', program, config], {
    encoding: 'utf8',
  });
}

describe('build-production-image', () => {
  it('extracts the Supabase URL from the config', () => {
    const config = [
      '{',
      `  // comment mentioning "NEXT_PUBLIC_SUPABASE_URL": "${DECOY_URL}"`,
      '  "vars": {',
      `    "NEXT_PUBLIC_SUPABASE_URL": "${FIXTURE_URL}",`,
      '  },',
      '}',
    ].join('\n');

    expect(extract(config)).toBe(FIXTURE_URL);
  });

  it('ignores a URL mentioned in a block comment', () => {
    const config = [
      '{',
      `  /* "NEXT_PUBLIC_SUPABASE_URL": "${DECOY_URL}" */`,
      `  "NEXT_PUBLIC_SUPABASE_URL": "${FIXTURE_URL}"`,
      '}',
    ].join('\n');

    expect(extract(config)).toBe(FIXTURE_URL);
  });

  it('throws when the config has no Supabase URL', () => {
    expect(() => extract('{ "vars": {} }')).toThrow();
  });
});
