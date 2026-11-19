import { NextRequest } from 'next/server';
import { UserRole } from '@/lib/auth/roles';

// Re-export types from core middleware to avoid duplication
// NOTE: RateLimitInfo and rateLimitStore have been REMOVED - they were a security vulnerability.
// Use checkRateLimited() from lib/middleware/rateLimit.ts for rate limiting.
export {
  getClientIP,
  type AuthResult,
  authenticateUser,
  applyRateLimit,
  createErrorResponse,
  createSuccessResponse,
  type ParsedRequestBody,
  parseRequestBody,
  BaseMiddleware,
  DEFAULT_RATE_LIMIT_OPTIONS,
  DEFAULT_AUTH_OPTIONS,
} from './coreMiddleware';

// Additional specific interfaces/types that might be needed in this module
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  received?: unknown;
}

export type AuthenticatedHandler = (
  request: NextRequest,
  params: { params?: Record<string, string> },
  user: { id: string; email: string; role: string },
) => Promise<Response>;

export interface AuthOptions {
  requiredRoles?: UserRole[];
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
  skipMethods?: string[];
}
