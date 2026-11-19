import { afterEach, describe, expect, it } from '@jest/globals';
import { createServer, request, type Server } from 'node:http';
import { createBackupHandler } from '../../containers/backup/http.mjs';

let server: Server | undefined;

async function start(run: () => Promise<{ outcome: string }>): Promise<string> {
  server = createServer(createBackupHandler(run, 'test-token'));
  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected a TCP port');
  return `http://127.0.0.1:${address.port}`;
}

async function send(
  url: string,
  method: string,
  authorized = true,
): Promise<{ status: number; body: { status?: string } }> {
  return new Promise((resolve, reject) => {
    const req = request(
      url,
      {
        method,
        headers: authorized ? { authorization: 'Bearer test-token' } : {},
      },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk: string) => {
          body += chunk;
        });
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body: JSON.parse(body) }));
      },
    );
    req.on('error', reject);
    req.end();
  });
}

afterEach(async () => {
  await new Promise<void>((resolve, reject) => {
    server?.close((error) => (error ? reject(error) : resolve()));
  });
  server = undefined;
});

describe('backup container HTTP handler', () => {
  it('rejects unauthenticated requests without running a backup', async () => {
    let calls = 0;
    const url = await start(async () => {
      calls++;
      return { outcome: 'completed' };
    });

    expect((await send(`${url}/run`, 'POST', false)).status).toBe(401);
    expect(calls).toBe(0);
  });

  it('acknowledges the run promptly and rejects overlapping triggers', async () => {
    let finish: ((result: { outcome: string }) => void) | undefined;
    const url = await start(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    expect((await send(`${url}/run`, 'POST')).status).toBe(202);
    expect((await send(`${url}/run`, 'POST')).status).toBe(409);
    expect((await send(`${url}/status`, 'GET')).body).toEqual({ status: 'running' });
    finish?.({ outcome: 'completed' });
    await Promise.resolve();
    expect((await send(`${url}/status`, 'GET')).body).toEqual({ status: 'completed' });
  });

  it('reports failed runs through status without throwing', async () => {
    const url = await start(async () => {
      throw new Error('dump failed');
    });
    expect((await send(`${url}/run`, 'POST')).status).toBe(202);
    await Promise.resolve();
    await Promise.resolve();
    expect((await send(`${url}/status`, 'GET')).body).toEqual({ status: 'failed' });
  });

  it('limits the exposed routes to /run and /status', async () => {
    const url = await start(async () => ({ outcome: 'completed' }));
    expect((await send(`${url}/unknown`, 'GET')).status).toBe(404);
    expect((await send(`${url}/run`, 'GET')).status).toBe(405);
  });
});
