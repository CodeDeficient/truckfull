import type { Database } from '@/lib/database.remote.types';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { logError } from '@/lib/logging';

type TableName = string & keyof Database['public']['Tables'];

interface LooseTable<T> {
  insert(data: unknown): {
    select(query?: string): { single(): Promise<{ data: T | null; error: { message: string } | null }> };
  };
  update(data: unknown): {
    eq(column: string, value: unknown): {
      select(query?: string): { single(): Promise<{ data: T | null; error: { message: string } | null }> };
    };
  };
  delete(): { eq(column: string, value: unknown): Promise<{ error: { message: string } | null }> };
  select(query?: string): {
    eq(column: string, value: unknown): { single(): Promise<{ data: T | null; error: { message: string } | null }> };
  };
}

function fromTable<T>(table: TableName): LooseTable<T> {
  return getSupabaseAdmin().from(table) as unknown as LooseTable<T>;
}

export class BaseService {
  protected supabase = getSupabaseAdmin();

  protected handleError(error: unknown, operation: string): { error: string } {
    logError(`Error ${operation}:`, error);
    const message = error instanceof Error ? error.message : `An unexpected error occurred while ${operation}`;
    return { error: message };
  }

  protected handleSuccess<T>(data: T): { data: T } {
    return { data };
  }

  protected transformNullToUndefined(data: Record<string, unknown>): Record<string, unknown> {
    const transformed = { ...data };
    for (const [key, value] of Object.entries(transformed)) {
      if (value === null) {
        transformed[key] = undefined;
      }
    }
    return transformed;
  }

  protected transformArrayFields(
    data: Record<string, unknown>,
    arrayFields: string[] = [],
  ): Record<string, unknown> {
    const transformed = { ...data };
    for (const field of arrayFields) {
      if (field in transformed) {
        transformed[field] = transformed[field] ?? [];
      }
    }
    return transformed;
  }

  protected async createRecord<T extends { id?: string }>(
    table: TableName,
    data: Omit<T, 'id'>,
    arrayFields: string[] = [],
  ): Promise<{ data?: T; error?: string }> {
    try {
      const { data: result, error } = await fromTable<T>(table).insert([data]).select().single();

      if (error) {
        return this.handleError(error, `creating record in ${table}`);
      }

      if (result) {
        let transformed = this.transformNullToUndefined(result as unknown as Record<string, unknown>);
        transformed = this.transformArrayFields(transformed, arrayFields);
        return this.handleSuccess(transformed as unknown as T);
      }

      return this.handleSuccess(result as unknown as T);
    } catch (error) {
      return this.handleError(error, `creating record in ${table}`);
    }
  }

  protected async updateRecord<T extends { id: string }>(
    table: TableName,
    id: string,
    updates: Partial<T>,
    arrayFields: string[] = [],
  ): Promise<{ data?: T; error?: string }> {
    try {
      const { data: result, error } = await fromTable<T>(table).update(updates).eq('id', id).select().single();

      if (error) {
        return this.handleError(error, `updating record in ${table}`);
      }

      if (result) {
        let transformed = this.transformNullToUndefined(result as unknown as Record<string, unknown>);
        transformed = this.transformArrayFields(transformed, arrayFields);
        return this.handleSuccess(transformed as unknown as T);
      }

      return this.handleSuccess(result as unknown as T);
    } catch (error) {
      return this.handleError(error, `updating record in ${table}`);
    }
  }

  protected async deleteRecord(
    table: TableName,
    id: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await fromTable(table).delete().eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch {
      return {
        success: false,
        error: `An unexpected error occurred while deleting record from ${table}`,
      };
    }
  }

  protected async getRecordById<T>(
    table: TableName,
    id: string,
    arrayFields: string[] = [],
  ): Promise<{ data?: T; error?: string }> {
    try {
      const { data, error } = await fromTable<T>(table).select('*').eq('id', id).single();

      if (error) {
        return this.handleError(error, `fetching record from ${table}`);
      }

      if (data) {
        let transformed = this.transformNullToUndefined(data as unknown as Record<string, unknown>);
        transformed = this.transformArrayFields(transformed, arrayFields);
        return this.handleSuccess(transformed as unknown as T);
      }

      return this.handleSuccess(data as unknown as T);
    } catch (error) {
      return this.handleError(error, `fetching record from ${table}`);
    }
  }
}
