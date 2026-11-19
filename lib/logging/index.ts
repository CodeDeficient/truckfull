/**
 * Centralized Logging Utility
 *
 * - In DEVELOPMENT: Logs to console for debugging
 * - In PRODUCTION: Silent (except errors sent to PostHog)
 *
 * These functions use console.*-style signatures for familiarity:
 *   logDebug('message', data)
 *   logError('context message', error)
 *   logWarning('message', data)
 *   logMessage('message', data)
 */

export interface ErrorContext {
  user?: { id?: string; email?: string };
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
}

/**
 * Sanitize log message to prevent log injection attacks (CWE-117)
 * Removes newlines, carriage returns, and ANSI escape sequences
 * that could be used to forge log entries.
 */
export function sanitizeLogMessage(message: string): string {
  const ansiEscapeRegex = /\u001B\[(?:[0-9;]*)m/g; // NOSONAR: \x1B is ESC char for ANSI stripping
  const controlCharRegex = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g; // NOSONAR: control chars stripped for log safety

  let sanitized = message
    .replaceAll(/(\r\n|\r|\n)/g, ' ')
    .replaceAll(ansiEscapeRegex, '')
    .replaceAll(controlCharRegex, '');

  sanitized = sanitized.replaceAll(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');

  sanitized = sanitized.replaceAll(
    /\b(access_token|refresh_token|secret_key|api_key)\b\s*[=:]\s*['"]?[\w-]+['"]?/gi,
    '$1=[REDACTED]',
  );

  return sanitized;
}

// Determine the environment
const isDevelopment =
  globalThis.process !== undefined && globalThis.process.env?.NODE_ENV === 'development';

/**
 * Log error to console (server-side production or development mode)
 */
function logErrorToConsole(safeMessage: string, errorOrData?: unknown, extra?: ErrorContext): void {
  if (errorOrData === undefined) {
    console.error(`[ERROR] ${safeMessage}`);
  } else {
    console.error(`[ERROR] ${safeMessage}`, errorOrData);
  }
  if (extra) {
    console.error('Error context:', extra);
  }
}

/**
 * Capture error via PostHog (client-side production)
 */
function captureErrorToPostHog(
  message: string,
  _safeMessage: string,
  errorOrData?: unknown,
  extra?: ErrorContext,
): void {
  import('posthog-js')
    .then(({ default: posthog }) => {
      if (errorOrData instanceof Error) {
        posthog.capture('$exception', {
          $exception_message: errorOrData.message,
          $exception_type: errorOrData.name,
          $exception_stack_trace_raw: errorOrData.stack,
          context: message,
          ...extra?.extra,
        });
      } else {
        posthog.capture('$exception', {
          $exception_message: message,
          $exception_type: 'Error',
          context: message,
          additional_data: errorOrData,
          ...extra?.extra,
        });
      }
    })
    .catch(() => {});
}

/**
 * Log debug information - ONLY shows in development
 * This is the primary replacement for console.log
 *
 * @param message - Description of what's being logged
 * @param args - Any additional data to log (supports multiple arguments)
 */
export function logDebug(message: string, ...args: unknown[]): void {
  if (isDevelopment) {
    const safeMessage = sanitizeLogMessage(message);
    if (args.length > 0) {
      console.log(`[DEBUG] ${safeMessage}`, ...args);
    } else {
      console.log(`[DEBUG] ${safeMessage}`);
    }
  }
  // In production: silent - no console output
}

/**
 * Log error with context - uses console in dev, PostHog in production
 * Signature matches console.error() for familiarity
 *
 * @param message - Context message describing where/what the error is
 * @param errorOrData - The error object or additional data
 * @param extra - Any additional context
 */
export function logError(message: string, errorOrData?: unknown, extra?: ErrorContext): void {
  const safeMessage = sanitizeLogMessage(message);

  if (isDevelopment) {
    logErrorToConsole(safeMessage, errorOrData, extra);
    return;
  }

  if (globalThis.window === undefined) {
    logErrorToConsole(safeMessage, errorOrData, extra);
    return;
  }

  captureErrorToPostHog(message, safeMessage, errorOrData, extra);
}

/**
 * Log informational message - uses console in dev, server-side in production
 * Signature matches console.log() style for familiarity
 *
 * @param message - The message to log
 * @param args - Any additional data to log
 */
export function logMessage(message: string, ...args: unknown[]): void {
  const safeMessage = sanitizeLogMessage(message);

  if (isDevelopment) {
    if (args.length > 0) {
      console.info(`[INFO] ${safeMessage}`, ...args);
    } else {
      console.info(`[INFO] ${safeMessage}`);
    }
    return;
  }

  if (globalThis.window === undefined) {
    if (args.length > 0) {
      console.info(`[INFO] ${safeMessage}`, ...args);
    } else {
      console.info(`[INFO] ${safeMessage}`);
    }
  }
  // In production client-side: silent
}

/**
 * Log warning - ONLY shows in development
 * Signature matches console.warn() style for familiarity
 *
 * @param message - The warning message
 * @param args - Any additional data to log
 */
export function logWarning(message: string, ...args: unknown[]): void {
  if (isDevelopment) {
    const safeMessage = sanitizeLogMessage(message);
    if (args.length > 0) {
      console.warn(`[WARN] ${safeMessage}`, ...args);
    } else {
      console.warn(`[WARN] ${safeMessage}`);
    }
  }
  // In production: silent
}

/**
 * Set user context for error tracking
 * In production, this syncs with PostHog identify
 */
export function setUserContext(user: { id?: string; email?: string }): void {
  if (isDevelopment) {
    console.info('[Logger] User context set:', user);
  } else if (globalThis.window !== undefined && user.id) {
    Promise.all([
      import('@/lib/analytics/posthogReady').then(({ getPosthogReady }) => getPosthogReady()),
      import('posthog-js'),
      user.email ? import('@/lib/privacy/emailHash') : Promise.resolve(null),
    ])
      .then(async ([ready, { default: posthog }, emailHashModule]) => {
        if (!ready) return;
        const traits: Record<string, string | undefined> = {};
        if (emailHashModule && user.email) {
          traits.email_hash = await emailHashModule.hashEmailForAnalytics(user.email);
        }
        posthog.identify(user.id, traits);
      })
      .catch(() => {
        // PostHog not available
      });
  }
}

export function resetUserContext(): void {
  if (isDevelopment) {
    console.info('[Logger] User context reset');
  } else if (globalThis.window !== undefined) {
    Promise.all([
      import('@/lib/analytics/posthogReady').then(({ getPosthogReady }) => getPosthogReady()),
      import('posthog-js'),
    ])
      .then(([ready, { default: posthog }]) => {
        if (!ready) return;
        posthog.reset();
      })
      .catch(() => {});
  }
}

/**
 * Set tag for error tracking
 */
export function setTag(key: string, value: string): void {
  if (isDevelopment) {
    console.info(`[Logger] Tag set: ${key} = ${value}`);
  }
}
