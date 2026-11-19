import { compileRelayFeed, parseAddress } from './guardAddress.mjs';

export const RELAY_FEED = 'https://mask-api.icloud.com/egress-ip-ranges.csv';
export const RELAY_FRESH_MS = 5 * 60_000;
export const RELAY_RETRY_MS = 30_000;
export const RELAY_VERIFY_COALESCE_MS = 1000;

const DIGITS_ONLY = /^\d+$/;
const MIN_FEED_BYTES = 1_000_000;
const MAX_FEED_BYTES = 20_000_000;

function stateValue(sql, name) {
  return sql.exec('SELECT value FROM state WHERE name = ?', name).toArray()[0]?.value;
}

function markValidated(sql) {
  sql.exec(
    'INSERT OR REPLACE INTO state(name, value) VALUES (?, ?)',
    'relay_validated',
    Date.now(),
  );
  sql.exec('DELETE FROM state WHERE name = ?', 'relay_retry_after');
}

async function readFeedBody(response) {
  const tag = response.headers.get('etag');
  if (!tag || tag.length > 256) throw new Error('relay feed missing version');
  const sizeHeader = response.headers.get('content-length') || '';
  if (!DIGITS_ONLY.test(sizeHeader)) throw new Error('relay feed size unavailable');
  const declared = Number(sizeHeader);
  if (declared < MIN_FEED_BYTES || declared > MAX_FEED_BYTES) {
    throw new Error('relay feed size invalid');
  }
  const contents = await response.text();
  if (new TextEncoder().encode(contents).byteLength !== declared) {
    throw new Error('relay feed incomplete');
  }
  return { tag, feed: compileRelayFeed(contents) };
}

function storeFeed(storage, tag, feed) {
  const sql = storage.sql;
  storage.transactionSync(() => {
    sql.exec('DELETE FROM relay_ranges');
    for (const bits of [32, 128]) {
      const width = bits / 4;
      for (const [start, finish] of feed.ranges[bits]) {
        sql.exec(
          'INSERT INTO relay_ranges(bits, start, finish) VALUES (?, ?, ?)',
          bits,
          start.toString(16).padStart(width, '0'),
          finish.toString(16).padStart(width, '0'),
        );
      }
    }
    sql.exec('INSERT OR REPLACE INTO relay_meta(name, value) VALUES (?, ?)', 'etag', tag);
    markValidated(sql);
  });
}

function isFresh(validated, now) {
  const age = now - validated;
  return Boolean(validated) && age >= 0 && age < RELAY_FRESH_MS;
}

export class RelayRegistry {
  constructor({ storage, fetchImpl, waitUntil, initializeBase }) {
    this.storage = storage;
    this.fetchImpl = fetchImpl;
    this.waitUntil = waitUntil;
    this.initializeBase = initializeBase;
    this.initialized = false;
    this.refreshing = null;
  }

  initialize() {
    this.initializeBase();
    if (this.initialized) return;
    this.storage.sql.exec(
      'CREATE TABLE IF NOT EXISTS relay_ranges (bits INTEGER NOT NULL, start TEXT NOT NULL, finish TEXT NOT NULL, PRIMARY KEY(bits, start)) WITHOUT ROWID',
    );
    this.storage.sql.exec(
      'CREATE TABLE IF NOT EXISTS relay_meta (name TEXT PRIMARY KEY, value TEXT NOT NULL)',
    );
    this.initialized = true;
  }

  async refresh() {
    this.initialize();
    const sql = this.storage.sql;
    const oldTag = sql
      .exec('SELECT value FROM relay_meta WHERE name = ?', 'etag')
      .toArray()[0]?.value;
    const headers = { 'Accept-Encoding': 'identity' };
    if (oldTag) headers['If-None-Match'] = oldTag;
    const response = await this.fetchImpl(RELAY_FEED, { headers, cache: 'no-store' });
    if (response.status === 304) {
      if (!sql.exec('SELECT COUNT(*) AS n FROM relay_ranges').one().n) {
        throw new Error('empty relay cache');
      }
      markValidated(sql);
      return;
    }
    if (!response.ok) throw new Error(`relay feed unavailable: ${response.status}`);
    const { tag, feed } = await readFeedBody(response);
    storeFeed(this.storage, tag, feed);
    console.log(
      JSON.stringify({
        event: 'relay_feed_updated',
        ipv4: feed.counts[32],
        ipv6: feed.counts[128],
      }),
    );
  }

  start() {
    if (this.refreshing) return this.refreshing;
    this.refreshing = this.refresh()
      .then(() => true)
      .catch((error) => {
        this.storage.sql.exec(
          'INSERT OR REPLACE INTO state(name, value) VALUES (?, ?)',
          'relay_retry_after',
          Date.now() + RELAY_RETRY_MS,
        );
        console.error(
          JSON.stringify({
            event: 'detector_error',
            message: 'Apple relay feed unavailable',
            detail: String(error).slice(0, 160),
          }),
        );
        return false;
      })
      .finally(() => {
        this.refreshing = null;
      });
    return this.refreshing;
  }

  async ensureValidated(force) {
    const sql = this.storage.sql;
    const now = Date.now();
    const validated = stateValue(sql, 'relay_validated') || 0;
    const retryAfter = stateValue(sql, 'relay_retry_after') || 0;
    const age = now - validated;
    if (force) {
      if (validated && age >= 0 && age < RELAY_VERIFY_COALESCE_MS) return true;
      if (now < retryAfter && !this.refreshing) return false;
      return this.start();
    }
    if (isFresh(validated, now)) return true;
    if (now >= retryAfter) this.waitUntil(this.start());
    return false;
  }

  lookup(parsed) {
    const value = parsed.value.toString(16).padStart(parsed.bits / 4, '0');
    const row = this.storage.sql
      .exec(
        'SELECT finish FROM relay_ranges WHERE bits = ? AND start <= ? ORDER BY start DESC LIMIT 1',
        parsed.bits,
        value,
      )
      .toArray()[0];
    return row && row.finish >= value ? 'relay' : 'other';
  }

  async status(ip, force = false) {
    this.initialize();
    let parsed;
    try {
      parsed = parseAddress(ip);
    } catch {
      return 'unknown';
    }
    if (!(await this.ensureValidated(force))) return 'unknown';
    if (!isFresh(stateValue(this.storage.sql, 'relay_validated') || 0, Date.now()))
      return 'unknown';
    return this.lookup(parsed);
  }
}
