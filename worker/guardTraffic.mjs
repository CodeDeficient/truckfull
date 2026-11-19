export const TRAFFIC_LIMITS = Object.freeze({
  prefetchIp10s: 10,
  prefetchIp60s: 24,
  prefetchGlobal10s: 25,
  prefetchGlobal60s: 65,
  dynamicGlobal10s: 50,
  dynamicGlobal60s: 110,
  hardGlobal10s: 80,
  hardGlobal60s: 180,
  emergencyGlobal10s: 120,
  emergencyGlobal60s: 240,
});

const WINDOW_TOTALS =
  'SELECT COALESCE(SUM(CASE WHEN bucket >= ? THEN n ELSE 0 END),0) AS requests10, COALESCE(SUM(n),0) AS requests60, COALESCE(SUM(CASE WHEN kind = 1 AND bucket >= ? THEN n ELSE 0 END),0) AS prefetch10, COALESCE(SUM(CASE WHEN kind = 1 THEN n ELSE 0 END),0) AS prefetch60 FROM traffic_buckets';

export function recordTraffic(sql, ip, isPrefetch, now) {
  const bucket = Math.floor(now / 1000);
  sql.exec(
    'CREATE TABLE IF NOT EXISTS traffic_buckets (bucket INTEGER NOT NULL, ip TEXT NOT NULL, kind INTEGER NOT NULL, n INTEGER NOT NULL, PRIMARY KEY(bucket,ip,kind)) WITHOUT ROWID',
  );
  sql.exec('DELETE FROM traffic_buckets WHERE bucket < ?', bucket - 59);
  sql.exec(
    'INSERT INTO traffic_buckets(bucket,ip,kind,n) VALUES (?,?,?,1) ON CONFLICT(bucket,ip,kind) DO UPDATE SET n = n + 1',
    bucket,
    ip,
    isPrefetch ? 1 : 0,
  );
  const recent = bucket - 9;
  return {
    totals: sql.exec(WINDOW_TOTALS, recent, recent).one(),
    client: sql.exec(`${WINDOW_TOTALS} WHERE ip = ?`, recent, recent, ip).one(),
  };
}

function isPrefetchFlood(totals, client) {
  const limits = TRAFFIC_LIMITS;
  return (
    client.prefetch10 > limits.prefetchIp10s ||
    client.prefetch60 > limits.prefetchIp60s ||
    totals.prefetch10 > limits.prefetchGlobal10s ||
    totals.prefetch60 > limits.prefetchGlobal60s ||
    (totals.requests10 > limits.dynamicGlobal10s && client.prefetch10 > 3) ||
    (totals.requests60 > limits.dynamicGlobal60s && client.prefetch60 > 8)
  );
}

function blockReason(emergency, fairShed) {
  if (emergency) return 'aggregate-emergency';
  return fairShed ? 'aggregate-fair-share' : 'prefetch-overload';
}

export function trafficDecision(totals, client, isPrefetch) {
  const limits = TRAFFIC_LIMITS;
  const prefetchFlood = isPrefetch && isPrefetchFlood(totals, client);
  const fairShed =
    (totals.requests10 > limits.hardGlobal10s && client.requests10 > 6) ||
    (totals.requests60 > limits.hardGlobal60s && client.requests60 > 15);
  const emergency =
    totals.requests10 > limits.emergencyGlobal10s || totals.requests60 > limits.emergencyGlobal60s;
  return {
    block: prefetchFlood || fairShed || emergency,
    reason: blockReason(emergency, fairShed),
    prefetch10: totals.prefetch10,
    prefetch60: totals.prefetch60,
    requests10: totals.requests10,
    requests60: totals.requests60,
  };
}

export function observeTraffic(sql, ip, isPrefetch, now) {
  const { totals, client } = recordTraffic(sql, ip, isPrefetch, now);
  return trafficDecision(totals, client, isPrefetch);
}

export function forgetTraffic(sql, ip, isPrefetch, at, withTotals = false) {
  sql.exec(
    'UPDATE traffic_buckets SET n = n - 1 WHERE bucket = ? AND ip = ? AND kind = ? AND n > 0',
    Math.floor(at / 1000),
    ip,
    isPrefetch ? 1 : 0,
  );
  if (!withTotals) return null;
  const recent = Math.floor(at / 1000) - 9;
  return sql.exec(WINDOW_TOTALS, recent, recent).one();
}
