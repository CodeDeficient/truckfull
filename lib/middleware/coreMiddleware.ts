import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { hasRoleAccess, type UserRole } from '@/lib/auth/roles';
import { logSecurityEvent } from '@/lib/auth/authHelpers';
import { logError } from '@/lib/logging';
import { checkRateLimited, standardLimiter } from '@/lib/middleware/rateLimit';

// ============================================================
// Rate limiting — delegated to Upstash Redis
// See lib/middleware/rateLimit.ts for the canonical implementation.
// ============================================================

// Helper function to get the client's IP address
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  return '127.0.0.1';
}

/**
 * @deprecated REMOVED - In-memory rate limiting was a security vulnerability.
 * Use checkRateLimited() from lib/middleware/rateLimit.ts instead.
 * @throws Error if called - this function is no longer supported.
 */
export function checkRateLimit(
  _identifier: string,
  _windowMs?: number,
  _maxRequests?: number,
): never {
  throw new Error(
    'checkRateLimit() is deprecated and removed. Use checkRateLimited() from lib/middleware/rateLimit.ts instead. ' +
      'This in-memory implementation was a security vulnerability in serverless environments.',
  );
}

// Authentication result interface
export interface AuthResult {
  success: boolean;
  user?: {
    id: string;
    email?: string;
    role: string;
  };
  error?: string;
  statusCode?: number;
}

// Shared function to get user profile
export async function fetchUserProfile(
  userId: string,
  ip: string,
  userAgent: string | null,
  pathname: string,
): Promise<{ data?: { email?: string | null; role: string }; error?: AuthResult }> {
  const supabase = createServerSupabaseClient();

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, email')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    await logSecurityEvent('profile_not_found', userId, ip, userAgent, pathname);

    return {
      error: {
        success: false,
        error: 'User profile not found',
        statusCode: 401,
      },
    };
  }

  return { data: profile };
}

// Shared function to check user role access for authenticateUser context
export async function checkUserRoleAccessForAuth(
  userId: string,
  ip: string,
  userAgent: string | null,
  pathname: string,
  userRole: string,
  requiredRoles: UserRole[],
): Promise<{ success: true } | { success: false; result: AuthResult }> {
  if (requiredRoles.length > 0) {
    const hasAccess = hasRoleAccess(userRole, requiredRoles);
    if (!hasAccess) {
      await logSecurityEvent('forbidden_access', userId, ip, userAgent, pathname, {
        requiredRoles,
        userRole,
      });

      return {
        success: false,
        result: {
          success: false,
          error: `Insufficient permissions. Required roles: ${requiredRoles.join(', ')}`,
          statusCode: 403,
        },
      };
    }
  }

  return { success: true };
}

// Shared function to check user role access for handler context
export async function checkUserRoleAccessForHandler(
  userId: string,
  ip: string,
  userAgent: string | null,
  pathname: string,
  userRole: string,
  requiredRoles: UserRole[],
): Promise<{ success: true } | { success: false; result: { error: Response } }> {
  if (requiredRoles.length > 0) {
    const hasAccess = hasRoleAccess(userRole, requiredRoles);
    if (!hasAccess) {
      await logSecurityEvent('forbidden_access', userId, ip, userAgent, pathname, {
        requiredRoles,
        userRole,
      });

      return {
        success: false,
        result: {
          error: createErrorResponse(
            'Forbidden',
            403,
            `Insufficient permissions. Required roles: ${requiredRoles.join(', ')}`,
          ),
        },
      };
    }
  }

  return { success: true };
}

// Shared function to create successful authentication response
export async function createSuccessfulAuthResponse(
  userId: string,
  ip: string,
  userAgent: string | null,
  pathname: string,
  profile: { email?: string | null; role: string },
): Promise<{ id: string; email?: string; role: string }> {
  // Log successful access
  await logSecurityEvent('authorized_access', userId, ip, userAgent, pathname);

  return {
    id: userId,
    email: profile.email ?? undefined,
    role: profile.role,
  };
}

