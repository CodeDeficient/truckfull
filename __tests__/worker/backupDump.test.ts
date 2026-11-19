import { describe, expect, it } from '@jest/globals';
import {
  DATA_EXCLUDE,
  DATA_EXCLUDE_TABLES,
  DATA_POSTAMBLE,
  DATA_PREAMBLE,
  SCHEMA_EXCLUDE,
  buildDataDumpArgs,
  buildPgEnv,
  buildSchemaDumpArgs,
  transformDataLine,
  transformSchemaLine,
} from '../../worker/backupDump.mjs';

const DB_URL = 'postgresql://postgres.ref:s3cret@host.example:6543/postgres';

describe('pg environment', () => {
  it('turns a connection string into PG variables without exposing it in argv', () => {
    expect(buildPgEnv(DB_URL)).toEqual({
      PGHOST: 'host.example',
      PGPORT: '6543',
      PGUSER: 'postgres.ref',
      PGPASSWORD: 's3cret',
      PGDATABASE: 'postgres',
    });
  });

  it('decodes percent-encoded credentials', () => {
    expect(
      buildPgEnv('postgresql://postgres.ref:pa%40ss%3Aword@host.example:5432/mydb').PGPASSWORD,
    ).toBe('pa@ss:word');
  });

  it('defaults the port when the connection string omits it', () => {
    expect(buildPgEnv('postgresql://postgres.ref:x@host.example/postgres').PGPORT).toBe('5432');
  });
});

describe('backup dump arguments', () => {
  it('replicates the schema dump flags used by the weekly workflow', () => {
    const args = buildSchemaDumpArgs();
    expect(args).toContain('--schema-only');
    expect(args).toContain('--quote-all-identifier');
    expect(args).toContain('--no-password');
    expect(args[args.indexOf('--role') + 1]).toBe('postgres');
    expect(args[args.indexOf('--exclude-schema') + 1]).toBe(SCHEMA_EXCLUDE);
  });

  it('never carries the connection string in process arguments', () => {
    expect(buildSchemaDumpArgs().join(' ')).not.toContain('postgresql://');
    expect(buildDataDumpArgs().join(' ')).not.toContain('postgresql://');
  });

  it('replicates the data dump flags including platform table exclusions', () => {
    const args = buildDataDumpArgs();
    expect(args).toContain('--data-only');
    expect(args).toContain('--column-inserts');
    expect(args[args.indexOf('--rows-per-insert') + 1]).toBe('100000');
    expect(args[args.indexOf('--schema') + 1]).toBe('*');
    expect(args[args.indexOf('--exclude-schema') + 1]).toBe(DATA_EXCLUDE);
    for (const table of DATA_EXCLUDE_TABLES) {
      expect(args).toEqual(expect.arrayContaining(['--exclude-table', table]));
    }
  });
});

