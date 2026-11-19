import {
  UPTIME_STATE_KEY,
  alertEmail,
  checkWithRetry,
  nextUptimeState,
  sendAlertEmail,
  urlsForRun,
} from './uptimeCheck.mjs';
import {
  addTrafficSources,
  collectSignals,
  dueWarnings,
  evaluateSignals,
  isLogCheckMinute,
  logWindow,
  markWarningsSent,
  parseThresholds,
  slowWarning,
  warningEmail,
} from './uptimeWarnings.mjs';

const TIMEOUT_MS = 20_000;
const RETRY_DELAY_MS = 15_000;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function missingSettings(env, names) {
  return names.filter((name) => typeof env[name] !== 'string' || env[name].trim() === '');
}

function assertAlertConfig(env) {
  const missing = missingSettings(env, ['RESEND_API_KEY', 'ALERT_EMAIL_TO', 'ALERT_EMAIL_FROM']);
  if (missing.length > 0)
    throw new Error(`Uptime alerts cannot be sent: missing ${missing.join(', ')}`);
}

export async function runUptimeCheck(env, { fetchImpl, now, waitImpl = wait, clock }) {
  assertAlertConfig(env);
  const previous = await env.UPTIME_STATE.get(UPTIME_STATE_KEY, 'json');
  const urls = urlsForRun(env, now, previous);
  if (urls.length === 0) throw new Error('MONITOR_URLS has no https URLs to check');
  const { failures, slow } = await checkWithRetry(urls, {
    fetchImpl,
    timeoutMs: TIMEOUT_MS,
    retryDelayMs: RETRY_DELAY_MS,
    wait: waitImpl,
    clock,
  });
  const { state, notify } = nextUptimeState(previous, failures, now.toISOString());
  console.log('[uptime]', JSON.stringify({ failures, slow, notify }));
  if (notify) {
    await sendAlertEmail(env, fetchImpl, alertEmail(notify, failures, state));
    await env.UPTIME_STATE.put(UPTIME_STATE_KEY, JSON.stringify(state));
  }
  return { down: state.status === 'down', slow };
}

async function logWarnings(env, fetchImpl, window) {
  const missing = missingSettings(env, ['CF_ACCOUNT_ID', 'CF_OBSERVABILITY_TOKEN']);
  if (missing.length > 0) throw new Error(`Log warnings cannot run: missing ${missing.join(', ')}`);
  const thresholds = parseThresholds(env.WARNING_THRESHOLDS);
  let signals = await collectSignals(env, fetchImpl, window);
  if (signals.requests >= thresholds.requests) {
    signals = await addTrafficSources(env, fetchImpl, window, signals);
  }
  console.log('[uptime] log signals', JSON.stringify(signals));
  return evaluateSignals(signals, thresholds);
}

export async function runWarningChecks(env, { fetchImpl, now, down, slow }) {
  if (down) return;
  const warnings = [slowWarning(slow)].filter(Boolean);
  const window = isLogCheckMinute(now) ? logWindow(now) : null;
  let logError = null;
  if (window) {
    try {
      warnings.push(...(await logWarnings(env, fetchImpl, window)));
    } catch (error) {
      logError = error;
    }
  }
  const due = await dueWarnings(env.UPTIME_STATE, warnings, now);
  if (due.length > 0) {
    await sendAlertEmail(env, fetchImpl, warningEmail(due, now.toISOString(), window));
    await markWarningsSent(env.UPTIME_STATE, due, now);
  }
  if (logError) throw logError;
}

export default {
  async scheduled(controller, env) {
    const now = new Date(controller.scheduledTime);
    const uptime = await runUptimeCheck(env, { fetchImpl: fetch, now });
    await runWarningChecks(env, { fetchImpl: fetch, now, ...uptime });
  },
};
