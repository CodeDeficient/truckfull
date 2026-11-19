import { describe, expect, it } from '@jest/globals';
import { buildBackupContainerEnv } from '../../worker/backupConfig.mjs';

const env = {
  PROD_DB_URL: 'postgresql://postgres.ref:secret@host:5432/postgres',
  CRON_SECRET: 'cron-token',
  SLACK_WEBHOOK_URL: 'https://hooks.example/services/x',
  R2_BRIDGE_URL: 'http://r2.bridge',
};

describe('buildBackupContainerEnv', () => {
  it('forwards the database URL and run secret into the container', () => {
    expect(buildBackupContainerEnv(env)).toMatchObject({
      PROD_DB_URL: env.PROD_DB_URL,
      CRON_SECRET: 'cron-token',
    });
  });

  it('rejects a container start without the database URL or run secret', () => {
    expect(() => buildBackupContainerEnv({ ...env, PROD_DB_URL: '' })).toThrow('PROD_DB_URL');
    expect(() => buildBackupContainerEnv({ ...env, CRON_SECRET: '' })).toThrow('CRON_SECRET');
  });

  it('never forwards R2 credentials or unrelated Worker bindings', () => {
    const built = buildBackupContainerEnv({
      ...env,
      R2_ACCESS_KEY_ID: 'never-forward',
      R2_SECRET_ACCESS_KEY: 'never-forward',
      UNRELATED_SECRET: 'never-forward',
    });
    expect(built).not.toHaveProperty('R2_ACCESS_KEY_ID');
    expect(built).not.toHaveProperty('R2_SECRET_ACCESS_KEY');
    expect(built).not.toHaveProperty('UNRELATED_SECRET');
  });
});
