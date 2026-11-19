/**
 * Supabase Validation Logs Service
 *
 * This service manages validation error logs in Supabase with automatic TTL cleanup
 */

import { getSupabase } from './client';
import type { ValidationError } from '../errors/validationError';
import { logError, logWarning } from '../logging';
import type { Json } from '@/lib/database.remote.types';

/**
 * Validation log entry structure in Supabase
 */
export interface ValidationLogEntry {
  id: string;
  error_id: string;
  code: string;
  message: string;
  path: string[];
  severity: 'error' | 'warn';
  context?: string;
  user_id?: string;
  session_id?: string;
  timestamp: string;
  expires_at: string;
  metadata?: Json;
}

/**
 * Validation log summary for analytics
 */
export interface ValidationLogSummary {
  total_logs: number;
  error_count: number;
  warning_count: number;
  top_error_codes: Array<{ code: string; count: number }>;
  date_range: {
    start: string;
    end: string;
  };
}

/**
 * Default TTL for validation logs (7 days)
 */
const DEFAULT_TTL_HOURS = 7 * 24; // 7 days

/**
 * Calculate expiration timestamp based on TTL
 */
function calculateExpirationDate(ttlHours: number = DEFAULT_TTL_HOURS): string {
  const expiration = new Date();
  expiration.setHours(expiration.getHours() + ttlHours);
  return expiration.toISOString();
}

function createLogEntry(
  error: ValidationError,
  ttlHours: number,
  metadata?: Record<string, unknown>,
): Omit<ValidationLogEntry, 'id'> {
  return {
    error_id: error.id,
    code: error.code,
    message: error.message,
    path: error.path,
    severity: error.severity,
    context: error.context,
    user_id: error.userId,
    session_id: error.sessionId,
    timestamp: error.timestamp,
    expires_at: calculateExpirationDate(ttlHours),
    metadata: (metadata as unknown as Json) ?? undefined,
  };
}

/**
 * Write validation error to Supabase validation_logs table
 */
export async function writeValidationLogToSupabase(
  error: ValidationError,
  ttlHours: number = DEFAULT_TTL_HOURS,
  metadata?: Record<string, unknown>,
): Promise<{ success: boolean; error?: string }> {
  try {
    const logEntry = createLogEntry(error, ttlHours, metadata);

    const { error: supabaseError } = await getSupabase().from('validation_logs').insert([logEntry]);

    if (supabaseError) {
      logError('ValidationLogsService.writeValidationLogToSupabase', supabaseError);
      return { success: false, error: supabaseError.message };
    }

    return { success: true };
  } catch (error_) {
    const errorMessage = error_ instanceof Error ? error_.message : 'Unknown error';
    logError('ValidationLogsService.writeValidationLogToSupabase', error_);
    return { success: false, error: errorMessage };
  }
}

/**
 * Write multiple validation errors to Supabase in batch
 */
export async function writeValidationLogsBatchToSupabase(
  errors: ValidationError[],
  ttlHours: number = DEFAULT_TTL_HOURS,
  metadata?: Record<string, unknown>,
): Promise<{ success: boolean; error?: string; processedCount: number }> {
  if (errors.length === 0) {
    return { success: true, processedCount: 0 };
  }

  try {
    const logEntries = errors.map((error) => createLogEntry(error, ttlHours, metadata));

    const { error: supabaseError } = await getSupabase().from('validation_logs').insert(logEntries);

    if (supabaseError) {
      logError('ValidationLogsService.writeValidationLogsBatchToSupabase', supabaseError);
      return { success: false, error: supabaseError.message, processedCount: 0 };
    }

    return { success: true, processedCount: errors.length };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('ValidationLogsService.writeValidationLogsBatchToSupabase', error);
    return { success: false, error: errorMessage, processedCount: 0 };
  }
}

/**
 * Retrieve validation logs from Supabase with filters
 */
