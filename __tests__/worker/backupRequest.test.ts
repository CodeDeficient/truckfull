import { describe, expect, it } from '@jest/globals';
import { validateBackupRequest } from '../../worker/backupRequest.mjs';

const enabled = { BACKUP_ENABLED: 'true', CRON_SECRET: 'secret' };

describe('validateBackupRequest', () => {
  it('refuses to wake the container while backups are disabled', () => {
    expect(
      validateBackupRequest('POST', '/run', 'Bearer secret', { ...enabled, BACKUP_ENABLED: 'false' }),
    ).toBe(503);
    expect(
      validateBackupRequest('POST', '/run', 'Bearer secret', { ...enabled, BACKUP_ENABLED: undefined }),
    ).toBe(503);
  });

  it('allows only an authenticated read-only status probe while disabled', () => {
    const disabled = { ...enabled, BACKUP_ENABLED: 'false' };
    expect(validateBackupRequest('GET', '/status', 'Bearer secret', disabled)).toBe(200);
    expect(validateBackupRequest('GET', '/status', 'Bearer wrong', disabled)).toBe(401);
    expect(validateBackupRequest('GET', '/status', undefined, disabled)).toBe(401);
    expect(validateBackupRequest('POST', '/status', 'Bearer secret', disabled)).toBe(503);
  });

  it('rejects unauthorized manual triggers', () => {
    expect(validateBackupRequest('POST', '/run', 'Bearer wrong', enabled)).toBe(401);
    expect(validateBackupRequest('POST', '/run', undefined, enabled)).toBe(401);
    expect(validateBackupRequest('POST', '/run', 'Bearer ', enabled)).toBe(401);
  });

  it('only permits authenticated run and status requests', () => {
    expect(validateBackupRequest('POST', '/run', 'Bearer secret', enabled)).toBe(200);
    expect(validateBackupRequest('GET', '/status', 'Bearer secret', enabled)).toBe(200);
    expect(validateBackupRequest('GET', '/run', 'Bearer secret', enabled)).toBe(405);
    expect(validateBackupRequest('POST', '/status', 'Bearer secret', enabled)).toBe(405);
    expect(validateBackupRequest('POST', '/other', 'Bearer secret', enabled)).toBe(404);
  });
});
