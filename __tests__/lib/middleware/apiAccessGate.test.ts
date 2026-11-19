/**
 * @jest-environment node
 */

import { describe, it, expect } from '@jest/globals';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { decideApiAccess, findApiRouteRule, type ApiGateRequest } from '@/lib/middleware/apiAccessGate';
import { API_ROUTE_ALLOWLIST } from '@/lib/middleware/apiRouteAllowlist';

const API_DIR = join(process.cwd(), 'app', 'api');

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return routeFiles(full);
    return /^route\.tsx?$/.test(entry) ? [full] : [];
  });
}

function exportedMethods(file: string): Set<string> {
  const source = readFileSync(file, 'utf8');
  const found = source.match(/export\s+(?:async\s+)?(?:function|const)\s+(GET|POST|PUT|PATCH|DELETE)\b/g) ?? [];
  return new Set(found.map((match) => match.split(/\s+/).pop() ?? ''));
}

const ROUTES = new Map(
  routeFiles(API_DIR).map((file) => {
    const dir = relative(API_DIR, file).split(sep).slice(0, -1).join('/');
    return [`/api/${dir}`, exportedMethods(file)] as const;
  }),
);

function request(overrides: Partial<ApiGateRequest>): ApiGateRequest {
  return {
    pathname: '/api/trucks/public',
    method: 'GET',
    headers: new Headers(),
    cookieNames: [],
    cronSecret: 'cron-test-secret',
    ...overrides,
  };
}

describe('API route allowlist', () => {
  it('lists each path once', () => {
    const paths = API_ROUTE_ALLOWLIST.map((rule) => rule.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it.each(API_ROUTE_ALLOWLIST.map((rule) => [rule.path, rule] as const))(
    '%s points at a route file that exports every allowed method',
    (path, rule) => {
      const methods = ROUTES.get(path);
      expect(methods).toBeDefined();
      for (const method of Object.keys(rule.methods)) {
        expect(methods?.has(method)).toBe(true);
      }
    },
  );
});

describe('route files shadowed by a dynamic rule', () => {
  it.each([...ROUTES.keys()].map((path) => [path] as const))(
    '%s is not silently covered by a different rule',
    (path) => {
      const rule = findApiRouteRule(path);
      if (rule) expect(rule.path).toBe(path);
    },
  );
});

describe('decideApiAccess', () => {
  it('returns not_found for a route that is not listed', () => {
    expect(decideApiAccess(request({ pathname: '/api/reviews', method: 'POST' }))).toBe('not_found');
    expect(decideApiAccess(request({ pathname: '/api/brand-new-endpoint' }))).toBe('not_found');
  });

  it('returns not_found for a method that is not listed on a listed route', () => {
    expect(decideApiAccess(request({ pathname: '/api/trucks/public', method: 'DELETE' }))).toBe('not_found');
  });

  it('allows public routes without credentials', () => {
    expect(decideApiAccess(request({}))).toBe('allow');
    expect(decideApiAccess(request({ method: 'HEAD' }))).toBe('allow');
    expect(decideApiAccess(request({ pathname: '/api/trucks/public/' }))).toBe('allow');
  });

  it('prefers a static segment over a dynamic one', () => {
    expect(findApiRouteRule('/api/trucks/public')?.path).toBe('/api/trucks/public');
    expect(findApiRouteRule('/api/trucks/abc-123')?.path).toBe('/api/trucks/[id]');
  });

  it('does not let a dynamic segment span several path segments', () => {
    expect(findApiRouteRule('/api/trucks/a/b/menu')).toBeNull();
  });

  it('requires a session cookie or bearer token for session routes', () => {
    const owner = { pathname: '/api/owner/trucks', method: 'GET' };
    expect(decideApiAccess(request(owner))).toBe('unauthorized');
    expect(decideApiAccess(request({ ...owner, cookieNames: ['sb-abc-auth-token'] }))).toBe('allow');
    expect(decideApiAccess(request({ ...owner, cookieNames: ['sb-abc-auth-token.0'] }))).toBe('allow');
    expect(decideApiAccess(request({ ...owner, cookieNames: ['other'] }))).toBe('unauthorized');
    const bearer = new Headers({ authorization: 'Bearer token' });
    expect(decideApiAccess(request({ ...owner, headers: bearer }))).toBe('allow');
  });

  it('requires the cron secret for cron routes', () => {
    const cron = { pathname: '/api/cron/recover-stuck-posts', method: 'POST' };
    const good = new Headers({ authorization: 'Bearer cron-test-secret' });
    const bad = new Headers({ authorization: 'Bearer wrong' });
    expect(decideApiAccess(request({ ...cron, headers: good }))).toBe('allow');
    expect(decideApiAccess(request({ ...cron, headers: bad }))).toBe('not_found');
    expect(decideApiAccess(request({ ...cron }))).toBe('not_found');
    expect(decideApiAccess(request({ ...cron, headers: good, cronSecret: undefined }))).toBe('not_found');
  });

  it('allows OPTIONS only on listed routes', () => {
    expect(decideApiAccess(request({ method: 'OPTIONS' }))).toBe('allow');
    expect(decideApiAccess(request({ pathname: '/api/reviews', method: 'OPTIONS' }))).toBe('not_found');
  });
});
