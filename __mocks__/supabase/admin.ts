// __mocks__/supabase/admin.ts
import { jest } from '@jest/globals';

// Mock Supabase admin client implementation
const mockQueryResult = {
  data: null,
  error: null,
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
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  range: jest.fn().mockReturnThis(),
  single: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  then: jest.fn().mockReturnThis(),
  catch: jest.fn().mockReturnThis(),
  finally: jest.fn().mockReturnThis(),
};

const mockSupabaseAdminClient = {
  from: jest.fn().mockReturnValue(mockQueryResult),
  select: jest.fn().mockReturnValue(mockQueryResult),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
  auth: {
    admin: {
      getUserById: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      createUser: jest.fn().mockResolvedValue({ data: null, error: null } as const),
      deleteUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null } as const),
    },
  },
};

const getSupabaseAdmin = jest.fn(() => mockSupabaseAdminClient);

const getSupabasePublicReader = getSupabaseAdmin;

export { getSupabaseAdmin, getSupabasePublicReader };
