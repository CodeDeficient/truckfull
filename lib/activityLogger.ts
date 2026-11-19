import { logError, logMessage } from '@/lib/logging';
interface ActivityLogEntry {
  type: 'cron_job' | 'system_event' | 'user_action';
  action: string;
  details: Record<string, unknown>;
  timestamp?: string;
}

/**
 * Logs an activity entry with a timestamp and unique ID.
 * @example
 * logActivity({ action: 'user_login', username: 'johndoe' })
 * undefined
 * @param {ActivityLogEntry} entry - The activity entry to be logged.
 * @returns {void} No return value.
 * @description
 *   - If `timestamp` is not provided in the entry, the current ISO timestamp is used.
 *   - A unique ID is generated and added to the log entry.
 *   - Logs activity data to the console in a structured format.
 *   - Intended for development, but can be extended for production use with database or monitoring integration.
 */
export function logActivity(entry: ActivityLogEntry): void {
  try {
    const logEntry = {
      ...entry,
      timestamp: entry.timestamp ?? new Date().toISOString(),
      id: generateId(),
    };

    // Log to console for development
    logMessage('Activity Log:', JSON.stringify(logEntry, undefined, 2));
  } catch (error) {
    logError('Failed to log activity:', error);
    // Don't throw - logging failures shouldn't break the main flow
  }
}

export function getActivityLogs(_type?: string, _limit: number = 50): ActivityLogEntry[] {
  return [];
}

function generateId(): string {
  return crypto.randomUUID();
}
