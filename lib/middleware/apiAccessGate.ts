import {
  API_ROUTE_ALLOWLIST,
  type ApiAccess,
  type ApiMethod,
  type ApiRouteRule,
} from '@/lib/middleware/apiRouteAllowlist';

export type ApiGateRequest = {
  readonly pathname: string;
  readonly method: string;
  readonly headers: Headers;
  readonly cookieNames: readonly string[];
  readonly cronSecret: string | undefined;
};

type CompiledRule = {
  readonly rule: ApiRouteRule;
  readonly segments: readonly (string | null)[];
  readonly dynamicSegments: number;
};

const encoder = new TextEncoder();
const SESSION_COOKIE = /^sb-[^.]+-auth-token(?:\.\d+)?$/;

function isDynamicSegment(segment: string): boolean {
  return segment.startsWith('[') && segment.endsWith(']');
}

function compileRule(rule: ApiRouteRule): CompiledRule {
  const segments = rule.path.split('/').map((segment) => (isDynamicSegment(segment) ? null : segment));
  return { rule, segments, dynamicSegments: segments.filter((segment) => segment === null).length };
}

const COMPILED = API_ROUTE_ALLOWLIST.map((rule) => compileRule(rule)).sort(
  (a, b) => a.dynamicSegments - b.dynamicSegments,
);

function trimTrailingSlashes(pathname: string): string {
  let end = pathname.length;
  while (end > 1 && pathname[end - 1] === '/') end -= 1;
  return pathname.slice(0, end);
}

function matches(compiled: CompiledRule, parts: readonly string[]): boolean {
  if (compiled.segments.length !== parts.length) return false;
  return compiled.segments.every((segment, index) =>
    segment === null ? parts[index].length > 0 : segment === parts[index],
  );
}

export function findApiRouteRule(pathname: string): ApiRouteRule | null {
  const parts = trimTrailingSlashes(pathname).split('/');
  return COMPILED.find((compiled) => matches(compiled, parts))?.rule ?? null;
}

function constantTimeEquals(provided: string, expected: string): boolean {
  const providedBytes = encoder.encode(provided);
  const expectedBytes = encoder.encode(expected);
  if (providedBytes.length !== expectedBytes.length) return false;
  let difference = 0;
  for (const [index, byte] of expectedBytes.entries()) {
    difference |= providedBytes[index] ^ byte;
  }
  return difference === 0;
}

function accessFor(rule: ApiRouteRule, method: string): ApiAccess | null {
  const effective = method === 'HEAD' ? 'GET' : method;
  return rule.methods[effective as ApiMethod] ?? null;
}

function hasSessionCredential(request: ApiGateRequest): boolean {
  if (request.headers.get('authorization')?.startsWith('Bearer ')) return true;
  return request.cookieNames.some((name) => SESSION_COOKIE.test(name));
}

function hasCronCredential(request: ApiGateRequest): boolean {
  if (!request.cronSecret) return false;
  const provided = request.headers.get('authorization') ?? '';
  return constantTimeEquals(provided, `Bearer ${request.cronSecret}`);
}

export type ApiAccessDecision = 'allow' | 'not_found' | 'unauthorized';

export function decideApiAccess(request: ApiGateRequest): ApiAccessDecision {
  const rule = findApiRouteRule(request.pathname);
  if (!rule) return 'not_found';
  if (request.method === 'OPTIONS') return 'allow';
  const access = accessFor(rule, request.method);
  if (!access) return 'not_found';
  if (access === 'session' && !hasSessionCredential(request)) return 'unauthorized';
  if (access === 'cron' && !hasCronCredential(request)) return 'not_found';
  return 'allow';
}
