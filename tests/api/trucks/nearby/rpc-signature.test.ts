import { createClient } from '@supabase/supabase-js';
import { POST } from '@/app/api/trucks/nearby/route';

// Mock environment variables
const mockEnv = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
};

// Mock Next.js headers
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(() => ({ value: 'test-session' })),
  })),
}));

// Mock createClient to track RPC calls
jest.mock('@supabase/supabase-js', () => {
  const originalModule = jest.requireActual('@supabase/supabase-js');
  return {
    ...originalModule,
    createClient: jest.fn(),
  };
});

describe('POST /api/trucks/nearby - RPC Signature', () => {
  let mockSupabaseClient: any;
  let mockRpc: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = mockEnv.NEXT_PUBLIC_SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = mockEnv.SUPABASE_SERVICE_ROLE_KEY;

    // Setup mock RPC function
    mockRpc = jest.fn();
    mockSupabaseClient = {
      rpc: mockRpc,
    };

    // Mock createClient to return our mock
    (createClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it('should call RPC with correct parameter names (NEW signature)', async () => {
    const requestBody = {
      lat: 37.7749,
      lng: -122.4194,
      radiusMiles: 10,
    };

    const mockRequest = {
      json: async () => requestBody,
    } as unknown as Request;

    mockRpc.mockResolvedValue({
      data: [],
      error: null,
    });

    await POST(mockRequest as any);

    // Verify RPC was called with NEW signature parameters
    expect(mockRpc).toHaveBeenCalledWith('find_trucks_within_radius', {
      latitude: 37.7749,
      longitude: -122.4194,
      radius_miles: 10,
    });

    // Verify old parameters are NOT used
    expect(mockRpc).not.toHaveBeenCalledWith(
      'find_trucks_within_radius',
      expect.objectContaining({
        user_lat: expect.any(Number),
        user_lng: expect.any(Number),
        radius_meters: expect.any(Number),
        max_results: expect.any(Number),
      }),
    );
  });

  it('should call RPC with latitude parameter', async () => {
    const requestBody = {
      lat: 40.7128,
      lng: -74.006,
      radiusMiles: 5,
    };

    const mockRequest = {
      json: async () => requestBody,
    } as unknown as Request;

    mockRpc.mockResolvedValue({
      data: [],
      error: null,
    });

    await POST(mockRequest as any);

    expect(mockRpc).toHaveBeenCalledTimes(1);
    const rpcCall = mockRpc.mock.calls[0];
    expect(rpcCall[1]).toHaveProperty('latitude', 40.7128);
    expect(rpcCall[1]).not.toHaveProperty('user_lat');
  });

  it('should call RPC with longitude parameter', async () => {
    const requestBody = {
      lat: 34.0522,
      lng: -118.2437,
      radiusMiles: 15,
    };

    const mockRequest = {
      json: async () => requestBody,
    } as unknown as Request;

    mockRpc.mockResolvedValue({
      data: [],
      error: null,
    });

    await POST(mockRequest as any);

    expect(mockRpc).toHaveBeenCalledTimes(1);
    const rpcCall = mockRpc.mock.calls[0];
    expect(rpcCall[1]).toHaveProperty('longitude', -118.2437);
    expect(rpcCall[1]).not.toHaveProperty('user_lng');
  });

  it('should call RPC with radius_miles parameter', async () => {
    const requestBody = {
      lat: 41.8781,
      lng: -87.6298,
      radiusMiles: 20,
    };

    const mockRequest = {
      json: async () => requestBody,
    } as unknown as Request;

    mockRpc.mockResolvedValue({
      data: [],
      error: null,
    });

    await POST(mockRequest as any);

    expect(mockRpc).toHaveBeenCalledTimes(1);
    const rpcCall = mockRpc.mock.calls[0];
    expect(rpcCall[1]).toHaveProperty('radius_miles', 20);
    expect(rpcCall[1]).not.toHaveProperty('radius_meters');
    expect(rpcCall[1]).not.toHaveProperty('max_results');
  });

  it('should not include max_results parameter', async () => {
    const requestBody = {
      lat: 29.7604,
      lng: -95.3698,
      radiusMiles: 10,
    };

    const mockRequest = {
      json: async () => requestBody,
    } as unknown as Request;

    mockRpc.mockResolvedValue({
      data: [],
      error: null,
    });

    await POST(mockRequest as any);

    expect(mockRpc).toHaveBeenCalledTimes(1);
    const rpcCall = mockRpc.mock.calls[0];
    expect(rpcCall[1]).not.toHaveProperty('max_results');
  });

  it('should pass radius_miles directly without meter conversion', async () => {
    const requestBody = {
      lat: 39.9526,
      lng: -75.1652,
      radiusMiles: 10,
    };

    const mockRequest = {
      json: async () => requestBody,
    } as unknown as Request;

    mockRpc.mockResolvedValue({
      data: [],
      error: null,
    });

    await POST(mockRequest as any);

    expect(mockRpc).toHaveBeenCalledTimes(1);
    const rpcCall = mockRpc.mock.calls[0];
    // radius_miles should be 10, NOT 16093.4 (10 miles * 1609.34 meters/mile)
    expect(rpcCall[1].radius_miles).toBe(10);
    expect(rpcCall[1].radius_miles).not.toBeGreaterThan(1000); // Should not be in meters
  });

  it('should use default radius_miles when not provided', async () => {
    const requestBody = {
      lat: 33.4484,
      lng: -112.074,
    };

    const mockRequest = {
      json: async () => requestBody,
    } as unknown as Request;

    mockRpc.mockResolvedValue({
      data: [],
      error: null,
    });

    await POST(mockRequest as any);

    expect(mockRpc).toHaveBeenCalledTimes(1);
    const rpcCall = mockRpc.mock.calls[0];
    // Default radius_miles from the route logic (not from RPC default)
    expect(rpcCall[1]).toHaveProperty('radius_miles', 10);
  });
});
