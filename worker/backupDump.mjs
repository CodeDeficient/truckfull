const LEADING_SLASH = /^\//;
const RESTRICT_DIRECTIVE = /^\\(un)?restrict /;

const MANAGED_EXTENSIONS = ['pg_tle', 'pgsodium', 'pgmq'];

const SCHEMA_CREATE_REPLACEMENTS = [
  [/^CREATE SCHEMA "/, 'CREATE SCHEMA IF NOT EXISTS "'],
  [/^CREATE TABLE "/, 'CREATE TABLE IF NOT EXISTS "'],
  [/^CREATE SEQUENCE "/, 'CREATE SEQUENCE IF NOT EXISTS "'],
  [/^CREATE VIEW "/, 'CREATE OR REPLACE VIEW "'],
  [/^CREATE FUNCTION "/, 'CREATE OR REPLACE FUNCTION "'],
  [/^CREATE TRIGGER "/, 'CREATE OR REPLACE TRIGGER "'],
];

const SCHEMA_DROP_PREFIXES = [
  /^\\(un)?restrict /,
  /^CREATE EVENT TRIGGER /,
  /^ {9}WHEN TAG IN /,
  /^ {3}EXECUTE FUNCTION /,
  /^ALTER EVENT TRIGGER /,
  /^CREATE PUBLICATION "supabase_realtime/,
  /^ALTER PUBLICATION "supabase_realtime_/,
  /^ALTER FOREIGN DATA WRAPPER .+ OWNER TO /,
  /^ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin"/,
  /^GRANT ALL ON FOREIGN DATA WRAPPER /,
  /^COMMENT ON EXTENSION /,
  /^CREATE POLICY "cron_job_/,
  /^ALTER TABLE "cron"/,
  /^SET transaction_timeout = 0;/,
  /^--/,
];

const INTERNAL_SCHEMA_ALTERNATION = [
  'information_schema',
  'pg_*',
  '_analytics',
  '_realtime',
  '_supavisor',
  'auth',
  'etl',
  'extensions',
  'pgbouncer',
  'realtime',
  'storage',
  'supabase_functions',
  'supabase_migrations',
  'cron',
  'dbdev',
  'graphql',
  'graphql_public',
  'net',
  'pgmq',
  'pgsodium',
  'pgsodium_masks',
  'pgtle',
  'repack',
  'tiger',
  'tiger_data',
  'timescaledb_*',
  '_timescaledb_*',
  'topology',
  'vault',
].join('|');

const SCHEMA_INTERNAL_GRANT_RE = new RegExp(
  `^(GRANT|REVOKE) .+ ON .+ "(${INTERNAL_SCHEMA_ALTERNATION})"`,
);

export const SCHEMA_EXCLUDE = [
  'information_schema|pg_*|_analytics|_realtime|_supavisor|auth|etl|extensions|pgbouncer|realtime|storage',
  'supabase_functions|supabase_migrations|cron|dbdev|graphql|graphql_public|net|pgmq|pgsodium',
  'pgsodium_masks|pgtle|repack|tiger|tiger_data|timescaledb_*|_timescaledb_*|topology|vault',
].join('|');

export const DATA_EXCLUDE = [
  'information_schema|pg_*|graphql|graphql_public|pgsodium|pgsodium_masks|pgtle|repack|tiger|tiger_data',
  'timescaledb_*|_timescaledb_*|topology|vault|etl|extensions|pgbouncer|realtime|supabase_migrations',
  '_analytics|_realtime|_supavisor',
].join('|');

export const DATA_EXCLUDE_TABLES = [
  'auth.schema_migrations',
  'storage.migrations',
  'supabase_functions.migrations',
];

export const DATA_PREAMBLE = 'SET session_replication_role = replica;\n';

export const DATA_POSTAMBLE = '\nRESET ALL;\n';

export function buildPgEnv(dbUrl) {
  const url = new URL(dbUrl);
  if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
    throw new Error(`Unsupported database URL protocol: ${url.protocol}`);
  }
  if (!url.hostname) throw new Error('Database URL is missing a host');
  return {
    PGHOST: url.hostname,
    PGPORT: url.port || '5432',
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: url.pathname.replace(LEADING_SLASH, '') || 'postgres',
  };
}

export function buildSchemaDumpArgs() {
  return [
    'pg_dump',
    '--schema-only',
    '--quote-all-identifier',
    '--role',
    'postgres',
    '--exclude-schema',
    SCHEMA_EXCLUDE,
    '--no-password',
  ];
}

export function buildDataDumpArgs() {
  const args = [
    'pg_dump',
    '--data-only',
    '--quote-all-identifier',
    '--role',
    'postgres',
    '--exclude-schema',
    DATA_EXCLUDE,
  ];
  for (const table of DATA_EXCLUDE_TABLES) {
    args.push('--exclude-table', table);
  }
  args.push('--schema', '*', '--column-inserts', '--rows-per-insert', '100000', '--no-password');
  return args;
}

export function transformSchemaLine(line) {
  if (SCHEMA_DROP_PREFIXES.some((pattern) => pattern.test(line))) return null;
  if (SCHEMA_INTERNAL_GRANT_RE.test(line)) return null;

  for (const extension of MANAGED_EXTENSIONS) {
    const managed = new RegExp(`^(CREATE EXTENSION IF NOT EXISTS "${extension}").+$`);
    const match = line.match(managed);
    if (match) return `${match[1]};`;
  }

  for (const [pattern, replacement] of SCHEMA_CREATE_REPLACEMENTS) {
    if (pattern.test(line)) return line.replace(pattern, replacement);
  }

  return line;
}

export function transformDataLine(line) {
  return RESTRICT_DIRECTIVE.test(line) ? `-- ${line}` : line;
}
