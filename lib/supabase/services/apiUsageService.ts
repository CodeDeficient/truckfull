import { getSupabase } from '../client';
import { getSupabaseAdmin } from '../admin';
import type { ApiUsage } from '../types';
import { type PostgrestSingleResponse, type PostgrestError } from '@supabase/supabase-js';
import { logWarning } from '@/lib/logging';

export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

export function isNotFoundError(error: unknown): boolean {
  if (error == null) return false;
  const err = error as { code?: string };
  return err.code === 'PGRST116';
}

export function isNonNotFoundError(error: unknown): boolean {
  return error != null && !isNotFoundError(error);
}

export function normalizeUsageRow(row: Record<string, unknown>): ApiUsage {
  return {
    ...row,
    created_at: row.created_at as string | undefined,
  } as ApiUsage;
}

export function buildUsageUpdateData(
  existing: ApiUsage,
  requests: number,
  tokens: number,
): { requests_count: number; tokens_used: number } {
  return {
    requests_count: (existing.requests_count || 0) + requests,
    tokens_used: (existing.tokens_used || 0) + tokens,
  };
}

export function buildUsageInsertData(
  serviceName: string,
  today: string,
  requests: number,
  tokens: number,
): { service_name: string; usage_date: string; requests_count: number; tokens_used: number } {
  return {
    service_name: serviceName,
    usage_date: today,
    requests_count: requests,
    tokens_used: tokens,
  };
}

export const APIUsageService = {
  async trackUsage(serviceName: string, requests: number, tokens: number): Promise<ApiUsage> {
    const admin = getSupabaseAdmin();

    try {
      const today = new Date().toISOString().split('T')[0];

      const { data: existing, error: existingError } = (await admin
        .from('api_usage')
        .select('id, requests_count, tokens_used')
        .eq('service_name', serviceName)
        .eq('usage_date', today)
        .single()) as unknown as {
        data: ApiUsage | undefined;
        error: PostgrestError | null;
      };

      if (existingError && existingError.code !== 'PGRST116') throw existingError;

      if (existing) {
        const { data, error }: PostgrestSingleResponse<ApiUsage> = await admin
          .from('api_usage')
          .update({
            requests_count: (existing.requests_count || 0) + requests,
            tokens_used: (existing.tokens_used || 0) + tokens,
          })
          .eq('id', existing.id as string)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error }: PostgrestSingleResponse<ApiUsage> = await admin
          .from('api_usage')
          .insert([
            {
              service_name: serviceName,
              usage_date: today,
              requests_count: requests,
              tokens_used: tokens,
            },
          ])
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    } catch (error: unknown) {
      logWarning('Error tracking usage:', error);
      throw error;
    }
  },
  async getTodayUsage(serviceName: string): Promise<ApiUsage | undefined> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error }: PostgrestSingleResponse<ApiUsage> = await getSupabase()
        .from('api_usage')
        .select('*')
        .eq('service_name', serviceName)
        .eq('usage_date', today)
        .single();

      if (error != undefined && String(error.code) != 'PGRST116') throw error;
      return data ?? undefined;
    } catch (error: unknown) {
      logWarning('Error getting today usage:', error);
      throw error;
    }
  },

  async getAllUsageStats(): Promise<ApiUsage[]> {
    try {
      const { data, error } = await getSupabase()
        .from('api_usage')
        .select('*')
        .order('usage_date', { ascending: false })
        .limit(30);

      if (error) throw error;
      return (data ?? []).map((row) => ({
        ...row,
        created_at: row.created_at ?? undefined,
      })) as ApiUsage[];
    } catch (error: unknown) {
      logWarning('Error getting usage stats:', error);
      throw error;
    }
  },
};
