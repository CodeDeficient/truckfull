/**
 * Pure access-policy decisions for API route auth gates.
 *
 * These helpers contain no I/O so the boundary logic can be unit-tested
 * without mocking Supabase or Next.js request plumbing. Route handlers are
 * responsible for resolving the caller's user id and role and translating
 * the returned decision into an HTTP response.
 */

export type ApiAccessDecision = 'allow' | 'unauthorized' | 'forbidden';

/**
 * Roles that satisfy an admin gate. `superadmin` is a valid `profiles.role`
 * (see the role CHECK constraint) and every other admin boundary in the
 * codebase accepts it, so this policy must too.
 */
const ADMIN_ROLES: ReadonlySet<string> = new Set(['admin', 'superadmin']);

export interface AuthGateOptions {
  /** When true, the caller must hold `admin` or `superadmin`. */
  readonly requiresAdmin: boolean;
}

/**
 * Evaluate an endpoint's auth gate for a resolved caller.
 *
 * - No authenticated user → `unauthorized` (401)
 * - Authenticated but lacking admin when required → `forbidden` (403)
 * - Otherwise → `allow`
 */
export function evaluateAuthGate(
  userId: string | null | undefined,
  role: string | null | undefined,
  options: AuthGateOptions,
): ApiAccessDecision {
  if (userId == undefined || userId === '') {
    return 'unauthorized';
  }

  if (options.requiresAdmin && (role == null || !ADMIN_ROLES.has(role))) {
    return 'forbidden';
  }

  return 'allow';
}