// Shared authentication logic
export async function authenticateUser(
  request: NextRequest,
  requiredRoles: UserRole[] = [],
): Promise<AuthResult> {
  try {
    const ip = getClientIP(request);

    const supabase = createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      await logSecurityEvent(
        'unauthorized_access',
        null,
        ip,
        request.headers.get('user-agent') ?? null,
        request.nextUrl.pathname,
      );

      return {
        success: false,
        error: 'Unauthorized',
        statusCode: 401,
      };
    }

    // Get user profile to check role
    const profileResult = await fetchUserProfile(
      user.id,
      ip,
      request.headers.get('user-agent') ?? null,
      request.nextUrl.pathname,
    );

    if (profileResult.error) {
      return profileResult.error;
    }

    const profile = profileResult.data;

    if (!profile) {
      await logSecurityEvent(
        'profile_not_found',
        user.id,
        ip,
        request.headers.get('user-agent') ?? null,
        request.nextUrl.pathname,
      );

      return {
        success: false,
        error: 'User profile not found',
        statusCode: 401,
      };
    }

    // Check role-based access if required roles are specified
    const roleCheckResult = await checkUserRoleAccessForAuth(
      user.id,
      ip,
      request.headers.get('user-agent') ?? null,
      request.nextUrl.pathname,
      profile.role,
      requiredRoles,
    );

    if (!roleCheckResult.success) {
      return roleCheckResult.result;
    }

    const userResult = await createSuccessfulAuthResponse(
      user.id,
      ip,
      request.headers.get('user-agent') ?? null,
      request.nextUrl.pathname,
      profile,
    );

    return {
      success: true,
      user: userResult,
    };
  } catch (error) {
    logError('Authentication error:', error);
    return {
      success: false,
      error: 'Internal server error during authentication',
      statusCode: 500,
    };
  }
}

// Shared rate limiting logic — delegates to Upstash Redis
export async function applyRateLimit(
  request: NextRequest,
  _windowMs: number = 15 * 60 * 1000,
  _maxRequests: number = 100,
): Promise<{ allowed: boolean; retryAfter?: number; statusCode?: number }> {
  const ip = getClientIP(request);
  const identifier = `${request.nextUrl.pathname}:${ip}`;

  const result = await checkRateLimited(identifier, standardLimiter);

  if (!result.allowed) {
    return {
      allowed: false,
      retryAfter: result.retryAfter,
      statusCode: 429,
    };
  }

  return { allowed: true };
}

// Shared error response creation
export function createErrorResponse(error: string, statusCode: number, details?: string): Response {
  return NextResponse.json(
    {
      success: false,
      error,
      ...(details && { details }),
    },
    { status: statusCode },
  );
}

// Shared success response creation
export function createSuccessResponse(data: unknown, statusCode: number = 200): Response {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status: statusCode },
  );
}

// Request body parsing interface
export interface ParsedRequestBody {
  json?: unknown;
  formData?: Record<string, string>;
  raw?: string;
}

// Parse request body with error handling
export async function parseRequestBody(
  request: NextRequest,
): Promise<{ data?: ParsedRequestBody; error?: Response }> {
  const contentType = request.headers.get('content-type');

  if (typeof contentType === 'string' && contentType.includes('application/json')) {
    try {
      const json = await request.json();
      return { data: { json } };
    } catch {
      return {
        error: createErrorResponse(
          'Invalid JSON in request body',
          400,
          'Request body must be valid JSON',
        ),
      };
    }
  } else if (
    typeof contentType === 'string' &&
    contentType.includes('application/x-www-form-urlencoded')
  ) {
    try {
      const formData = await request.formData();
      const formObject: Record<string, string> = {};
      for (const [key, value] of formData.entries()) {
        if (typeof value === 'string') {
          formObject[key] = value;
        } else if (
          value &&
          typeof value === 'object' &&
          'name' in value &&
          typeof (value as { name?: string }).name === 'string'
        ) {
          formObject[key] = (value as { name: string }).name;
        } else if (value && typeof value === 'object') {
          formObject[key] = JSON.stringify(value);
        } else {
          formObject[key] = String(value);
        }
      }
      return { data: { formData: formObject } };
    } catch {
      return {
        error: createErrorResponse(
          'Invalid form data in request body',
          400,
          'Request body must be valid form data',
        ),
      };
    }
  }

  return { data: {} };
}

// Create rate-limiting response with security logging
export async function createRateLimitResponse(
  request: NextRequest,
  retryAfter: number,
  userId?: string | null,
): Promise<Response> {
  const ip = getClientIP(request);

  await logSecurityEvent(
    'rate_limit_exceeded',
    userId ?? null,
    ip,
    request.headers.get('user-agent') ?? null,
    request.nextUrl.pathname,
    {
      rateLimitKey: `${ip}:${request.nextUrl.pathname}`,
      retryAfter,
    },
  );

  return NextResponse.json(
    {
      success: false,
      error: 'Rate limit exceeded',
      details: `Too many requests. Please try again in ${retryAfter} seconds.`,
    },
    { status: 429 },
  );
}

