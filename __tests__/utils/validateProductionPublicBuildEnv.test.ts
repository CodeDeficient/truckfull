import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCRIPT = path.resolve(__dirname, '../../scripts/container/validate-production-public-build-env.mjs');
const FIXTURE_ROOT = path.resolve(__dirname, '../../tmp/validate-production-public-build-env-tests');
const EXPECTED_SUPABASE_URL = 'https://production-fixture.supabase.co';

const VALID_FIXTURE = [
  'NEXT_PUBLIC_APP_ENV=production',
  'NEXT_PUBLIC_APP_URL=https://www.truckfull.food',
  `NEXT_PUBLIC_SUPABASE_URL=${EXPECTED_SUPABASE_URL}`,
  'NEXT_PUBLIC_SUPABASE_ANON_KEY=anon-key-fixture',
  'INDEXNOW_KEY=indexnow-fixture',
].join('\n');

interface CommandFailure {
  status?: number;
  stdout?: string | Buffer;
  stderr?: string | Buffer;
}

interface CommandResult {
  status: number;
  stdout: string;
  stderr: string;
}

function asText(value: string | Buffer | undefined): string {
  return value === undefined ? '' : value.toString();
}

function runValidator(contents: string, expectedSupabaseUrl?: string): CommandResult {
  const fixtureDir = mkdtempSync(FIXTURE_ROOT);
  writeFileSync(path.join(fixtureDir, '.container-build.env'), contents);

  const environment = { ...process.env };
  if (expectedSupabaseUrl === undefined) {
    delete environment.EXPECTED_PRODUCTION_SUPABASE_URL;
  } else {
    environment.EXPECTED_PRODUCTION_SUPABASE_URL = expectedSupabaseUrl;
  }

  try {
    const stdout = execFileSync('node', [SCRIPT], {
      cwd: fixtureDir,
      encoding: 'utf8',
      env: environment,
    });
    return { status: 0, stdout, stderr: '' };
  } catch (error) {
    const failure = error as CommandFailure;
    return {
      status: failure.status ?? 1,
      stdout: asText(failure.stdout),
      stderr: asText(failure.stderr),
    };
  } finally {
    rmSync(fixtureDir, { recursive: true, force: true });
  }
}

beforeAll(() => {
  mkdirSync(FIXTURE_ROOT, { recursive: true });
});

afterAll(() => {
  rmSync(FIXTURE_ROOT, { recursive: true, force: true });
});

describe('validate-production-public-build-env', () => {
  it('accepts a valid production public build fixture', () => {
    const result = runValidator(VALID_FIXTURE, EXPECTED_SUPABASE_URL);

    expect(result.status).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('');
  });

  it('accepts balanced quotes preserved by the public env collector', () => {
    const result = runValidator(
      VALID_FIXTURE.split('\n')
        .map((line) => {
          const separator = line.indexOf('=');
          return separator === -1
            ? line
            : `${line.slice(0, separator)}="${line.slice(separator + 1)}"`;
        })
        .join('\n'),
      EXPECTED_SUPABASE_URL,
    );

    expect(result.status).toBe(0);
  });

  it('requires the explicit production marker', () => {
    const result = runValidator(
      VALID_FIXTURE.replace('NEXT_PUBLIC_APP_ENV=production\n', ''),
      EXPECTED_SUPABASE_URL,
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('NEXT_PUBLIC_APP_ENV');
  });

  it('requires the production application origin', () => {
    const result = runValidator(
      VALID_FIXTURE.replace('https://www.truckfull.food', 'https://truckfull.food'),
      EXPECTED_SUPABASE_URL,
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('NEXT_PUBLIC_APP_URL');
  });

  it('requires EXPECTED_PRODUCTION_SUPABASE_URL', () => {
    const result = runValidator(VALID_FIXTURE);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('EXPECTED_PRODUCTION_SUPABASE_URL');
  });

  it('requires the build Supabase URL to match the expected production URL', () => {
    const result = runValidator(VALID_FIXTURE, 'https://different-fixture.supabase.co');

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('NEXT_PUBLIC_SUPABASE_URL');
  });

  it.each([
    ['staging', 'NEXT_PUBLIC_SUPABASE_URL=https://staging-fixture.supabase.co'],
    ['localhost', 'NEXT_PUBLIC_API_URL=http://localhost:3000'],
    ['workers.dev', 'NEXT_PUBLIC_APP_URL=https://example-app.workers.dev'],
  ])('rejects %s values in the public build file', (_label, line) => {
    const result = runValidator(`${VALID_FIXTURE}\n${line}`, EXPECTED_SUPABASE_URL);

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/forbidden/i);
  });

  it('rejects test Stripe publishable keys', () => {
    const result = runValidator(
      `${VALID_FIXTURE}\nNEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_fixture`,
      EXPECTED_SUPABASE_URL,
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/forbidden/i);
  });

  it('requires live Stripe inputs when billing is enabled', () => {
    const result = runValidator(
      `${VALID_FIXTURE}\nNEXT_PUBLIC_BILLING_ENABLED=true`,
      EXPECTED_SUPABASE_URL,
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
  });

  it('requires all production PRO price inputs when billing is enabled', () => {
    const result = runValidator(
      [
        VALID_FIXTURE,
        'NEXT_PUBLIC_BILLING_ENABLED=true',
        'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_fixture',
        'NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY=price-monthly-fixture',
        'NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY=price-yearly-fixture',
        'NEXT_PUBLIC_STRIPE_PRICE_PRO_FOUNDING=price-founding-fixture',
      ].join('\n'),
      EXPECTED_SUPABASE_URL,
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY_FOUNDING');
  });

  it.each([
    ['duplicate keys', 'NEXT_PUBLIC_APP_ENV=production'],
    ['malformed lines', 'not a valid env line'],
  ])('rejects %s', (_label, invalidLine) => {
    const result = runValidator(`${VALID_FIXTURE}\n${invalidLine}`, EXPECTED_SUPABASE_URL);

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/duplicate|malformed/i);
  });

  it('does not print rejected public values', () => {
    const rejectedValue = 'pk_test_synthetic_private_fixture_value';
    const result = runValidator(
      `${VALID_FIXTURE}\nNEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${rejectedValue}`,
      EXPECTED_SUPABASE_URL,
    );

    expect(result.status).toBe(1);
    expect(result.stderr).not.toContain(rejectedValue);
    expect(result.stdout).not.toContain(rejectedValue);
  });
});
