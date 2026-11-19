import { describe, expect, it } from '@jest/globals';
import { validateStagingBuildEnv } from '@/scripts/container/validate-staging-public-build-env.mjs';

const PROTOCOL = 'https://';
const SUFFIX = '.supabase.co';
const STAGING_REF = 'examplestagingref000';
const PRODUCTION_REF = 'exampleprodref000000';

const STAGING_URL = `NEXT_PUBLIC_SUPABASE_URL="${PROTOCOL}${STAGING_REF}${SUFFIX}"`;
const STAGING_ANON = 'NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiJ9.staging.token"';

function env(body) {
  return [STAGING_URL, STAGING_ANON, body].filter(Boolean).join('\n');
}

describe('validateStagingBuildEnv', () => {
  it('accepts a staging-only environment', () => {
    const entries = validateStagingBuildEnv(env('NEXT_PUBLIC_APP_ENV=staging'));
    expect(entries.get('NEXT_PUBLIC_SUPABASE_URL')).toContain(STAGING_REF);
  });

  it('accepts an environment with no APP_ENV set', () => {
    expect(() => validateStagingBuildEnv(env(''))).not.toThrow();
  });

  it('rejects the production Supabase project', () => {
    const contents = `NEXT_PUBLIC_SUPABASE_URL="${PROTOCOL}${PRODUCTION_REF}${SUFFIX}"\n${STAGING_ANON}`;
    expect(() => validateStagingBuildEnv(contents)).toThrow(/not the staging project/);
  });

  it('rejects a local or tunnel Supabase URL', () => {
    const contents = `NEXT_PUBLIC_SUPABASE_URL="http://localhost:54321"\n${STAGING_ANON}`;
    expect(() => validateStagingBuildEnv(contents)).toThrow();
  });

  it('rejects a non-staging APP_ENV', () => {
    expect(() => validateStagingBuildEnv(env('NEXT_PUBLIC_APP_ENV=production'))).toThrow(
      /must be staging/,
    );
  });

  it('rejects a missing anon key', () => {
    expect(() => validateStagingBuildEnv(`${STAGING_URL}\n`)).toThrow(/Missing required value/);
  });

  it('rejects a non-public key', () => {
    const contents = `${env('')}\nSUPABASE_SERVICE_ROLE_KEY=secret`;
    expect(() => validateStagingBuildEnv(contents)).toThrow(/Non-public environment key/);
  });
});