// Base middleware class with common functionality
export abstract class BaseMiddleware {
  protected async handleRateLimit(
    request: NextRequest,
    _windowMs: number = 15 * 60 * 1000,
    _maxRequests: number = 100,
    userId?: string,
  ): Promise<Response | null> {
    const ip = getClientIP(request);
    const identifier = `${request.nextUrl.pathname}:${ip}`;

    const result = await checkRateLimited(identifier, standardLimiter);

    if (!result.allowed) {
      return createRateLimitResponse(request, result.retryAfter, userId);
    }

    return null;
  }

  protected async handleAuthentication(
    request: NextRequest,
    requiredRoles: UserRole[] = [],
  ): Promise<{ user?: AuthResult['user']; error?: Response }> {
    try {
      const supabase = createServerSupabaseClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        const ip = getClientIP(request);
        await logSecurityEvent(
          'unauthorized_access',
          null,
          ip,
          request.headers.get('user-agent') ?? null,
          request.nextUrl.pathname,
        );

        return {
          error: createErrorResponse('Unauthorized', 401, 'Authentication required'),
        };
      }

      // Get user profile to check role
      const ip = getClientIP(request);
      const profileResult = await fetchUserProfile(
        user.id,
        ip,
        request.headers.get('user-agent') ?? null,
        request.nextUrl.pathname,
      );

      if (profileResult.error) {
        return {
          error: createErrorResponse('Unauthorized', 401, 'User profile not found'),
        };
      }

      const profile = profileResult.data;

      if (!profile) {
        return {
          error: createErrorResponse('Unauthorized', 401, 'User profile not found'),
        };
      }

      // Check role-based access if required roles are specified
      const roleCheckResult = await checkUserRoleAccessForHandler(
        user.id,
        ip,
        request.headers.get('user-agent') ?? null,
        request.nextUrl.pathname,
        profile.role,
        requiredRoles,
      );

      if (!roleCheckResult.success) {
        return roleCheckResult.result;
      }

      return {
        user: await createSuccessfulAuthResponse(
          user.id,
          ip,
          request.headers.get('user-agent') ?? null,
          request.nextUrl.pathname,
          profile,
        ),
      };
    } catch (error) {
      logError('Authentication error:', error);
      return {
        error: createErrorResponse('Internal server error during authentication', 500),
      };
    }
  }

  protected shouldSkipMethod(method: string, skipMethods: string[]): boolean {
    return skipMethods.includes(method);
  }
}

export function shouldSkipMethod(method: string, skipMethods: string[]): boolean {
  return skipMethods.includes(method);
}

// Default rate limit options
export const DEFAULT_RATE_LIMIT_OPTIONS = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
};

// Default auth options
export const DEFAULT_AUTH_OPTIONS = {
  requiredRoles: [],
  rateLimit: DEFAULT_RATE_LIMIT_OPTIONS,
  skipMethods: [],
};

// Interface for validation error details
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  received?: unknown;
}

// Type for handler function that takes validated data
export type ValidatedHandler<T> = (
  request: NextRequest,
  params: { params?: Record<string, string> },
  validatedData: T,
) => Promise<Response>;

// Type for handler function that takes validated data with auth
export type AuthenticatedValidatedHandler<T> = (
  request: NextRequest,
  params: { params?: Record<string, string> },
  user: { id: string; email?: string; role: string },
  validatedData: T,
) => Promise<Response>;

// Type for GET handlers (no body validation)
export type GetHandler = (
  request: NextRequest,
  params: { params?: Record<string, string> },
) => Promise<Response>;

// Type for handler function with auth but no validation
export type AuthenticatedHandler = (
  request: NextRequest,
  params: { params?: Record<string, string> },
  user: { id: string; email?: string; role: string },
) => Promise<Response>;

// Options for validation middleware
export interface ValidationOptions {
  // Whether to include the raw ZodError in the response (dev mode)
  includeRawError?: boolean;
  // Custom error transformer
  transformError?: (error: ZodError) => ValidationError[];
  // Skip validation for certain methods
  skipMethods?: string[];
}

// Options for authentication middleware
export interface AuthOptions {
  requiredRoles?: UserRole[];
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
  skipMethods?: string[];
}

/**
 * Transforms ZodError into structured validation errors
 */
export function transformZodError(error: ZodError): ValidationError[] {
  return error.issues.map((err) => ({
    field: err.path.join('.') || 'root',
    message: err.message,
    code: err.code,
    received: 'received' in err ? err.received : undefined,
  }));
}

