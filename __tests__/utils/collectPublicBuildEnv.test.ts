import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCRIPT = path.resolve(__dirname, '../../scripts/container/collect-public-build-env.mjs');
const FIXTURE_ROOT = path.resolve(__dirname, '../../tmp/collect-public-build-env-tests');

const VALID_SOURCE = [
  'NEXT_PUBLIC_SUPABASE_URL=https://fixture.supabase.co',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY=anon-key-fixture',
  'NEXT_PUBLIC_APP_URL=https://www.truckfull.food',
  'NEXT_PUBLIC_APP_NAME="TruckFull #1"',
  'SUPABASE_SERVICE_ROLE_KEY=service-role-secret-fixture',
  'STRIPE_WEBHOOK_SECRET=whsec-fixture',
  '',
].join('\n');

function run(
  sourcePath: string,
  outputPath: string,
  extraArgs: string[] = [],
): { status: number; stdout: string; stderr: string } {
  try {
    const stdout = execFileSync('node', [SCRIPT, sourcePath, outputPath, ...extraArgs], {
      encoding: 'utf8',
    });
    return { status: 0, stdout, stderr: '' };
  } catch (error) {
    const err = error as { status?: number; stdout?: string; stderr?: string };
    return { status: err.status ?? 1, stdout: err.stdout ?? '', stderr: err.stderr ?? '' };
  }
}

function makeFixtureDir(): string {
  return mkdtempSync(FIXTURE_ROOT);
}

beforeAll(() => {
  mkdirSync(FIXTURE_ROOT, { recursive: true });
});

afterAll(() => {
  rmSync(FIXTURE_ROOT, { recursive: true, force: true });
});

