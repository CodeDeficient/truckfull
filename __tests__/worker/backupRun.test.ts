import { describe, expect, it, jest } from '@jest/globals';
import {
  KEEP_COMPLETE_SETS,
  parseBackupKeys,
  planRetention,
  runBackup,
} from '../../worker/backupRun.mjs';

const DATE = new Date('2026-09-29T06:00:00Z');

function keysFor(date) {
  return [
    `backups/${date}/schema_${date}.sql.gz`,
    `backups/${date}/data_${date}.sql.gz`,
    `backups/${date}/manifest.json`,
  ];
}

function createDeps(overrides = {}) {
  const uploads = [];
  const deleted = [];
  const sizes = new Map();

  const deps = {
    now: () => DATE,
    sha256: async (buffer) => `sha256:${buffer.length}`,
    produceSchema: async () => Buffer.from('gz:schema-body'),
    produceData: async () => Buffer.from('gz:data-body'),
    upload: async (key, body) => {
      uploads.push(key);
      sizes.set(key, body.length);
      return { key, size: body.length };
    },
    head: async (key) => ({ key, size: sizes.get(key) }),
    list: async () => [],
    deleteObjects: async (keys) => {
      deleted.push(...keys);
    },
    log: () => {},
    ...overrides,
  };

  deps.__uploads = uploads;
  deps.__deleted = deleted;
  return deps;
}

describe('parseBackupKeys', () => {
  it('groups artifacts by date and marks a set complete only with all three objects', () => {
    const sets = parseBackupKeys([
      ...keysFor('20260927'),
      ...keysFor('20260920'),
      'unrelated/file.txt',
    ]);

    expect(sets.get('20260927')).toMatchObject({ complete: true });
    expect(sets.get('20260920')).toMatchObject({ complete: true });
    expect(sets.has('unrelated')).toBe(false);
  });

  it('treats a set with a manifest but a missing artifact as incomplete', () => {
    const sets = parseBackupKeys([
      'backups/20260920/schema_20260920.sql.gz',
      'backups/20260920/manifest.json',
    ]);
    expect(sets.get('20260920')).toMatchObject({ complete: false });
  });
});

describe('planRetention', () => {
  it('keeps the newest four complete sets and expires the rest', () => {
    const keys = [
      ...keysFor('20260929'),
      ...keysFor('20260922'),
      ...keysFor('20260915'),
      ...keysFor('20260908'),
      ...keysFor('20260901'),
    ];
    expect(planRetention(keys)).toEqual(keysFor('20260901'));
    expect(KEEP_COMPLETE_SETS).toBe(4);
  });

  it('never expires incomplete sets or their artifacts', () => {
    const keys = [
      ...keysFor('20260929'),
      ...keysFor('20260922'),
      ...keysFor('20260915'),
      ...keysFor('20260908'),
      'backups/20260901/schema_20260901.sql.gz',
    ];
    expect(planRetention(keys)).toEqual([]);
  });

  it('does not count incomplete sets toward the retention limit', () => {
    const keys = [
      ...keysFor('20260929'),
      ...keysFor('20260922'),
      ...keysFor('20260915'),
      ...keysFor('20260908'),
      'backups/20260902/schema_20260902.sql.gz',
      ...keysFor('20260901'),
    ];
    expect(planRetention(keys)).toEqual(keysFor('20260901'));
  });

  it('preserves unrelated bucket objects', () => {
    expect(planRetention([...keysFor('20260929'), 'notes/readme.txt'])).toEqual([]);
  });
});

describe('runBackup', () => {
  it('uploads schema, then data, then the manifest last', async () => {
    const deps = createDeps();
    const result = await runBackup(deps);

    expect(result.outcome).toBe('completed');
    expect(result.date).toBe('20260929');
    expect(deps.__uploads).toEqual([
      'backups/20260929/schema_20260929.sql.gz',
      'backups/20260929/data_20260929.sql.gz',
      'backups/20260929/manifest.json',
    ]);
  });

  it('records sizes and checksums for both artifacts in the manifest', async () => {
    let manifestBody;
    const deps = createDeps();
    const upload = deps.upload;
    deps.upload = async (key, body) => {
      if (key.endsWith('manifest.json')) manifestBody = JSON.parse(body.toString());
      return upload(key, body);
    };

    const result = await runBackup(deps);
    expect(result.outcome).toBe('completed');
    expect(manifestBody).toMatchObject({
      date: '20260929',
      schema: {
        key: 'backups/20260929/schema_20260929.sql.gz',
        size: Buffer.from('gz:schema-body').length,
        sha256: `sha256:${Buffer.from('gz:schema-body').length}`,
      },
      data: {
        key: 'backups/20260929/data_20260929.sql.gz',
        size: Buffer.from('gz:data-body').length,
        sha256: `sha256:${Buffer.from('gz:data-body').length}`,
      },
    });
  });

  it('fails the run without writing a manifest when an uploaded object cannot be verified', async () => {
    const deps = createDeps({
      head: async (key) => ({ key, size: 999 }),
    });

    await expect(runBackup(deps)).rejects.toThrow(/verification/i);
    expect(deps.__uploads).not.toContain('backups/20260929/manifest.json');
  });

  it('fails the run without writing a manifest when the data dump fails', async () => {
    const deps = createDeps({
      produceData: async () => {
        throw new Error('pg_dump data failed');
      },
    });

    await expect(runBackup(deps)).rejects.toThrow('pg_dump data failed');
    expect(deps.__uploads).not.toContain('backups/20260929/manifest.json');
    expect(deps.__uploads).toContain('backups/20260929/schema_20260929.sql.gz');
  });

  it('expires only complete sets beyond the retention limit and reports deletions', async () => {
    const deps = createDeps({
      list: async () => [
        ...keysFor('20260929'),
        ...keysFor('20260922'),
        ...keysFor('20260915'),
        ...keysFor('20260908'),
        ...keysFor('20260901'),
        'backups/20260830/schema_20260830.sql.gz',
      ],
    });

    const result = await runBackup(deps);

    expect(deps.__deleted).toEqual(keysFor('20260901'));
    expect(result.deleted).toEqual(keysFor('20260901'));
    expect(deps.__deleted).not.toContain('backups/20260830/schema_20260830.sql.gz');
  });

  it('uses a UTC date stamp at run time', async () => {
    const deps = createDeps({ now: () => new Date('2026-12-31T23:59:00Z') });
    const result = await runBackup(deps);
    expect(result.date).toBe('20261231');
  });
});
