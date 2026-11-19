import { constantTimeEqual } from './searxngAuth.mjs';

export function validateBackupRequest(method, pathname, authorization, env) {
  if (env.BACKUP_ENABLED !== 'true' && !(pathname === '/status' && method === 'GET')) {
    return 503;
  }
  if (!constantTimeEqual(authorization, `Bearer ${env.CRON_SECRET ?? ''}`) || !env.CRON_SECRET) {
    return 401;
  }
  if (pathname !== '/run' && pathname !== '/status') return 404;
  if ((pathname === '/run' && method !== 'POST') || (pathname === '/status' && method !== 'GET')) {
    return 405;
  }
  return 200;
}