/**
 * Apply rate limiting to a request and return response if exceeded
 */
async function applyRateLimitToRequest(
  request: NextRequest,
  _rateLimit: { windowMs: number; maxRequests: number },
): Promise<Response | null> {
  const ip = getClientIP(request);
  const identifier = `${request.nextUrl.pathname}:${ip}`;

  const result = await checkRateLimited(identifier, standardLimiter);

  if (!result.allowed) {
    return createRateLimitResponse(request, result.retryAfter);
  }

  return null;
}

/**
 * Higher-order function that wraps Next.js API route handlers with validation
 */
export function withValidation<T>(
  schema: z.ZodType<T>,
  handler: ValidatedHandler<T>,
  options: ValidationOptions & {
    rateLimit?: {
      windowMs: number;
      maxRequests: number;
    };
  } = {},
) {
  return async (
    request: NextRequest,
    params: { params?: Record<string, string> } = {},
  ): Promise<Response> => {
    const {
      includeRawError = globalThis.process !== undefined &&
        globalThis.process.env?.NODE_ENV === 'development',
      transformError = transformZodError,
      skipMethods = ['GET', 'HEAD', 'OPTIONS'],
      rateLimit = { windowMs: 15 * 60 * 1000, maxRequests: 100 }, // 15 min window, 100 requests
    } = options;

    // Apply rate limiting
    const rateLimitResponse = await applyRateLimitToRequest(request, rateLimit);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Skip validation for certain HTTP methods
    if (skipMethods.includes(request.method)) {
      // For GET requests, pass through without validation
      if (request.method === 'GET') {
        return (handler as unknown as GetHandler)(request, params);
      }
      return NextResponse.json({ error: `Method ${request.method} not allowed` }, { status: 405 });
    }

    try {
      // Parse request body
      const parseResult = await parseRequestBody(request);
      if (parseResult.error) {
        return parseResult.error;
      }

      const body = parseResult.data?.json ?? parseResult.data?.formData ?? {};

      // Validate the parsed body against the schema
      const validatedData = await schema.parseAsync(body);

      // Call the original handler with validated data
      return await handler(request, params, validatedData);
    } catch (error) {
      // Handle validation errors
      if (error instanceof ZodError) {
        const validationErrors = transformError(error);

        const response: {
          success: false;
          error: string;
          validationErrors: ValidationError[];
          rawError?: unknown;
        } = {
          success: false,
          error: 'Validation failed',
          validationErrors,
        };

        // Include raw error in development
        if (includeRawError) {
          response.rawError = error.issues;
        }

        return NextResponse.json(response, { status: 400 });
      }

      // Handle other errors
      logError('Validation middleware error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Internal server error',
          validationErrors: [
            {
              field: 'server',
              message: 'An unexpected error occurred during validation',
              code: 'internal_error',
            },
          ],
        },
        { status: 500 },
      );
    }
  };
}

/**
 * Higher-order function that wraps Next.js API route handlers with authentication
 */
export function withAuth(handler: AuthenticatedHandler, options?: AuthOptions) {
  return async (
    request: NextRequest,
    params: { params?: Record<string, string> } = {},
  ): Promise<Response> => {
    const {
      requiredRoles = [],
      rateLimit = DEFAULT_RATE_LIMIT_OPTIONS,
      skipMethods = [],
    } = options ?? {};

    // Apply rate limiting
    const rateLimitResponse = await applyRateLimitToRequest(request, rateLimit);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Skip authentication for certain HTTP methods
    if (skipMethods.includes(request.method)) {
      // For methods that don't require auth, continue without auth check
      return NextResponse.next();
    }

    try {
      // Check authentication
      const authResult = await authenticateUser(request, requiredRoles);

      if (!authResult.success) {
        return NextResponse.json(
          {
            error: authResult.error,
            details: `Authentication failed: ${authResult.error}`,
          },
          { status: authResult.statusCode ?? 401 },
        );
      }

      // Call the original handler with user info
      return await handler(request, params, {
        id: authResult.user!.id,
        email: authResult.user!.email,
        role: authResult.user!.role,
      });
    } catch (error) {
      logError('Authentication middleware error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Internal server error during authentication',
        },
        { status: 500 },
      );
    }
  };
}

/**
 * Combines authentication and validation in a single middleware
 */
