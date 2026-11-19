/**
 * Shared Supabase Mock Utilities
 *
 * Provides reusable mock patterns for testing code that uses Supabase.
 * Handles the complex chainable query builder pattern.
 *
 * @module tests/utils/supabaseMocks
 */

import { jest } from '@jest/globals';

/**
 * Response type for Supabase queries
 */
export interface MockSupabaseResponse<T = unknown> {
  data: T | null;
  error: { code: string; message: string } | null;
}

/**
 * Creates a chainable mock query builder that simulates Supabase's fluent API.
 *
 * Usage:
 * ```typescript
 * const mockBuilder = createMockQueryBuilder({ data: [{ id: 1 }], error: null });
 * mockSupabase.from.mockReturnValue(mockBuilder);
 * ```
 *
 * @param defaultResponse - The default response for terminal methods (single, select without chain)
 * @returns A mock object with all Supabase query methods
 */
export function createMockQueryBuilder<T = unknown>(
  defaultResponse: MockSupabaseResponse<T> = { data: null, error: null },
) {
  const builder: Record<string, jest.Mock> = {};

  // Chain methods - return `this` for chaining
  const chainMethods = [
    'select',
    'insert',
    'update',
    'upsert',
    'delete',
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
    'range',
    'filter',
    'not',
    'or',
    'order',
    'limit',
    'offset',
    'match',
    'textSearch',
  ];

  // Terminal methods - return the response
  const terminalMethods = ['single', 'maybeSingle'];

  // Create chain methods
  for (const method of chainMethods) {
    builder[method] = jest.fn().mockReturnValue(builder);
  }

  // Create terminal methods
  for (const method of terminalMethods) {
    builder[method] = jest.fn().mockResolvedValue(defaultResponse);
  }

  // Make the builder itself thenable (for chains that don't end with single())
  builder.then = jest.fn((resolve: (value: MockSupabaseResponse<T>) => void) =>
    resolve(defaultResponse),
  );

  // Add RPC mock
  builder.rpc = jest.fn().mockResolvedValue(defaultResponse);

  return builder;
}

/**
 * Creates a complete mock Supabase client.
 *
 * Usage:
 * ```typescript
 * const mockSupabase = createMockSupabaseClient();
 * (createClient as jest.Mock).mockReturnValue(mockSupabase);
 *
 * // Configure responses per test:
 * mockSupabase.mockQueryResponse('food_trucks', { data: [...], error: null });
 * ```
 */
export function createMockSupabaseClient() {
  // Store per-table responses for more realistic mocking
  const tableResponses: Map<string, MockSupabaseResponse> = new Map();

  const createBuilderForTable = (tableName: string) => {
    const response = tableResponses.get(tableName) || { data: null, error: null };
    return createMockQueryBuilder(response);
  };

  const client = {
    from: jest.fn((tableName: string) => createBuilderForTable(tableName)),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signInWithPassword: jest.fn().mockResolvedValue({ data: null, error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({ data: null, error: null }),
        download: jest.fn().mockResolvedValue({ data: null, error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://mock.url' } }),
        remove: jest.fn().mockResolvedValue({ data: null, error: null }),
      }),
    },

    // Helper to configure responses
    mockQueryResponse: (tableName: string, response: MockSupabaseResponse) => {
      tableResponses.set(tableName, response);
    },

    // Helper to reset all mocks
    resetMocks: () => {
      tableResponses.clear();
      jest.clearAllMocks();
    },
  };

  return client;
}

/**
 * Creates a mock for sequential Supabase calls (e.g., check truck exists, then fetch preferences).
 *
 * Usage:
 * ```typescript
 * const mockSequence = createMockSequence([
 *   { data: { id: 'truck-1' }, error: null },  // First call: truck exists
 *   { data: { notify_me: true }, error: null }, // Second call: preferences
 * ]);
 * mockSupabase.from.mockImplementation(() => mockSequence.next());
 * ```
 */
export function createMockSequence<T = unknown>(responses: MockSupabaseResponse<T>[]) {
  let callIndex = 0;

  return {
    next: () => {
      const response = responses[callIndex] || responses[responses.length - 1];
      callIndex++;
      return createMockQueryBuilder(response);
    },
    reset: () => {
      callIndex = 0;
    },
  };
}

/**
 * Common mock responses for testing
 */
export const MockResponses = {
  // Success responses
  success: <T>(data: T): MockSupabaseResponse<T> => ({ data, error: null }),
  empty: (): MockSupabaseResponse<null> => ({ data: null, error: null }),
  emptyArray: (): MockSupabaseResponse<[]> => ({ data: [], error: null }),

  // Error responses
  notFound: (): MockSupabaseResponse<null> => ({
    data: null,
    error: { code: 'PGRST116', message: 'No rows found' },
  }),
  dbError: (message = 'Database error'): MockSupabaseResponse<null> => ({
    data: null,
    error: { code: 'PGRST500', message },
  }),
  authError: (): MockSupabaseResponse<null> => ({
    data: null,
    error: { code: 'PGRST401', message: 'Unauthorized' },
  }),
  validationError: (message = 'Validation failed'): MockSupabaseResponse<null> => ({
    data: null,
    error: { code: 'PGRST400', message },
  }),
};
