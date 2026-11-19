/**
 * SOTA Security Audit Logging System
 * Implements comprehensive audit logging for admin actions and security events
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { logError, logWarning, logMessage } from '@/lib/logging';
import { hashEmailForAnalytics } from '@/lib/privacy/emailHash';
import type { Json } from '@/lib/database.types';

// Type alias for severity levels to comply with sonarjs/use-type-alias
type SeverityLevel = 'info' | 'warning' | 'error' | 'critical';

export interface AuditLogEntry {
  user_id: string;
  user_email: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: Json;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  timestamp: string;
  severity: SeverityLevel;
}

export interface SecurityEvent {
  event_type:
    | 'login_attempt'
    | 'login_success'
    | 'login_failure'
    | 'logout'
    | 'permission_denied'
    | 'data_access'
    | 'data_modification'
    | 'admin_action'
    | 'signup_success'
    | 'signup_failure';
  user_id?: string;
  user_email?: string;
  ip_address?: string;
  user_agent?: string;
  details?: Record<string, unknown>;
  severity: SeverityLevel;
}

/**
 * Audit Logger Service
 */
export class AuditLogger {
  private static async hashEmailForAudit(
    email: string | undefined,
    fallback?: string,
  ): Promise<string | undefined> {
    if (email == undefined) {
      return fallback;
    }

    if (email.trim() === '') {
      return fallback;
    }

    try {
      return await hashEmailForAnalytics(email);
    } catch (error) {
      logWarning('Failed to hash email for audit log, using fallback', {
        hasEmail: true,
        fallbackUsed: fallback != undefined,
        error,
      });
      return fallback;
    }
  }

  /**
   * Log admin action with full audit trail
   */
  static async logAdminAction(options: {
    userId: string;
    userEmail: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    details?: Json;
    request?: {
      ip?: string;
      userAgent?: string;
      sessionId?: string;
    };
  }): Promise<void> {
    const { userId, userEmail, action, resourceType, resourceId, details, request } = options;
    const userEmailHash = (await this.hashEmailForAudit(userEmail, '')) ?? '';
    const auditEntry: AuditLogEntry = {
      user_id: userId,
      user_email: userEmailHash,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details,
      ip_address: request?.ip,
      user_agent: request?.userAgent,
      session_id: request?.sessionId,
      timestamp: new Date().toISOString(),
      severity: this.determineSeverity(action, resourceType),
    };

    await this.writeAuditLog(auditEntry);

    // Log to console for immediate monitoring
    logMessage('Admin Action Audit:', {
      user: userEmailHash,
      action,
      resource: resourceId == undefined ? resourceType : `${resourceType}:${resourceId}`,
      timestamp: auditEntry.timestamp,
    });
  }

  /**
   * Log security event
   */
  static async logSecurityEvent(event: SecurityEvent): Promise<void> {
    const userEmailHash = (await this.hashEmailForAudit(event.user_email, '')) ?? '';
    const logEntry = {
      event_type: event.event_type,
      user_id: event.user_id,
      user_email: userEmailHash,
      ip_address: event.ip_address,
      user_agent: event.user_agent,
      details: event.details,
      severity: event.severity,
      timestamp: new Date().toISOString(),
    };

    try {
      if (getSupabaseAdmin() != undefined) {
        await getSupabaseAdmin()
          .from('security_events' as const)
          .insert(logEntry as never);
      }
    } catch (error) {
      logError('Failed to log security event:', error);
    }

    // Always log security events to console
    logMessage('Security Event:', logEntry);

    // Alert on critical security events
    if (event.severity === 'critical' || event.severity === 'error') {
      logWarning('SECURITY ALERT:', logEntry);
    }
  }

  /**
   * Log authentication events
   */
  static async logAuthEvent(options: {
    eventType: 'login_attempt' | 'login_success' | 'login_failure' | 'logout';
    userEmail?: string;
    userId?: string;
    request?: {
      ip?: string;
      userAgent?: string;
    };
    details?: Record<string, unknown>;
  }): Promise<void> {
    const { eventType, userEmail, userId, request, details } = options;
    const severity = eventType === 'login_failure' ? 'warning' : 'info';

    await this.logSecurityEvent({
      event_type: eventType,
      user_id: userId,
      user_email: userEmail,
      ip_address: request?.ip,
      user_agent: request?.userAgent,
      details,
      severity,
    });
  }

  /**
   * Log data access events
   */
  static async logDataAccess(options: {
    userId: string;
    userEmail: string;
    resourceType: string;
    resourceId?: string;
    action?: 'read' | 'search' | 'export' | 'admin_access';
    request?: {
      ip?: string;
      userAgent?: string;
    };
  }): Promise<void> {
    const { userId, userEmail, resourceType, resourceId, action = 'read', request } = options;
    await this.logSecurityEvent({
      event_type: 'data_access',
      user_id: userId,
      user_email: userEmail,
      ip_address: request?.ip,
      user_agent: request?.userAgent,
      details: {
        resource_type: resourceType,
        resource_id: resourceId,
        action,
      },
      severity: 'info',
    });
  }

