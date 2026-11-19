// @ts-nocheck
// __mocks__/supabase/client.ts - Fluent mock for Supabase client testing

// Create fluent query mock with proper promise handling
const createFluentQueryMock = (data: unknown = null, error: unknown = null) => {
  const mockObj: any = {
    // Filtering methods that should allow chaining
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    containedBy: jest.fn().mockReturnThis(),
    textSearch: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    and: jest.fn().mockReturnThis(),
    filter: jest.fn().mockReturnThis(),
    match: jest.fn().mockReturnThis(),
    overlaps: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    fts: jest.fn().mockReturnThis(),
    plfts: jest.fn().mockReturnThis(),
    phfts: jest.fn().mockReturnThis(),
    wfts: jest.fn().mockReturnThis(),

    // Query methods that should allow chaining
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),

    // Query method that returns promise
    select: jest.fn().mockImplementation(() => {
      const resultMock = createFluentQueryMock(data, error);
      // Add promise resolution to the final result
      resultMock.then = jest.fn().mockResolvedValue({ data, error });
      resultMock.catch = jest.fn().mockReturnThis();
      resultMock.throw = jest.fn().mockResolvedValue({ data, error });
      return resultMock;
    }),

    // Write operations that return promise
    insert: jest.fn().mockImplementation(() => {
      const resultMock = createFluentQueryMock(data, error);
      // Add promise resolution to the final result
      resultMock.then = jest.fn().mockResolvedValue({ data, error });
      resultMock.catch = jest.fn().mockReturnThis();
      return resultMock;
    }),

    update: jest.fn().mockImplementation(() => {
      const resultMock = createFluentQueryMock(data, error);
      // Add promise resolution to the final result
      resultMock.then = jest.fn().mockResolvedValue({ data, error });
      resultMock.catch = jest.fn().mockReturnThis();
      return resultMock;
    }),

    delete: jest.fn().mockImplementation(() => {
      const resultMock = createFluentQueryMock(data, error);
      // Add promise resolution to the final result
      resultMock.then = jest.fn().mockResolvedValue({ data, error });
      resultMock.catch = jest.fn().mockReturnThis();
      return resultMock;
    }),
  };

  // Add promise resolution to the base mock object
  mockObj.then = jest.fn().mockResolvedValue({ data, error });
  mockObj.catch = jest.fn().mockReturnThis();
  mockObj.throw = jest.fn().mockResolvedValue({ data, error });

  return mockObj;
};

const mockSupabaseClient: any = {
  from: jest.fn().mockImplementation((table: string) => {
    // Return a new fluent query mock for each table
    return createFluentQueryMock();
  }),
  auth: {
    getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    signInWithPassword: jest.fn().mockResolvedValue({ data: null, error: null }),
    signUp: jest.fn().mockResolvedValue({ data: null, error: null }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    onAuthStateChange: jest.fn().mockResolvedValue({ data: { subscription: null }, error: null }),
  },
  storage: {
    from: jest.fn().mockReturnValue({
      upload: jest.fn().mockResolvedValue({ error: null, data: { path: '' } }),
      download: jest.fn().mockResolvedValue({ data: null, error: null }),
      getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: '' } }),
      remove: jest.fn().mockResolvedValue({ error: null }),
    }),
  },
  channel: jest.fn().mockReturnValue({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockReturnThis(),
    unsubscribe: jest.fn().mockResolvedValue({ error: null }),
  }),
  rpc: jest.fn().mockImplementation(() => {
    const mockObj = createFluentQueryMock();
    mockObj.then = jest.fn().mockResolvedValue({ data: null, error: null });
    return mockObj;
  }),
};

const getSupabase = jest.fn(() => mockSupabaseClient);

export { getSupabase, mockSupabaseClient };