export async function getValidationLogsFromSupabase(options?: {
  severity?: 'error' | 'warn';
  code?: string;
  userId?: string;
  sessionId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}): Promise<{ success: boolean; data?: ValidationLogEntry[]; error?: string; total?: number }> {
  try {
    let query = getSupabase()
      .from('validation_logs')
      .select('*', { count: 'exact' })
      .order('timestamp', { ascending: false });

    // Apply filters
    if (options?.severity === 'error' || options?.severity === 'warn') {
      query = query.eq('severity', options.severity);
    }
    if (typeof options?.code === 'string' && options.code !== '') {
      query = query.eq('code', options.code);
    }
    if (typeof options?.userId === 'string' && options.userId !== '') {
      query = query.eq('user_id', options.userId);
    }
    if (typeof options?.sessionId === 'string' && options.sessionId !== '') {
      query = query.eq('session_id', options.sessionId);
    }
    if (typeof options?.startDate === 'string' && options.startDate !== '') {
      query = query.gte('timestamp', options.startDate);
    }
    if (typeof options?.endDate === 'string' && options.endDate !== '') {
      query = query.lte('timestamp', options.endDate);
    }

    // Apply pagination
    if (typeof options?.limit === 'number' && Number.isFinite(options.limit)) {
      query = query.limit(options.limit);
    }
    if (typeof options?.offset === 'number' && Number.isFinite(options.offset)) {
      const hasLimit = typeof options?.limit === 'number' && Number.isFinite(options.limit);
      const end = hasLimit ? options.offset + (options.limit as number) - 1 : options.offset + 49;
      query = query.range(options.offset, end);
    }

    const { data, error: supabaseError, count } = await query;

    if (supabaseError) {
      logError('ValidationLogsService.getValidationLogsFromSupabase', supabaseError);
      return { success: false, error: supabaseError.message };
    }

    // Map the data to ValidationLogEntry type, converting null values to undefined
    const mapped = (data ?? []).map(
      (record): ValidationLogEntry => ({
        id: record.id,
        error_id: record.error_id ?? '',
        code: record.code ?? '',
        message: record.message ?? '',
        path: (record.path ?? []) as string[],
        severity: (record.severity ?? 'error') as 'error' | 'warn',
        context: record.context ?? undefined,
        user_id: record.user_id ?? undefined,
        session_id: record.session_id ?? undefined,
        timestamp: record.timestamp ?? new Date().toISOString(),
        expires_at: record.expires_at ?? new Date().toISOString(),
        metadata: record.metadata ?? undefined,
      }),
    );

    return { success: true, data: mapped, total: count ?? 0 };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('ValidationLogsService.getValidationLogsFromSupabase', error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Get validation logs summary for analytics
 */
export async function getValidationLogsSummary(options?: {
  startDate?: string;
  endDate?: string;
  userId?: string;
}): Promise<{ success: boolean; data?: ValidationLogSummary; error?: string }> {
  try {
    let query = getSupabase().from('validation_logs').select('code, severity, timestamp');

    // Apply filters
    if (typeof options?.userId === 'string' && options.userId !== '') {
      query = query.eq('user_id', options.userId);
    }
    if (typeof options?.startDate === 'string' && options.startDate !== '') {
      query = query.gte('timestamp', options.startDate);
    }
    if (typeof options?.endDate === 'string' && options.endDate !== '') {
      query = query.lte('timestamp', options.endDate);
    }

    const { data, error: supabaseError } = await query;

    if (supabaseError) {
      logError('ValidationLogsService.getValidationLogsSummary', supabaseError);
      return { success: false, error: supabaseError.message };
    }

    if (!Array.isArray(data) || data.length === 0) {
      return {
        success: true,
        data: {
          total_logs: 0,
          error_count: 0,
          warning_count: 0,
          top_error_codes: [],
          date_range: {
            start: options?.startDate ?? new Date().toISOString(),
            end: options?.endDate ?? new Date().toISOString(),
          },
        },
      };
    }

    // Calculate summary statistics
    const errorCount = data.filter((log) => log.severity === 'error').length;
    const warningCount = data.filter((log) => log.severity === 'warn').length;

    // Calculate top error codes
    const codeCount: Record<string, number> = {};
    for (const log of data) {
      const code = log.code ?? '';
      codeCount[code] = (codeCount[code] ?? 0) + 1;
    }

    const topErrorCodes = Object.entries(codeCount)
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate date range
    const timestamps = data
      .map((log) => log.timestamp ?? '')
      .sort((a, b) => (a ?? '').localeCompare(b ?? ''));
    const dateRange = {
      start: timestamps[0] ?? options?.startDate ?? new Date().toISOString(),
      end: timestamps.at(-1) ?? options?.endDate ?? new Date().toISOString(),
    };

    const summary: ValidationLogSummary = {
      total_logs: data.length,
      error_count: errorCount,
      warning_count: warningCount,
      top_error_codes: topErrorCodes,
      date_range: dateRange,
    };

    return { success: true, data: summary };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('ValidationLogsService.getValidationLogsSummary', error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Clean up expired validation logs (called by cron job)
 */
export async function cleanupExpiredValidationLogs(): Promise<{
  success: boolean;
  deletedCount: number;
  error?: string;
}> {
  try {
    const now = new Date().toISOString();

    const { count, error: supabaseError } = await getSupabase()
      .from('validation_logs')
      .delete({ count: 'exact' })
      .lt('expires_at', now);

    if (supabaseError) {
      logError('ValidationLogsService.cleanupExpiredValidationLogs', supabaseError);
      return { success: false, deletedCount: 0, error: supabaseError.message };
    }

    const deletedCount = count ?? 0;
    if (deletedCount > 0) {
      logWarning(`Cleaned up ${deletedCount} expired validation logs`);
    }

    return { success: true, deletedCount };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('ValidationLogsService.cleanupExpiredValidationLogs', error);
    return { success: false, deletedCount: 0, error: errorMessage };
  }
}

/**
 * Delete validation logs for a specific user (GDPR compliance)
 */
export async function deleteUserValidationLogs(
  userId: string,
): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  try {
    const { count, error: supabaseError } = await getSupabase()
      .from('validation_logs')
      .delete({ count: 'exact' })
      .eq('user_id', userId);

    if (supabaseError) {
      logError('ValidationLogsService.deleteUserValidationLogs', supabaseError);
      return { success: false, deletedCount: 0, error: supabaseError.message };
    }

    const deletedCount = count ?? 0;
    if (deletedCount > 0) {
      logWarning(`Deleted ${deletedCount} validation logs for user ${userId}`);
    }

    return { success: true, deletedCount };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('ValidationLogsService.deleteUserValidationLogs', error);
    return { success: false, deletedCount: 0, error: errorMessage };
  }
}

/**
 * Get validation logs statistics for dashboard
 */
export async function getValidationLogsStats(
  timeframe: '1h' | '24h' | '7d' | '30d' = '24h',
): Promise<{
  success: boolean;
  data?: {
    totalLogs: number;
    errorRate: number;
    topErrorCodes: Array<{ code: string; count: number }>;
    timeline: Array<{ hour: string; errors: number; warnings: number }>;
  };
  error?: string;
}> {
  try {
    // Calculate time range
    const now = new Date();
    const timeRanges = {
      '1h': 1,
      '24h': 24,
      '7d': 24 * 7,
      '30d': 24 * 30,
    };

    const hoursBack = timeRanges[timeframe];
    const startTime = new Date(now.getTime() - hoursBack * 60 * 60 * 1000);

    const {
      success,
      data: logs,
      error,
    } = await getValidationLogsFromSupabase({
      startDate: startTime.toISOString(),
      endDate: now.toISOString(),
    });

    if (!success || !Array.isArray(logs)) {
      return { success: false, error };
    }

    // Calculate statistics
    const totalLogs = logs.length;
    const errorCount = logs.filter((log) => log.severity === 'error').length;
    const errorRate = totalLogs > 0 ? (errorCount / totalLogs) * 100 : 0;

    // Top error codes
    const codeCount: Record<string, number> = {};
    for (const log of logs) {
      const key = log.code;
      codeCount[key] = (codeCount[key] ?? 0) + 1;
    }

    const topErrorCodes = Object.entries(codeCount)
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Timeline data (grouped by hour)
    const timeline: Record<string, { hour: string; errors: number; warnings: number }> = {};
    for (const log of logs) {
      const hour = new Date(log.timestamp).toISOString().slice(0, 13); // YYYY-MM-DDTHH
      timeline[hour] ||= { hour, errors: 0, warnings: 0 };
      if (log.severity === 'error') {
        timeline[hour].errors++;
      } else {
        timeline[hour].warnings++;
      }
    }

    return {
      success: true,
      data: {
        totalLogs,
        errorRate,
        topErrorCodes,
        timeline: Object.values(timeline).sort((a, b) => a.hour.localeCompare(b.hour)),
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('ValidationLogsService.getValidationLogsStats', error);
    return { success: false, error: errorMessage };
  }
}