  /**
   * Write audit log to database
   */
  private static async writeAuditLog(entry: AuditLogEntry): Promise<void> {
    try {
      if (getSupabaseAdmin() != undefined) {
        await getSupabaseAdmin()
          .from('security_events')
          .insert({
            details: entry.details,
            event_type: `${entry.resource_type}_${entry.action}`,
            severity: entry.severity,
            timestamp: entry.timestamp,
            user_id: entry.user_id,
            user_email: entry.user_email,
          } as never);
      }
    } catch (error) {
      logError('Failed to write audit log:', error);
      // Don't throw - audit logging should not break application flow
    }
  }

  /**
   * Determine severity based on action and resource type
   */
  private static determineSeverity(action: string, resourceType: string): SeverityLevel {
    // Critical actions
    if (action.includes('delete') || action.includes('remove')) {
      return 'critical';
    }

    // Warning actions
    if (action.includes('update') || action.includes('modify') || action.includes('change')) {
      return 'warning';
    }

    // Admin-specific actions
    if (resourceType === 'user' || resourceType === 'admin' || resourceType === 'system') {
      return 'warning';
    }

    // Default to info
    return 'info';
  }

  /**
   * Get audit logs for a specific user
   */
  static async getUserAuditLogs(
    userId: string,
    limit: number = 100,
    offset: number = 0,
  ): Promise<AuditLogEntry[]> {
    try {
      if (getSupabaseAdmin() == undefined) {
        return [];
      }

      const { data, error } = await getSupabaseAdmin()
        .from('security_events')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        logError('Failed to fetch user audit logs:', error);
        return [];
      }

      // Convert security_events data to AuditLogEntry format
      const toString = (val: unknown): string | undefined =>
        typeof val === 'string' ? val : undefined;

      const auditLogs: AuditLogEntry[] = (data ?? []).map((event) => ({
        user_id: toString(event.user_id) ?? '',
        action: toString(event.event_type)?.split('_')[1] ?? '',
        resource_type: toString(event.event_type)?.split('_')[0] ?? '',
        timestamp: toString(event.timestamp) ?? new Date().toISOString(),
        severity: 'info' as const,
        details: (event.details as AuditLogEntry['details']) ?? undefined,
        ip_address: toString(event.ip_address),
        user_agent: toString(event.user_agent),
        session_id: undefined,
        user_email: '',
      }));
      return auditLogs;
    } catch (error) {
      logError('Error fetching user audit logs:', error);
      return [];
    }
  }

  /**
   * Get recent security events
   */
  static async getRecentSecurityEvents(
    hours: number = 24,
    severity?: SeverityLevel,
  ): Promise<Record<string, unknown>[]> {
    try {
      if (getSupabaseAdmin() == undefined) {
        return [];
      }

      const startTime = new Date();
      startTime.setHours(startTime.getHours() - hours);

      let query = getSupabaseAdmin()
        .from('security_events')
        .select('*')
        .gte('timestamp', startTime.toISOString())
        .order('timestamp', { ascending: false });

      if (severity) {
        query = query.eq('severity', severity);
      }

      const { data, error } = await query.limit(500);

      if (error) {
        logError('Failed to fetch security events:', error);
        return [];
      }

      return (data as Record<string, unknown>[]) ?? [];
    } catch (error) {
      logError('Error fetching security events:', error);
      return [];
    }
  }
}

/**
 * Security monitoring utilities
 */
export const SecurityMonitor = {
  /**
   * Check for suspicious activity patterns
   */
  async checkSuspiciousActivity(userId: string): Promise<{
    suspicious: boolean;
    reasons: string[];
    riskLevel: 'low' | 'medium' | 'high';
  }> {
    const reasons: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    try {
      // Check recent failed login attempts
      const recentEvents = await AuditLogger.getRecentSecurityEvents(1, 'warning');
      const failedLogins = recentEvents.filter(
        (event) => event.event_type === 'login_failed' && event.user_id === userId,
      );

      if (failedLogins.length > 5) {
        reasons.push('Multiple failed login attempts');
        riskLevel = 'high';
      } else if (failedLogins.length > 2) {
        reasons.push('Recent failed login attempts');
        riskLevel = 'medium';
      }

      // Check for unusual access patterns
      const auditLogs = await AuditLogger.getUserAuditLogs(userId, 50);
      const recentActions = auditLogs.filter(
        (log) => new Date(log.timestamp) > new Date(Date.now() - 60 * 60 * 1000), // Last hour
      );

      if (recentActions.length > 20) {
        reasons.push('High activity volume');
        riskLevel = riskLevel === 'high' ? 'high' : 'medium';
      }

      return {
        suspicious: reasons.length > 0,
        reasons,
        riskLevel,
      };
    } catch (error) {
      logError('Error checking suspicious activity:', error);
      return {
        suspicious: false,
        reasons: [],
        riskLevel: 'low',
      };
    }
  },
};
