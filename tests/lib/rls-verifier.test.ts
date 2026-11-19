import { RLSVerifier } from './rls-verifier';

// Load environment variables
require('dotenv').config({ path: '../../.env' });

describe('Comprehensive RLS Policy Verification', () => {
  let rlsVerifier: RLSVerifier;

  beforeAll(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
    const supabaseServiceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

    rlsVerifier = new RLSVerifier(supabaseUrl, supabaseServiceRoleKey);
  });

  test('Should verify all RLS policies exist and are configured correctly', async () => {
    const result = await rlsVerifier.runVerification();
    expect(result).toBe(true);
  });

  test('Should verify specific policy conditions are correct', async () => {
    const result = await rlsVerifier.verifySpecificPolicies();
    expect(result).toBe(true);
  });

  test('Should verify RLS is enabled on all expected tables', async () => {
    const tables = await rlsVerifier.getRLSEnabledTables();
    const expectedTables = [
      'profiles',
      'food_trucks',
      'user_favorites',
      'reviews',
      'orders',
      'scraping_jobs',
      'discovered_urls',
      'data_quality_logs',
      'api_usage_logs',
    ];

    expectedTables.forEach((table) => {
      expect(tables).toContain(table);
    });
  });

  test('Should verify all required policies exist', async () => {
    const result = await rlsVerifier.verifyAllPolicies();
    expect(result).toBe(true);
  });
});

// Additional manual verification tests
describe('Manual RLS Policy Checks', () => {
  test('List all policies for verification', async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
    const supabaseServiceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

    const verifier = new RLSVerifier(supabaseUrl, supabaseServiceRoleKey);
    const policies = await verifier.getAllPolicies();

    console.log('\n--- All RLS Policies ---');
    policies.forEach((policy) => {
      console.log(
        `Table: ${policy.tablename}, Policy: ${policy.policyname}, Operation: ${policy.cmd}`,
      );
    });
    console.log('--- End Policies ---\n');

    expect(Array.isArray(policies)).toBe(true);
  });
});