describe('schema transform', () => {
  it('makes schema, table and sequence creation tolerant of repeated restores', () => {
    expect(transformSchemaLine('CREATE TABLE "public"."food_trucks" (')).toBe(
      'CREATE TABLE IF NOT EXISTS "public"."food_trucks" (',
    );
    expect(transformSchemaLine('CREATE SCHEMA "private";')).toBe(
      'CREATE SCHEMA IF NOT EXISTS "private";',
    );
    expect(transformSchemaLine('CREATE SEQUENCE "public"."ids"')).toBe(
      'CREATE SEQUENCE IF NOT EXISTS "public"."ids"',
    );
  });

  it('makes functions, views and triggers replaceable on restore', () => {
    expect(transformSchemaLine('CREATE FUNCTION "public"."f"() RETURNS void')).toBe(
      'CREATE OR REPLACE FUNCTION "public"."f"() RETURNS void',
    );
    expect(transformSchemaLine('CREATE VIEW "public"."v" AS')).toBe(
      'CREATE OR REPLACE VIEW "public"."v" AS',
    );
    expect(transformSchemaLine('CREATE TRIGGER "t" BEFORE INSERT ON "public"."x"')).toBe(
      'CREATE OR REPLACE TRIGGER "t" BEFORE INSERT ON "public"."x"',
    );
  });

  it('drops psql meta commands and original dump comments', () => {
    expect(transformSchemaLine('\\restrict abc123')).toBeNull();
    expect(transformSchemaLine('\\unrestrict abc123')).toBeNull();
    expect(transformSchemaLine('-- PostgreSQL database dump')).toBeNull();
    expect(transformSchemaLine('')).toBe('');
  });

  it('drops platform-managed objects instead of emitting them', () => {
    expect(transformSchemaLine('CREATE EVENT TRIGGER "issue_graphql_placeholder"')).toBeNull();
    expect(transformSchemaLine('         WHEN TAG IN (\'CREATE FUNCTION\')')).toBeNull();
    expect(transformSchemaLine('   EXECUTE FUNCTION "graphql"."function_wrapper"()')).toBeNull();
    expect(transformSchemaLine('ALTER EVENT TRIGGER "issue_graphql_placeholder" ENABLE')).toBeNull();
    expect(
      transformSchemaLine('CREATE PUBLICATION "supabase_realtime" FOR ALL TABLES WITH (publish = \'insert\')'),
    ).toBeNull();
    expect(
      transformSchemaLine('ALTER PUBLICATION "supabase_realtime_source" OWNER TO postgres'),
    ).toBeNull();
    expect(transformSchemaLine('ALTER FOREIGN DATA WRAPPER "wrappers" OWNER TO postgres')).toBeNull();
    expect(
      transformSchemaLine('ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA public GRANT ALL ON TABLES TO postgres'),
    ).toBeNull();
    expect(
      transformSchemaLine('GRANT ALL ON FOREIGN DATA WRAPPER "wrappers" TO "postgres" WITH GRANT OPTION'),
    ).toBeNull();
    expect(transformSchemaLine('COMMENT ON EXTENSION "pgmq" IS \'extension\';')).toBeNull();
    expect(transformSchemaLine('CREATE POLICY "cron_job_select" ON "cron"."job" FOR SELECT USING (true)')).toBeNull();
    expect(transformSchemaLine('ALTER TABLE "cron"."job" OWNER TO postgres')).toBeNull();
    expect(transformSchemaLine('SET transaction_timeout = 0;')).toBeNull();
  });

  it('drops grants and revokes that touch internal schemas but keeps public ones', () => {
    expect(transformSchemaLine('GRANT ALL ON SCHEMA "auth" TO "anon"')).toBeNull();
    expect(transformSchemaLine('REVOKE ALL ON SCHEMA "storage" FROM "public"')).toBeNull();
    expect(transformSchemaLine('GRANT ALL ON SCHEMA "public" TO "anon"')).toBe(
      'GRANT ALL ON SCHEMA "public" TO "anon"',
    );
    expect(transformSchemaLine('GRANT ALL ON TABLE "public"."food_trucks" TO "anon"')).toBe(
      'GRANT ALL ON TABLE "public"."food_trucks" TO "anon"',
    );
  });

  it('reduces managed extension creation to its bare statement', () => {
    expect(
      transformSchemaLine('CREATE EXTENSION IF NOT EXISTS "pgmq" WITH SCHEMA "pgmq";'),
    ).toBe('CREATE EXTENSION IF NOT EXISTS "pgmq";');
    expect(
      transformSchemaLine('CREATE EXTENSION IF NOT EXISTS "pgsodium" WITH SCHEMA "pgsodium";'),
    ).toBe('CREATE EXTENSION IF NOT EXISTS "pgsodium";');
    expect(
      transformSchemaLine('CREATE EXTENSION IF NOT EXISTS "pg_tle" WITH SCHEMA "pgtle";'),
    ).toBe('CREATE EXTENSION IF NOT EXISTS "pg_tle";');
  });

  it('leaves ordinary statements untouched', () => {
    expect(transformSchemaLine('ALTER TABLE ONLY "public"."t" ADD CONSTRAINT "pk" PRIMARY KEY (id);')).toBe(
      'ALTER TABLE ONLY "public"."t" ADD CONSTRAINT "pk" PRIMARY KEY (id);',
    );
    expect(transformSchemaLine('SELECT pg_catalog.set_config(\'search_path\', \'\', false);')).toBe(
      'SELECT pg_catalog.set_config(\'search_path\', \'\', false);',
    );
  });
});

describe('data transform', () => {
  it('comments psql restrict meta commands without dropping sql comments', () => {
    expect(transformDataLine('\\restrict abc123')).toBe('-- \\restrict abc123');
    expect(transformDataLine('\\unrestrict abc123')).toBe('-- \\unrestrict abc123');
    expect(transformDataLine('-- Data for Name: food_trucks; Type: TABLE DATA')).toBe(
      '-- Data for Name: food_trucks; Type: TABLE DATA',
    );
  });

  it('keeps ordinary data statements with their embedded comments', () => {
    expect(transformDataLine("INSERT INTO \"public\".\"t\" VALUES ('a--b');")).toBe(
      "INSERT INTO \"public\".\"t\" VALUES ('a--b');",
    );
  });

  it('wraps the dump with replica session settings so row inserts apply verbatim', () => {
    expect(DATA_PREAMBLE).toContain('SET session_replication_role = replica;');
    expect(DATA_POSTAMBLE).toContain('RESET ALL;');
  });
});