describe('collect-public-build-env', () => {
  it('writes only public values and excludes private secrets', () => {
    const dir = makeFixtureDir();
    const source = path.join(dir, 'source.env');
    const output = path.join(dir, 'out', 'build.env');
    writeFileSync(source, VALID_SOURCE);

    const result = run(source, output);

    expect(result.status).toBe(0);
    const written = readFileSync(output, 'utf8');
    expect(written).toContain('NEXT_PUBLIC_SUPABASE_URL=https://fixture.supabase.co');
    expect(written).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY=anon-key-fixture');
    expect(written).toContain('NEXT_PUBLIC_APP_NAME="TruckFull #1"');
    expect(written).not.toContain('service-role-secret-fixture');
    expect(written).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(written).not.toContain('whsec-fixture');
  });

  it('creates a missing output directory', () => {
    const dir = makeFixtureDir();
    const source = path.join(dir, 'source.env');
    const output = path.join(dir, 'deep', 'nested', 'build.env');
    writeFileSync(source, VALID_SOURCE);

    const result = run(source, output);

    expect(result.status).toBe(0);
    expect(existsSync(output)).toBe(true);
  });

  it('fails when NEXT_PUBLIC_SUPABASE_URL is missing', () => {
    const dir = makeFixtureDir();
    const source = path.join(dir, 'source.env');
    const output = path.join(dir, 'build.env');
    writeFileSync(
      source,
      ['NEXT_PUBLIC_SUPABASE_ANON_KEY=anon-key-fixture', ''].join('\n'),
    );

    const result = run(source, output);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('NEXT_PUBLIC_SUPABASE_URL');
    expect(existsSync(output)).toBe(false);
  });

  it('fails when NEXT_PUBLIC_SUPABASE_ANON_KEY is empty', () => {
    const dir = makeFixtureDir();
    const source = path.join(dir, 'source.env');
    const output = path.join(dir, 'build.env');
    writeFileSync(
      source,
      [
        'NEXT_PUBLIC_SUPABASE_URL=https://fixture.supabase.co',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY=',
        '',
      ].join('\n'),
    );

    const result = run(source, output);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    expect(existsSync(output)).toBe(false);
  });

  it('fails when NEXT_PUBLIC_SUPABASE_ANON_KEY is quoted empty', () => {
    const dir = makeFixtureDir();
    const source = path.join(dir, 'source.env');
    const output = path.join(dir, 'build.env');
    writeFileSync(
      source,
      [
        'NEXT_PUBLIC_SUPABASE_URL=https://fixture.supabase.co',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY=""',
        '',
      ].join('\n'),
    );

    const result = run(source, output);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    expect(existsSync(output)).toBe(false);
  });

  it('fails when a required public value is quoted whitespace', () => {
    const dir = makeFixtureDir();
    const source = path.join(dir, 'source.env');
    const output = path.join(dir, 'build.env');
    writeFileSync(
      source,
      [
        'NEXT_PUBLIC_SUPABASE_URL="   "',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY=anon-key-fixture',
        '',
      ].join('\n'),
    );

    const result = run(source, output);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('NEXT_PUBLIC_SUPABASE_URL');
    expect(existsSync(output)).toBe(false);
  });

  it('fails when the source env file does not exist', () => {
    const dir = makeFixtureDir();
    const source = path.join(dir, 'does-not-exist.env');
    const output = path.join(dir, 'build.env');

    const result = run(source, output);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('no env file');
    expect(existsSync(output)).toBe(false);
  });

  it('does not write an output file when required values are missing', () => {
    const dir = makeFixtureDir();
    const source = path.join(dir, 'source.env');
    const output = path.join(dir, 'build.env');
    writeFileSync(source, 'NEXT_PUBLIC_APP_URL=https://www.truckfull.food\n');

    const result = run(source, output);

    expect(result.status).toBe(1);
    expect(existsSync(output)).toBe(false);
  });

  it('excludes variables matching an --exclude prefix', () => {
    const dir = makeFixtureDir();
    const source = path.join(dir, 'source.env');
    const output = path.join(dir, 'build.env');
    writeFileSync(
      source,
      [
        ...VALID_SOURCE.split('\n').filter(Boolean),
        'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk-live-fixture',
        'NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY=price-monthly-fixture',
        '',
      ].join('\n'),
    );

    const result = run(source, output, ['--exclude', 'NEXT_PUBLIC_STRIPE_']);

    expect(result.status).toBe(0);
    const written = readFileSync(output, 'utf8');
    expect(written).not.toContain('pk-live-fixture');
    expect(written).not.toContain('NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY');
    expect(written).toContain('NEXT_PUBLIC_SUPABASE_URL=https://fixture.supabase.co');
  });

  it('applies multiple comma-separated exclude prefixes', () => {
    const dir = makeFixtureDir();
    const source = path.join(dir, 'source.env');
    const output = path.join(dir, 'build.env');
    writeFileSync(
      source,
      [
        ...VALID_SOURCE.split('\n').filter(Boolean),
        'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk-live-fixture',
        'INDEXNOW_KEY=indexnow-fixture',
        '',
      ].join('\n'),
    );

    const result = run(source, output, ['--exclude', 'NEXT_PUBLIC_STRIPE_,INDEXNOW']);

    expect(result.status).toBe(0);
    const written = readFileSync(output, 'utf8');
    expect(written).not.toContain('pk-live-fixture');
    expect(written).not.toContain('indexnow-fixture');
  });

  it('fails when an exclude prefix matches no variables', () => {
    const dir = makeFixtureDir();
    const source = path.join(dir, 'source.env');
    const output = path.join(dir, 'build.env');
    writeFileSync(source, VALID_SOURCE);

    const result = run(source, output, ['--exclude', 'STRIPE_']);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('matched no variables');
    expect(existsSync(output)).toBe(false);
  });

  it('fails when --exclude is passed multiple times', () => {
    const dir = makeFixtureDir();
    const source = path.join(dir, 'source.env');
    const output = path.join(dir, 'build.env');
    writeFileSync(source, VALID_SOURCE);

    const result = run(source, output, ['--exclude', 'STRIPE_', '--exclude', 'INDEXNOW']);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('multiple times');
    expect(existsSync(output)).toBe(false);
  });

  it('applies --set overrides on top of source values', () => {
    const dir = makeFixtureDir();
    const source = path.join(dir, 'source.env');
    const output = path.join(dir, 'build.env');
    writeFileSync(source, VALID_SOURCE);

    const result = run(source, output, ['--set', 'NEXT_PUBLIC_APP_URL=https://container-staging.example']);

    expect(result.status).toBe(0);
    const written = readFileSync(output, 'utf8');
    expect(written).toContain('NEXT_PUBLIC_APP_URL=https://container-staging.example');
    expect(written).not.toContain('https://www.truckfull.food');
  });

  it('rejects --set overrides for private variables', () => {
    const dir = makeFixtureDir();
    const source = path.join(dir, 'source.env');
    const output = path.join(dir, 'build.env');
    writeFileSync(source, VALID_SOURCE);

    const result = run(source, output, ['--set', 'SUPABASE_SERVICE_ROLE_KEY=service-role-secret']);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('public build-time variable');
    expect(existsSync(output)).toBe(false);
  });

  it('fails when a --set entry has no value part', () => {
    const dir = makeFixtureDir();
    const source = path.join(dir, 'source.env');
    const output = path.join(dir, 'build.env');
    writeFileSync(source, VALID_SOURCE);

    const result = run(source, output, ['--set', 'NEXT_PUBLIC_APP_URL']);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('KEY=VALUE');
    expect(existsSync(output)).toBe(false);
  });

  it('fails when --set is present without a value', () => {
    const dir = makeFixtureDir();
    const source = path.join(dir, 'source.env');
    const output = path.join(dir, 'build.env');
    writeFileSync(source, VALID_SOURCE);

    const result = run(source, output, ['--set']);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('requires at least one KEY=VALUE entry');
    expect(existsSync(output)).toBe(false);
  });

  it('fails when --set resolves to no entries', () => {
    const dir = makeFixtureDir();
    const source = path.join(dir, 'source.env');
    const output = path.join(dir, 'build.env');
    writeFileSync(source, VALID_SOURCE);

    const result = run(source, output, ['--set', '']);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('resolved to no entries');
    expect(existsSync(output)).toBe(false);
  });

  it('fails when --exclude resolves to no prefixes', () => {
    const dir = makeFixtureDir();
    const source = path.join(dir, 'source.env');
    const output = path.join(dir, 'build.env');
    writeFileSync(source, VALID_SOURCE);

    const result = run(source, output, ['--exclude', '']);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('resolved to no prefixes');
    expect(existsSync(output)).toBe(false);
  });

  it('fails when a --set value contains a newline', () => {
    const dir = makeFixtureDir();
    const source = path.join(dir, 'source.env');
    const output = path.join(dir, 'build.env');
    writeFileSync(source, VALID_SOURCE);

    const result = run(source, output, ['--set', 'NEXT_PUBLIC_APP_URL=https://good\nSMUGGLED_KEY=smuggled']);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('must not contain newline');
    expect(existsSync(output)).toBe(false);
  });
});
