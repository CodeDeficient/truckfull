import { expect, it } from '@jest/globals';
import { spawn } from 'node:child_process';
import { expireBatchContainer } from '../../worker/batchIdleShutdown.mjs';

it('ends a process that ignores graceful termination after the bounded grace period', async () => {
  const child = spawn(
    process.execPath,
    [
      '-e',
      "process.on('SIGTERM', () => {}); setInterval(() => {}, 1000); process.stdout.write('ready');",
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );
  const exited = new Promise<string | null>((resolve) =>
    child.once('exit', (_code, signal) => resolve(signal)),
  );
  try {
    await new Promise<void>((resolve, reject) => {
      child.once('error', reject);
      child.stdout.once('data', () => resolve());
    });
    const storage = new Map<string, unknown>();
    const container = {
      ctx: {
        storage: {
          get: async (key: string): Promise<unknown> => storage.get(key),
          put: async (key: string, value: unknown): Promise<void> => {
            storage.set(key, value);
          },
          delete: async (key: string): Promise<boolean> => storage.delete(key),
        },
      },
      envVars: { CRON_SECRET: 'test-only-token' },
      containerFetch: async (): Promise<Response> => new Response('{"status":"running"}'),
      stop: async (signal: NodeJS.Signals): Promise<void> => {
        child.kill(signal);
      },
      renewActivityTimeout: (): void => {},
    };
    await expireBatchContainer(container, 60_000, 0);
    await expireBatchContainer(container, 60_000, 60_000);
    expect(child.signalCode).toBeNull();
    await expireBatchContainer(container, 60_000, 120_000);
    expect(await exited).toBe('SIGKILL');
  } finally {
    child.kill('SIGKILL');
    await exited;
  }
}, 10_000);
