export const SLOW_REQUEST_MS = 3000;

export function serverTimingValue(stages) {
  return stages.map(({ name, ms }) => `${name};dur=${Math.max(0, Math.round(ms))}`).join(', ');
}

export function withServerTiming(response, stages) {
  if (response.status === 101 || response.webSocket || stages.length === 0) return response;
  const timed = new Response(response.body, response);
  timed.headers.append('server-timing', serverTimingValue(stages));
  return timed;
}

export function slowRequestRecord(url, response, stages, threshold = SLOW_REQUEST_MS) {
  const total = stages.reduce((sum, stage) => sum + stage.ms, 0);
  if (total < threshold) return null;
  return {
    event: 'slow_request',
    path: url.pathname,
    status: response.status,
    totalMs: total,
    stages: Object.fromEntries(stages.map(({ name, ms }) => [name, ms])),
    upstream: response.headers.get('server-timing'),
  };
}

export function finishTimedRequest(url, response, stages, log = console.log) {
  const record = slowRequestRecord(url, response, stages);
  if (record) log(JSON.stringify(record));
  return withServerTiming(response, stages);
}
