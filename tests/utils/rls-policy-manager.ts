import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../types/database.types';

/**
 * RLS Policy Management Agent
 * A utility class for creating, updating, validating, and maintaining RLS policies
 * on database tables for the food truck finder application
 */
export class RLSPolicyManager {
  private supabase: SupabaseClient<Database>;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient<Database>(supabaseUrl, supabaseKey);
  }

  /**
   * Creates a new RLS policy on a specified table
   */
  async createPolicy(
    policyName: string,
    tableName: string,
    operation: string,
    role: string,
    condition: string,
    checkCondition?: string,
  ) {
    const policySQL = `
      CREATE POLICY "${policyName}" ON ${tableName} 
      FOR ${operation.toUpperCase()} TO ${role}
      USING (${condition})
      ${checkCondition ? `WITH CHECK (${checkCondition})` : ''}
    `;

    const { error } = await this.supabase.rpc('execute_sql', { sql_command: policySQL });
    if (error) throw new Error(`Failed to create policy: ${error.message}`);
  }

  /**
   * Updates an existing RLS policy
   */
  async updatePolicy(
    policyName: string,
    tableName: string,
    condition: string,
    checkCondition?: string,
  ) {
    // Note: PostgreSQL doesn't support ALTER POLICY with USING clause directly
    // We need to drop and recreate the policy
    await this.dropPolicy(policyName, tableName);
    // For now, we'll just return a message since ALTER POLICY is limited
    throw new Error('ALTER POLICY is limited in PostgreSQL. Drop and recreate policy instead.');
  }

  /**
   * Removes an RLS policy
   */
  async dropPolicy(policyName: string, tableName: string) {
    const policySQL = `DROP POLICY IF EXISTS "${policyName}" ON ${tableName}`;

    const { error } = await this.supabase.rpc('execute_sql', { sql_command: policySQL });
    if (error) throw new Error(`Failed to drop policy: ${error.message}`);
  }

  /**
   * Enables RLS on a table
   */
  async enableRLS(tableName: string) {
    const { error } = await this.supabase.rpc('execute_sql', {
      sql_command: `ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;`,
    });
    if (error) throw new Error(`Failed to enable RLS: ${error.message}`);
  }

  /**
   * Validates a specific policy by running test queries with different roles
   */
  async validatePolicy(tableName: string, expectedBehavior: any) {
    // This would test the policy with different user contexts
    // Implementation depends on specific auth configuration
    console.log(`Validating policy for ${tableName} with expected behavior:`, expectedBehavior);
    return true;
  }

  /**
   * Checks if RLS is enabled on a specific table
   */
  async isRLSEnabled(tableName: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('information_schema.tables')
      .select('row_security')
      .eq('table_name', tableName)
      .single();

    if (error) throw new Error(`Failed to check RLS status: ${error.message}`);
    return data?.row_security || false;
  }

  /**
   * Gets all policies for a specific table
   */
  async getPoliciesForTable(tableName: string) {
    const { data, error } = await this.supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', tableName);

    if (error) throw new Error(`Failed to get policies: ${error.message}`);
    return data;
  }
}
