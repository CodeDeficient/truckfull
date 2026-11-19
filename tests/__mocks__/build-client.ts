// tests/__mocks__/build-client.ts
// Fluent FakeSupabaseClient for @/lib/supabase/build-client (moduleNameMapper).
import { jest } from '@jest/globals';

type MockChain = {
  from: jest.Mock;
  select: jest.Mock;
  eq: jest.Mock;
  maybeSingle: jest.Mock;
};

let mockResult: { data: unknown; error: unknown } = { data: null, error: null };
let lastChain: MockChain | null = null;

export function setSupabaseMockResult(data: unknown, error: unknown = null): void {
  mockResult = { data, error };
}

export function getSupabaseChain(): MockChain | null {
  return lastChain;
}

export const getSupabaseBuild = jest.fn(() => {
  const query = {
    eq: jest.fn(),
    maybeSingle: jest.fn(() => Promise.resolve(mockResult)),
  };
  query.eq.mockReturnValue(query);
  const select = jest.fn(() => query);
  const from = jest.fn(() => ({ select }));
  lastChain = { from, select, eq: query.eq, maybeSingle: query.maybeSingle };
  return { from };
});
