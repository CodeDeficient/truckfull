// Re-export all functionality from the core middleware

export {
  withAuth,
  withAuthValidation,
  withRateLimit,
  DEFAULT_RATE_LIMIT_OPTIONS,
  type AuthOptions,
  type AuthenticatedHandler,
  type AuthenticatedValidatedHandler,
} from './coreMiddleware';
