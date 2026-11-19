export const KEEP_COMPLETE_SETS = 4;

const ARTIFACT_PATTERN = /^backups\/(\d{8})\/([^/]+)$/;

function artifactName(date, kind) {
  if (kind === 'schema') return `schema_${date}.sql.gz`;
  if (kind === 'data') return `data_${date}.sql.gz`;
  return 'manifest.json';
}

function keyFor(date, kind) {
  return `backups/${date}/${artifactName(date, kind)}`;
}

export function parseBackupKeys(keys) {
  const sets = new Map();

  for (const key of keys) {
    const match = key.match(ARTIFACT_PATTERN);
    if (!match) continue;
    const [, date, name] = match;
    const set = sets.get(date) ?? { date, schema: false, data: false, manifest: false };
    switch (name) {
      case `schema_${date}.sql.gz`: {
        set.schema = true;
        break;
      }
      case `data_${date}.sql.gz`: {
        set.data = true;
        break;
      }
      case 'manifest.json': {
        set.manifest = true;
        break;
      }
      default: {
        continue;
      }
    }
    sets.set(date, set);
  }

  for (const set of sets.values()) {
    set.complete = set.schema && set.data && set.manifest;
  }

  return sets;
}

export function planRetention(keys) {
  const sets = parseBackupKeys(keys);
  const completeDates = [...sets.values()]
    .filter((set) => set.complete)
    .map((set) => set.date)
    .sort((a, b) => b.localeCompare(a));

  const expiredDates = completeDates.slice(KEEP_COMPLETE_SETS);
  return expiredDates.flatMap((date) => [
    keyFor(date, 'schema'),
    keyFor(date, 'data'),
    keyFor(date, 'manifest'),
  ]);
}

function utcDateStamp(now) {
  return now.toISOString().slice(0, 10).replaceAll('-', '');
}

async function uploadAndVerify(deps, key, body) {
  const uploaded = await deps.upload(key, body);
  const listed = await deps.head(key);
  const expectedSize = uploaded?.size ?? body.length;
  if (!listed || listed.size !== expectedSize) {
    throw new Error(
      `Upload verification failed for ${key}: expected ${expectedSize} bytes, found ${listed?.size ?? 'no object'}`,
    );
  }
  return { key, size: body.length, sha256: await deps.sha256(body) };
}

export async function runBackup(deps) {
  const date = utcDateStamp(deps.now());
  const schemaKey = keyFor(date, 'schema');
  const dataKey = keyFor(date, 'data');
  const manifestKey = keyFor(date, 'manifest');

  const schema = await deps.produceSchema();
  const schemaEntry = await uploadAndVerify(deps, schemaKey, schema);

  const data = await deps.produceData();
  const dataEntry = await uploadAndVerify(deps, dataKey, data);

  const manifest = {
    date,
    createdAt: deps.now().toISOString(),
    schema: schemaEntry,
    data: dataEntry,
  };
  await uploadAndVerify(deps, manifestKey, Buffer.from(JSON.stringify(manifest, null, 2)));

  const deleted = planRetention(await deps.list());
  if (deleted.length > 0) await deps.deleteObjects(deleted);

  return { outcome: 'completed', date, deleted };
}
