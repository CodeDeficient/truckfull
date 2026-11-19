export const BEHAVIOR_LIMITS = Object.freeze({
  ipWindowMs: 10_000,
  groupWindowMs: 60 * 60_000,
  groupBurstWindowMs: 3 * 60_000,
  samePageLimit: 12,
  minIps: 12,
  minPages: 10,
  minBurstPages: 3,
  groupBlockMs: 15 * 60_000,
  banBatchSize: 32,
});

const SCHEMA = [
  'CREATE TABLE IF NOT EXISTS events (ts INTEGER NOT NULL, ip TEXT NOT NULL, path TEXT NOT NULL)',
  'CREATE INDEX IF NOT EXISTS ts_idx ON events(ts)',
  'CREATE INDEX IF NOT EXISTS ip_path_idx ON events(ip, path, ts)',
  'CREATE TABLE IF NOT EXISTS state (name TEXT PRIMARY KEY, value INTEGER NOT NULL)',
  'CREATE TABLE IF NOT EXISTS pending_bans (ip TEXT PRIMARY KEY)',
  'CREATE TABLE IF NOT EXISTS banned_ips (ip TEXT PRIMARY KEY)',
];
const SINGLE_PAGE_IPS =
  'SELECT COUNT(*) AS n FROM (SELECT ip FROM events GROUP BY ip HAVING COUNT(DISTINCT path) = 1)';
const SINGLE_PAGE_BURST_IPS =
  'SELECT COUNT(*) AS n FROM (SELECT ip FROM events WHERE ts >= ? GROUP BY ip HAVING COUNT(DISTINCT path) = 1)';

export function initializeSchema(sql) {
  for (const statement of SCHEMA) sql.exec(statement);
}

function stateValue(sql, name) {
  return sql.exec('SELECT value FROM state WHERE name = ?', name).toArray()[0]?.value;
}

function activeGroupBlock(sql, ip, now) {
  const until = stateValue(sql, 'block_until');
  if (until === undefined) return false;
  if (until > now) {
    sql.exec('INSERT OR IGNORE INTO pending_bans(ip) VALUES (?)', ip);
    return true;
  }
  sql.exec('DELETE FROM state WHERE name = ?', 'block_until');
  return false;
}

function ipVerdict(sql, ip, path, now) {
  const row = sql
    .exec(
      'SELECT COUNT(*) AS n FROM events WHERE ip = ? AND path = ? AND ts >= ?',
      ip,
      path,
      now - BEHAVIOR_LIMITS.ipWindowMs,
    )
    .one();
  return { block: row.n > BEHAVIOR_LIMITS.samePageLimit, reason: 'rapid-same-page' };
}

function coordinatedMatch(sql, now) {
  const limits = BEHAVIOR_LIMITS;
  const burstStart = now - limits.groupBurstWindowMs;
  const all = sql
    .exec('SELECT COUNT(DISTINCT ip) AS ips, COUNT(DISTINCT path) AS paths FROM events')
    .one();
  const singles = sql.exec(SINGLE_PAGE_IPS).one().n;
  const burst = sql
    .exec(
      'SELECT COUNT(DISTINCT ip) AS ips, COUNT(DISTINCT path) AS paths FROM events WHERE ts >= ?',
      burstStart,
    )
    .one();
  const burstSingles = sql.exec(SINGLE_PAGE_BURST_IPS, burstStart).one().n;
  return {
    group:
      all.ips >= limits.minIps &&
      all.paths >= limits.minPages &&
      singles >= Math.ceil(all.ips * 0.8),
    burst:
      burst.ips >= limits.minIps &&
      burst.paths >= limits.minBurstPages &&
      burstSingles >= Math.ceil(burst.ips * 0.8),
  };
}

function groupVerdict(sql, now) {
  const match = coordinatedMatch(sql, now);
  const block = match.group || match.burst;
  if (block) {
    if (match.group) {
      sql.exec('INSERT OR IGNORE INTO pending_bans(ip) SELECT DISTINCT ip FROM events');
    } else {
      sql.exec(
        'INSERT OR IGNORE INTO pending_bans(ip) SELECT DISTINCT ip FROM events WHERE ts >= ?',
        now - BEHAVIOR_LIMITS.groupBurstWindowMs,
      );
    }
    sql.exec('DELETE FROM events');
    sql.exec(
      'INSERT OR REPLACE INTO state(name, value) VALUES (?, ?)',
      'block_until',
      now + BEHAVIOR_LIMITS.groupBlockMs,
    );
  }
  return { block, reason: 'coordinated-pattern' };
}

export function recordBehavior(sql, mode, ip, path, now) {
  const window = mode === 'ip' ? BEHAVIOR_LIMITS.ipWindowMs : BEHAVIOR_LIMITS.groupWindowMs;
  sql.exec('INSERT OR IGNORE INTO state(name, value) VALUES (?, ?)', 'window_ms', window);
  if (mode === 'group' && activeGroupBlock(sql, ip, now)) {
    return { block: true, reason: 'coordinated-pattern', cleanupAt: now + 1000 };
  }
  sql.exec('DELETE FROM events WHERE ts < ?', now - window);
  sql.exec('INSERT INTO events (ts, ip, path) VALUES (?, ?, ?)', now, ip, path);
  const verdict = mode === 'ip' ? ipVerdict(sql, ip, path, now) : groupVerdict(sql, now);
  const cleanupAt = now + (mode === 'group' && verdict.block ? 1000 : window + 1000);
  return { ...verdict, cleanupAt };
}

export function pendingBanBatch(sql) {
  return sql
    .exec('SELECT ip FROM pending_bans LIMIT ?', BEHAVIOR_LIMITS.banBatchSize)
    .toArray()
    .map((row) => row.ip);
}

export function clearPendingBan(sql, ip) {
  sql.exec('DELETE FROM pending_bans WHERE ip = ?', ip);
}

function count(sql, query) {
  return sql.exec(query).one().n;
}

export function planAfterAlarm(sql, now, failedBans, relayInitialized) {
  const window = stateValue(sql, 'window_ms') ?? BEHAVIOR_LIMITS.groupWindowMs;
  sql.exec('DELETE FROM events WHERE ts < ?', now - window);
  sql.exec('DELETE FROM state WHERE name = ? AND value <= ?', 'block_until', now);
  const oldest = sql.exec('SELECT MIN(ts) AS ts FROM events').one().ts;
  const until = sql
    .exec('SELECT MAX(value) AS value FROM state WHERE name = ?', 'block_until')
    .one().value;
  const queued = count(sql, 'SELECT COUNT(*) AS n FROM pending_bans');
  if (oldest === null && until === null && queued === 0) {
    const banned = count(sql, 'SELECT COUNT(*) AS n FROM banned_ips');
    const relayRanges = relayInitialized ? count(sql, 'SELECT COUNT(*) AS n FROM relay_ranges') : 0;
    return { deleteAll: !banned && !relayRanges, nextAlarm: null };
  }
  const eventCleanup = oldest === null ? Infinity : oldest + window + 1000;
  const blockCleanup = until === null ? Infinity : until + 1000;
  const banCleanup = queued === 0 ? Infinity : now + (failedBans ? 30_000 : 1000);
  return {
    deleteAll: false,
    nextAlarm: Math.max(now + 1000, Math.min(eventCleanup, blockCleanup, banCleanup)),
  };
}
