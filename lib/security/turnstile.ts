/**
 * Cloudflare Turnstile verification for the signup flow.
 *
 * The server verifies the widget token via the siteverify endpoint and then
 * enforces BOTH the expected action and the hostname allowlist. A passing
 * `success: true` alone is never trusted.
 *
 * Fail-closed policy: if the secret key or the hostname allowlist is missing,
 * `verifyTurnstileToken` returns `missing_config` and the signup route rejects
 * the request (503) rather than silently accepting signups without protection.
 */

export const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
export const TURNSTILE_ACTION = 'signup';

export interface TurnstileSiteVerifyResponse {
  success: boolean;
  'error-codes'?: string[];
  hostname?: string;
  action?: string;
  challenge_ts?: string;
  metadata?: {
    result_with_testing_key?: boolean;
  };
}

export type TurnstileEvaluation =
  | { ok: true; hostname: string; action: string | undefined; testingKey: boolean }
  | { ok: false; reason: string };

export interface TurnstileVerifyOptions {
  fetcher?: typeof fetch;
  secretKey?: string;
  allowedHostnames?: string[];
  /** Visitor IP, sent as `remoteip` so the token is bound to the caller. */
  remoteIp?: string;
  /** Timeout in ms for the siteverify call (default 5000). */
  timeoutMs?: number;
}

/**
 * Parse the comma-separated TURNSTILE_ALLOWED_HOSTNAMES env var into a
 * normalized allowlist (trimmed, lowercased, empty entries dropped).
 */
export function getAllowedHostnames(
  env: Record<string, string | undefined> = process.env,
): string[] {
  const raw = env.TURNSTILE_ALLOWED_HOSTNAMES;
  if (!raw || raw.trim() === '') {
    return [];
  }
  return raw
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
}

/**
 * Case-insensitive hostname allowlist check.
 */
export function isAllowedHostname(
  hostname: string | undefined,
  allowedHostnames: string[],
): boolean {
  if (!hostname) {
    return false;
  }
  return allowedHostnames.includes(hostname.toLowerCase());
}

/**
 * Evaluate a siteverify response against the action and hostname policy.
 *
 * Cloudflare's official test credentials (sitekey/secret starting with
 * `1x`/`2x`) return `success: true` with `hostname: "example.com"` and NO
 * `action` field. The action check is relaxed ONLY when the response is
 * marked `metadata.result_with_testing_key === true`; the hostname allowlist
 * is still enforced so test traffic must explicitly allow `example.com`.
 */
export function evaluateTurnstileResult(
  result: TurnstileSiteVerifyResponse | null | undefined,
  allowedHostnames: string[],
): TurnstileEvaluation {
  if (!result || typeof result !== 'object') {
    return { ok: false, reason: 'invalid_response' };
  }

  if (result.success !== true) {
    return { ok: false, reason: 'verification_failed' };
  }

  const testingKey = result.metadata?.result_with_testing_key === true;

  if (!testingKey && result.action !== TURNSTILE_ACTION) {
    return { ok: false, reason: 'wrong_action' };
  }

  if (!isAllowedHostname(result.hostname, allowedHostnames)) {
    return { ok: false, reason: 'wrong_hostname' };
  }

  return {
    ok: true,
    hostname: result.hostname as string,
    action: result.action,
    testingKey,
  };
}

/**
 * Verify a Turnstile widget token against the siteverify endpoint and apply
 * the action + hostname policy. The fetcher is injectable for tests.
 */
export async function verifyTurnstileToken(
  token: string,
  options: TurnstileVerifyOptions = {},
): Promise<TurnstileEvaluation> {
  const {
    fetcher = fetch,
    secretKey = process.env.TURNSTILE_SECRET_KEY,
    allowedHostnames,
    remoteIp,
    timeoutMs = 5000,
  } = options;

  if (!secretKey || secretKey.trim() === '') {
    return { ok: false, reason: 'missing_config' };
  }

  const hostnames = allowedHostnames ?? getAllowedHostnames();
  if (hostnames.length === 0) {
    return { ok: false, reason: 'missing_config' };
  }

  const params = new URLSearchParams({ secret: secretKey, response: token });
  if (remoteIp) {
    params.set('remoteip', remoteIp);
  }

  let response: Response;
  try {
    response = await fetcher(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      return { ok: false, reason: 'siteverify_timeout' };
    }
    return { ok: false, reason: 'network_error' };
  }

  if (!response.ok) {
    return { ok: false, reason: 'network_error' };
  }

  let body: TurnstileSiteVerifyResponse;
  try {
    body = (await response.json()) as TurnstileSiteVerifyResponse;
  } catch {
    return { ok: false, reason: 'invalid_response' };
  }

  return evaluateTurnstileResult(body, hostnames);
}
