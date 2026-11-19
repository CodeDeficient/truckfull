import type { Redis } from '@upstash/redis';
import {
  createRedisCheckpointStore,
  type CheckpointStore,
} from './checkpointStore';
import type { PipelineLockStore } from './pipelineLock';

export interface UpstashPipelineClient {
  set(
    key: string,
    value: unknown,
    options?: { nx?: boolean; ex?: number },
  ): Promise<'OK' | null | unknown>;
  get<T>(key: string): Promise<T | null>;
  del(key: string): Promise<number>;
  eval(script: string, keys: string[], args: string[]): Promise<unknown>;
}

type AssertAssignable<T extends U, U> = T;

export type RealUpstashSatisfiesPipelineClient = AssertAssignable<Redis, UpstashPipelineClient>;

export type UpstashEvalClient = Pick<UpstashPipelineClient, 'set' | 'eval'>;

export function createUpstashLockStore(client: UpstashEvalClient): PipelineLockStore {
  return {
    async set(key, value, options) {
      return client.set(key, value, { nx: options.nx, ex: options.ex });
    },
    async eval(script, keys, args) {
      return client.eval(script, keys, args);
    },
  };
}

export function createUpstashCheckpointStore(client: UpstashPipelineClient): CheckpointStore {
  return createRedisCheckpointStore(client);
}
