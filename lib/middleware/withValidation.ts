// Re-export all functionality from the core middleware

export {
  withValidation,
  withAuth,
  withAuthValidation,
  withRateLimit,
  withGetValidation,
  createQuerySchema,
  validateQueryParams,
  DEFAULT_RATE_LIMIT_OPTIONS,
  type ValidationError,
  type ValidatedHandler,
  type AuthenticatedValidatedHandler,
  type GetHandler,
  type AuthenticatedHandler,
  type ValidationOptions,
  type AuthOptions,
} from './coreMiddleware';
