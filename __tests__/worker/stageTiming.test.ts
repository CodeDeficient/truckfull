/**
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import {
  SLOW_REQUEST_MS,
  finishTimedRequest,
  serverTimingValue,
  slowRequestRecord,
  withServerTiming,
} from '../../worker/stageTiming.mjs';

const url = new URL('https://www.truckfull.food/trucks');

describe('serverTimingValue', () => {
  it('formats whole, non-negative milliseconds per stage', () => {
    expect(serverTimingValue([{ name: 'edge', ms: 2.4 }, { name: 'app', ms: -1 }])).toBe(
      'edge;dur=2, app;dur=0',
    );
  });
});

describe('withServerTiming', () => {
  it('adds its stages after any timing from the layer below and keeps the response intact', async () => {
    const inner = new Response('page', {
      status: 404,
      headers: { 'server-timing': 'container;dur=40', 'content-type': 'text/html' },
    });
    const timed = withServerTiming(inner, [{ name: 'app', ms: 45 }]);
    expect(timed.status).toBe(404);
    expect(timed.headers.get('content-type')).toBe('text/html');
    expect(timed.headers.get('server-timing')).toBe('container;dur=40, app;dur=45');
    expect(await timed.text()).toBe('page');
  });

  it('leaves the response untouched when there is nothing to add', () => {
    const response = new Response('ok');
    expect(withServerTiming(response, [])).toBe(response);
  });
});

describe('slowRequestRecord', () => {
  const response = new Response('', { status: 200, headers: { 'server-timing': 'container;dur=3900' } });

  it('ignores requests under the threshold', () => {
    expect(slowRequestRecord(url, response, [{ name: 'app', ms: SLOW_REQUEST_MS - 1 }])).toBeNull();
  });

  it('records each stage and the layers below for slow requests', () => {
    expect(
      slowRequestRecord(url, response, [
        { name: 'edge', ms: 5 },
        { name: 'app', ms: 3995 },
      ]),
    ).toEqual({
      event: 'slow_request',
      path: '/trucks',
      status: 200,
      totalMs: 4000,
      stages: { edge: 5, app: 3995 },
      upstream: 'container;dur=3900',
    });
  });
});

describe('finishTimedRequest', () => {
  it('logs only slow requests and always adds the timing header', () => {
    const lines: string[] = [];
    const log = (line: string): void => {
      lines.push(line);
    };
    const fast = finishTimedRequest(url, new Response('ok'), [{ name: 'app', ms: 20 }], log);
    const slow = finishTimedRequest(url, new Response('ok'), [{ name: 'app', ms: 5000 }], log);
    expect(fast.headers.get('server-timing')).toBe('app;dur=20');
    expect(slow.headers.get('server-timing')).toBe('app;dur=5000');
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0]!)).toMatchObject({ event: 'slow_request', totalMs: 5000 });
  });
});
