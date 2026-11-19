import { describe, expect, it } from '@jest/globals';
import { expireBatchContainer } from '../../worker/batchIdleShutdown.mjs';

function fixture(
  status: string,
  now = 0,
): {
  container: Record<string, unknown>;
  signals: string[];
  advance: (ms: number) => void;
  renewals: () => number;
  now: () => number;
} {
  const values = new Map<string, unknown>();
  const signals: string[] = [];
  let renewals = 0;
  return {
    container: {
      ctx: {
        storage: {
          get: async (key: string): Promise<unknown> => values.get(key),
          put: async (key: string, value: unknown): Promise<void> => {
            values.set(key, value);
          },
          delete: async (key: string): Promise<boolean> => values.delete(key),
        },
      },
      envVars: { CRON_SECRET: 'test-only-token' },
      containerFetch: async (): Promise<Response> => new Response(JSON.stringify({ status })),
      stop: async (signal: string): Promise<void> => {
        signals.push(signal);
      },
      renewActivityTimeout: (): void => {
        renewals++;
      },
    },
    signals,
    advance: (ms: number): void => {
      now += ms;
    },
    renewals: (): number => renewals,
    now: (): number => now,
  };
}

describe('batch container idle shutdown', () => {
  it('terminates completed jobs instead of repeatedly sending ignored SIGTERM', async () => {
    const state = fixture('completed');
    await expireBatchContainer(state.container, 60000, state.now());
    expect(state.signals).toEqual(['SIGKILL']);
    expect(state.renewals()).toBe(0);
  });

  it('preserves a running job within the bounded observation window', async () => {
    const state = fixture('running');
    await expireBatchContainer(state.container, 60000, state.now());
    expect(state.signals).toEqual([]);
    expect(state.renewals()).toBe(1);
  });

  it('does not extend the job deadline on each status probe', async () => {
    const state = fixture('running', 1000);
    await expireBatchContainer(state.container, 60000, state.now());
    state.advance(30000);
    await expireBatchContainer(state.container, 60000, state.now());
    state.advance(30000);
    await expireBatchContainer(state.container, 60000, state.now());
    expect(state.signals).toEqual(['SIGTERM']);
    state.advance(60000);
    await expireBatchContainer(state.container, 60000, state.now());
    expect(state.signals).toEqual(['SIGTERM', 'SIGKILL']);
  });

  it('gives an unreadable status a bounded graceful shutdown window', async () => {
    const state = fixture('invalid');
    await expireBatchContainer(state.container, 60000, state.now());
    expect(state.signals).toEqual(['SIGTERM']);
    state.advance(60000);
    await expireBatchContainer(state.container, 60000, state.now());
    expect(state.signals).toEqual(['SIGTERM', 'SIGKILL']);
  });

  it('caps platform signal failures instead of creating immediate alarm retries', async () => {
    const state = fixture('completed');
    let calls = 0;
    state.container.stop = async (): Promise<void> => {
      calls++;
      throw new Error('Platform signal failed');
    };
    for (let i = 0; i < 5; i++) {
      await expireBatchContainer(state.container, 60000, state.now());
      state.advance(60000);
    }
    expect(calls).toBe(3);
  });
});
