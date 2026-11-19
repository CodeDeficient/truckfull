import { banRegistryName } from './guardCounter.mjs';
import { withServerTiming } from './stageTiming.mjs';
import { EDGE_CACHE_HEADER, isAlwaysSharedPage } from './edgePageCache.mjs';
import {
  blocked,
  bypassesDetector,
  candidate,
  crawlerDenial,
  denyCrawler,
  digest,
  isDynamicGet,
  isPrefetchRequest,
} from './guardRequest.mjs';

export const AGGREGATE_COUNTER = 'aggregate:production';
export const RELAY_REGISTRY = 'relay-registry';
export const GUARD_TIME_LIMIT_MS = 500;
export const FORGET_LOG_RATE = 0.02;
const TIMED_OUT = Symbol('guard-timed-out');
const ANSWERED_AT_EDGE = new Set(['HIT', 'STALE']);

const FINGERPRINT_HEADERS = [
  'user-agent',
  'accept-language',
  'sec-ch-ua',
  'sec-ch-ua-mobile',
  'sec-ch-ua-platform',
];

function logBlock(event, details) {
  console.log(JSON.stringify({ event, ...details }));
}

async function aggregateOverload(request, env, ipKey, counted) {
  const at = Date.now();
  const load = await env.COUNTER.getByName(AGGREGATE_COUNTER).observeTraffic(
    ipKey,
    isPrefetchRequest(request),
    at,
  );
  Object.assign(counted, { ipKey, at });
  if (!load.block) return null;
  logBlock('aggregate_overload_block', {
    reason: load.reason,
    prefetch10: load.prefetch10,
    prefetch60: load.prefetch60,
    requests10: load.requests10,
    requests60: load.requests60,
  });
  return blocked(load.reason);
}

async function confirmedNonRelay(scope) {
  return (await scope.relay.relayStatus(scope.ip, true)) === 'other';
}

async function groupDenial(request, env, scope, keys) {
  const ref = request.headers.get('referer') || '';
  const ua = request.headers.get('user-agent') || '';
  if (ref || !ua) return null;
  const result = await env.COUNTER.getByName(`group:${keys.group}`).observe(
    'group',
    scope.ipKey,
    keys.path,
    keys.now,
  );
  if (!result.block || !(await confirmedNonRelay(scope))) return null;
  try {
    await scope.bans.permanentlyBan(scope.ipKey);
  } catch {
    console.error(
      JSON.stringify({ event: 'detector_error', message: 'permanent-ban persistence failed' }),
    );
  }
  logBlock('detector_block', { reason: result.reason });
  return denyCrawler(result.reason);
}

async function documentDenial(request, env, scope) {
  const fingerprint = FINGERPRINT_HEADERS.map((name) => request.headers.get(name) || '').join('\0');
  const [path, group] = await Promise.all([
    digest(env.HASH_KEY, `path\0${new URL(request.url).pathname}`),
    digest(env.HASH_KEY, `group\0${fingerprint}`),
  ]);
  const keys = { path, group, now: Date.now() };
  const ipResult = await env.COUNTER.getByName(`ip:${scope.ipKey}`).observe(
    'ip',
    scope.ipKey,
    keys.path,
    keys.now,
  );
  if (!ipResult.block) return groupDenial(request, env, scope, keys);
  if (!(await confirmedNonRelay(scope))) return null;
  logBlock('detector_block', { reason: ipResult.reason });
  return blocked(ipResult.reason);
}

async function behaviorDenial(request, env, ip, ipKey) {
  const scope = {
    ip,
    ipKey,
    bans: env.COUNTER.getByName(banRegistryName(ipKey)),
    relay: env.COUNTER.getByName(RELAY_REGISTRY),
  };
  const isDocument = candidate(request);
  let skip = isDocument && (await scope.relay.relayStatus(ip)) !== 'other';
  if (!skip && (await scope.bans.isPermanentlyBanned(ipKey))) {
    if (await confirmedNonRelay(scope)) {
      logBlock('detector_block', { reason: 'permanent-coordinated' });
      return denyCrawler('permanent-coordinated');
    }
    skip = true;
  }
  if (skip || !isDocument) return null;
  return documentDenial(request, env, scope);
}

export function checksSiteLoad(request) {
  return isDynamicGet(request) && !isAlwaysSharedPage(request, new URL(request.url));
}

export function answeredAtEdge(response) {
  return ANSWERED_AT_EDGE.has(response.headers.get(EDGE_CACHE_HEADER));
}

async function forgetEdgeLoad(request, env, counted) {
  // eslint-disable-next-line sonarjs/pseudo-random
  const sampled = Math.random() < FORGET_LOG_RATE;
  try {
    const totals = await env.COUNTER.getByName(AGGREGATE_COUNTER).forgetTraffic(
      counted.ipKey,
      isPrefetchRequest(request),
      counted.at,
      sampled,
    );
    if (sampled) {
      console.log(
        JSON.stringify({
          event: 'detector_forget_sample',
          sampleRate: FORGET_LOG_RATE,
          requests10: totals?.requests10,
          requests60: totals?.requests60,
        }),
      );
    }
  } catch (error) {
    console.error(
      JSON.stringify({ event: 'detector_forget_error', message: String(error).slice(0, 240) }),
    );
  }
}

async function guardDenial(request, env, counted) {
  const ip = request.headers.get('cf-connecting-ip');
  const ipKey = await digest(env.HASH_KEY, `ip\0${ip}`);
  if (checksSiteLoad(request)) {
    const overload = await aggregateOverload(request, env, ipKey, counted);
    if (overload) return overload;
  }
  return behaviorDenial(request, env, ip, ipKey);
}

async function settledDenial(request, env, counted) {
  try {
    return await guardDenial(request, env, counted);
  } catch (error) {
    console.error(
      JSON.stringify({ event: 'detector_error', message: String(error).slice(0, 240) }),
    );
    return null;
  }
}

async function withinTimeLimit(task, limitMs) {
  let timer;
  const expiry = new Promise((resolve) => {
    timer = setTimeout(() => resolve(TIMED_OUT), limitMs);
  });
  try {
    return await Promise.race([task, expiry]);
  } finally {
    clearTimeout(timer);
  }
}

export async function handleGuardRequest(
  request,
  env,
  limitMs = GUARD_TIME_LIMIT_MS,
  waitUntil = null,
) {
  const crawler = crawlerDenial(request);
  if (crawler) return crawler;
  if (bypassesDetector(request, env)) return env.ORIGIN.fetch(request);
  const started = Date.now();
  const counted = {};
  const denial = await withinTimeLimit(settledDenial(request, env, counted), limitMs);
  const guardMs = Date.now() - started;
  if (denial === TIMED_OUT) {
    console.error(JSON.stringify({ event: 'detector_timeout', limitMs }));
  } else if (denial) {
    return denial;
  }
  const response = await env.ORIGIN.fetch(request);
  if (waitUntil && counted.at && answeredAtEdge(response))
    waitUntil(forgetEdgeLoad(request, env, counted));
  return withServerTiming(response, [{ name: 'guard', ms: guardMs }]);
}
