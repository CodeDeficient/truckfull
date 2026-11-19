import { jest } from '@jest/globals';

type MockFn = jest.Mock<(...args: unknown[]) => unknown>;

const CHAINABLE_METHODS = [
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'like',
  'ilike',
  'is',
  'in',
  'contains',
  'containedBy',
  'textSearch',
  'or',
  'and',
  'filter',
  'match',
  'overlaps',
  'not',
  'fts',
  'plfts',
  'phfts',
  'wfts',
  'order',
  'limit',
  'range',
  'single',
] as const;

const TERMINAL_METHODS = ['select', 'insert', 'update', 'delete', 'upsert'] as const;

function createChainStub(): Record<string, MockFn> {
  const stubs: Record<string, MockFn> = {};
  for (const method of CHAINABLE_METHODS) {
    stubs[method] = jest.fn<(...args: unknown[]) => unknown>().mockReturnThis();
  }
  return stubs;
}

export function createMockQueryBuilder(data: unknown = null, error: unknown = null) {
  const chain = createChainStub();

  const queryResult: Record<string, MockFn> = {
    ...chain,
    then: jest.fn<(...args: unknown[]) => unknown>().mockImplementation((...args: unknown[]) => {
      const resolve = args[0] as (v: unknown) => unknown;
      return resolve({ data, error });
    }),
    catch: jest.fn<(...args: unknown[]) => unknown>().mockReturnThis(),
    finally: jest.fn<(...args: unknown[]) => unknown>().mockReturnThis(),
  };

  for (const method of TERMINAL_METHODS) {
    queryResult[method] = jest.fn<(...args: unknown[]) => unknown>().mockReturnValue(queryResult);
  }

  return queryResult;
}

export function createMockSupabaseClient(
  overrides?: Partial<{
    auth: Record<string, MockFn>;
    storage: Record<string, MockFn>;
    channel: MockFn;
    rpc: MockFn;
    from: MockFn;
  }>,
) {
  return {
    from:
      overrides?.from ??
      jest.fn<(...args: unknown[]) => unknown>().mockReturnValue(createMockQueryBuilder()),
    auth: overrides?.auth ?? {
      getUser: jest.fn().mockImplementation(async () => ({ data: { user: null }, error: null })),
      signInWithPassword: jest.fn().mockImplementation(async () => ({ data: null, error: null })),
      signUp: jest.fn().mockImplementation(async () => ({ data: null, error: null })),
      signOut: jest.fn().mockImplementation(async () => ({ error: null })),
      getSession: jest
        .fn()
        .mockImplementation(async () => ({ data: { session: null }, error: null })),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
    },
    storage: overrides?.storage ?? {
      from: jest.fn().mockReturnValue({
        upload: jest.fn().mockImplementation(async () => ({ error: null, data: { path: '' } })),
        download: jest.fn().mockImplementation(async () => ({ data: null, error: null })),
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: '' } }),
        remove: jest.fn().mockImplementation(async () => ({ error: null })),
      }),
    },
    channel:
      overrides?.channel ??
      jest.fn().mockReturnValue({
        on: jest.fn<(...args: unknown[]) => unknown>().mockReturnThis(),
        subscribe: jest.fn<(...args: unknown[]) => unknown>().mockReturnThis(),
        unsubscribe: jest.fn().mockImplementation(async () => ({ error: null })),
      }),
    rpc: overrides?.rpc ?? jest.fn().mockImplementation(async () => ({ data: null, error: null })),
  };
}

export function createMockAdminClient(
  overrides?: Partial<{
    auth: Record<string, MockFn>;
    from: MockFn;
    rpc: MockFn;
  }>,
) {
  return {
    from:
      overrides?.from ??
      jest.fn<(...args: unknown[]) => unknown>().mockReturnValue(createMockQueryBuilder()),
    auth: overrides?.auth ?? {
      admin: {
        getUserById: jest
          .fn()
          .mockImplementation(async () => ({ data: { user: null }, error: null })),
        createUser: jest.fn().mockImplementation(async () => ({ data: null, error: null })),
        deleteUser: jest
          .fn()
          .mockImplementation(async () => ({ data: { user: null }, error: null })),
      },
    },
    rpc: overrides?.rpc ?? jest.fn().mockImplementation(async () => ({ data: null, error: null })),
  };
}
