const REQUIRED = ['PROD_DB_URL', 'CRON_SECRET'];
const OPTIONAL = ['SLACK_WEBHOOK_URL', 'R2_BRIDGE_URL'];

export function buildBackupContainerEnv(env) {
  const missing = REQUIRED.filter((name) => !env[name]);
  if (missing.length > 0) {
    throw new Error(`Backup is missing required environment variables: ${missing.join(', ')}`);
  }

  return Object.fromEntries(
    [...REQUIRED, ...OPTIONAL]
      .filter((name) => typeof env[name] === 'string' && env[name].length > 0)
      .map((name) => [name, env[name]]),
  );
}