export function withAuthValidation<T>(
  schema: z.ZodType<T>,
  handler: AuthenticatedValidatedHandler<T>,
  options: AuthOptions = {},
) {
  return async (
    request: NextRequest,
    params: { params?: Record<string, string> } = {},
  ): Promise<Response> => {
    const {
      requiredRoles = [],
      rateLimit = DEFAULT_RATE_LIMIT_OPTIONS,
      skipMethods = ['GET', 'HEAD', 'OPTIONS'],
    } = options;

    // Apply rate limiting
    const rateLimitResponse = await applyRateLimitToRequest(request, rateLimit);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Skip validation for certain HTTP methods, but still apply auth
    if (skipMethods.includes(request.method)) {
      // Call auth wrapper without validation
      return withAuth(async (req, p, user) => {
        return await handler(req, p, user, {} as T);
      }, options)(request, params);
    }

    try {
      // Check authentication
      const authResult = await authenticateUser(request, requiredRoles);

      if (!authResult.success) {
        return NextResponse.json(
          {
            error: authResult.error,
            details: `Authentication failed: ${authResult.error}`,
          },
          { status: authResult.statusCode ?? 401 },
        );
      }

      // Parse and validate request body
      const parseResult = await parseRequestBody(request);
      if (parseResult.error) {
        return parseResult.error;
      }

      const body = parseResult.data?.json ?? parseResult.data?.formData ?? {};

      // Validate the parsed body against the schema
      try {
        const validatedData = await schema.parseAsync(body);

        // Call the original handler with user info and validated data
        return await handler(
          request,
          params,
          {
            id: authResult.user!.id,
            email: authResult.user!.email,
            role: authResult.user!.role,
          },
          validatedData,
        );
      } catch (validationError: unknown) {
        // Handle validation errors
        const validationErrors: ValidationError[] =
          validationError instanceof ZodError
            ? validationError.issues.map((err) => ({
                field: err.path.join('.') ?? 'root',
                message: err.message,
                code: err.code,
                received: 'received' in err ? err.received : undefined,
              }))
            : [];

        return NextResponse.json(
          {
            success: false,
            error: 'Validation failed',
            validationErrors,
          },
          { status: 400 },
        );
      }
    } catch (error) {
      logError('Auth validation middleware error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Internal server error',
        },
        { status: 500 },
      );
    }
  };
}

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
}

/**
 * Rate limiting only middleware
 */
export function withRateLimit(
  handler: (request: NextRequest, params: { params?: Record<string, string> }) => Promise<Response>,
  _options: RateLimitOptions = DEFAULT_RATE_LIMIT_OPTIONS,
) {
  return async (
    request: NextRequest,
    params: { params?: Record<string, string> } = {},
  ): Promise<Response> => {
    // Apply rate limiting via Upstash Redis
    const ip = getClientIP(request);
    const identifier = `${request.nextUrl.pathname}:${ip}`;
    const result = await checkRateLimited(identifier, standardLimiter);

    if (!result.allowed) {
      return createRateLimitResponse(request, result.retryAfter);
    }

    // Call the original handler
    return await handler(request, params);
  };
}

/**
 * Wrapper for GET routes that don't need body validation
 */
export function withGetValidation(
  handler: GetHandler,
  _options: Omit<ValidationOptions, 'skipMethods'> = {},
) {
  return async (
    request: NextRequest,
    params: { params?: Record<string, string> } = {},
  ): Promise<Response> => {
    try {
      return await handler(request, params);
    } catch (error) {
      logError('GET handler error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Internal server error',
        },
        { status: 500 },
      );
    }
  };
}

/**
 * Utility to create a schema for query parameters validation
 */
export function createQuerySchema<T extends Record<string, z.ZodSchema>>(schemas: T) {
  return z.object(schemas);
}

/**
 * Validates query parameters from URL search params
 */
export function validateQueryParams<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>,
): { success: true; data: T } | { success: false; errors: ValidationError[] } {
  try {
    const { searchParams } = request.nextUrl;
    const queryObject: Record<string, string | string[]> = {};

    // Convert URLSearchParams to plain object
    for (const [key, value] of searchParams.entries()) {
      if (Object.prototype.hasOwnProperty.call(queryObject, key)) {
        // Handle multiple values for same key
        const existing = queryObject[key];
        if (Array.isArray(existing)) {
          existing.push(value);
        } else {
          queryObject[key] = [existing, value];
        }
      } else {
        queryObject[key] = value;
      }
    }

    const validatedData = schema.parse(queryObject);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, errors: transformZodError(error) };
    }
    throw error;
  }
}
