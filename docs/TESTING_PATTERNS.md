# Testing Patterns for TruckFull

**Reference:** This doc contains detailed patterns. Jest covers `lib/` logic; API routes and pages are tested with Playwright.

## Critical: ESM Mocking Pattern

This project uses `ts-jest` with ESM preset. **Classic `jest.mock()` does not work.**

### The Working Pattern

```typescript
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// 1. Define mocks FIRST (before ANY imports)
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockQueryBuilder = {
  from: jest.fn().mockReturnThis(),
  select: mockSelect.mockReturnThis(),
  eq: mockEq.mockReturnThis(),
};

const mockSupabase = {
  from: jest.fn(() => mockQueryBuilder),
};

jest.unstable_mockModule('@/lib/supabase/client', () => ({
  getSupabase: jest.fn(() => mockSupabase),
}));

jest.unstable_mockModule('@/lib/logging', () => ({
  logError: jest.fn(),
  logMessage: jest.fn(),
}));

// 2. Dynamic import AFTER mocks are registered
const { MyService } = await import('@/lib/services/myService');

describe('MyService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.values(mockQueryBuilder).forEach((fn) => {
      if (typeof fn === 'function' && 'mockReturnThis' in fn) {
        (fn as jest.Mock).mockReturnThis();
      }
    });
  });

  describe('getData', () => {
    it('should return data on success', async () => {
      mockEq.mockResolvedValueOnce({ data: [{ id: '1' }], error: null });

      const result = await MyService.getData();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([{ id: '1' }]);
    });

    it('should handle errors', async () => {
      mockEq.mockResolvedValueOnce({ data: null, error: new Error('DB error') });

      const result = await MyService.getData();

      expect(result.success).toBe(false);
    });
  });
});
```

### Why This Works

| Pattern                                       | Works? | Reason                                        |
| --------------------------------------------- | ------ | --------------------------------------------- |
| `jest.unstable_mockModule()` + dynamic import | ✅ Yes | Registers mocks before module evaluation      |
| `jest.mock()` at top of file                  | ❌ No  | ESM modules evaluate before mock interception |
| `jest.mock()` in `beforeEach`                 | ❌ No  | Too late - modules already cached             |

## Test Templates by Type

### Service Layer Tests

**File location:** `__tests__/lib/services/myService.test.ts`

```typescript
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockQueryBuilder = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
};

const mockSupabase = {
  from: jest.fn(() => mockQueryBuilder),
};

jest.unstable_mockModule('@/lib/supabase/client', () => ({
  getSupabase: jest.fn(() => mockSupabase),
}));

jest.unstable_mockModule('@/lib/logging', () => ({
  logError: jest.fn(),
}));

const { MyService } = await import('@/lib/services/myService');

describe('MyService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getItemById', () => {
    it('should return item when found', async () => {
      const mockItem = { id: '1', name: 'Test' };
      mockQueryBuilder.single.mockResolvedValueOnce({ data: mockItem, error: null });

      const result = await MyService.getItemById('1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockItem);
      expect(mockQueryBuilder.from).toHaveBeenCalledWith('items');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', '1');
    });

    it('should handle not found', async () => {
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      });

      const result = await MyService.getItemById('999');

      expect(result.success).toBe(false);
      expect(result.error).toBe('NOT_FOUND');
    });

    it('should handle database errors', async () => {
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: null,
        error: new Error('Connection failed'),
      });

      const result = await MyService.getItemById('1');

      expect(result.success).toBe(false);
    });
  });
});
```

### Zustand Store Tests

**File location:** `tests/lib/stores/useMyStore.test.ts`

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { act } from '@testing-library/react';
import { useMyStore, DEFAULT_STATE } from '@/lib/stores/useMyStore';

describe('useMyStore', () => {
  beforeEach(() => {
    // Reset to default state
    useMyStore.setState(DEFAULT_STATE);
  });

  it('should set value', () => {
    const { result } = renderHook(() => useMyStore());

    act(() => {
      result.current.setValue('test');
    });

    expect(result.current.value).toBe('test');
  });

  it('should reset to defaults', () => {
    const { result } = renderHook(() => useMyStore());

    act(() => {
      result.current.setValue('test');
      result.current.reset();
    });

    expect(result.current.value).toBe(DEFAULT_STATE.value);
  });
});
```

### React Hook Tests

**File location:** `__tests__/hooks/useMyHook.test.tsx`

```typescript
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { renderHook, act, waitFor } from '@testing-library/react';

jest.unstable_mockModule('@/lib/supabase/client', () => ({
  getSupabase: jest.fn(() => mockSupabase),
}));

const { useMyHook } = await import('@/hooks/useMyHook');

describe('useMyHook', () => {
  it('should fetch data on mount', async () => {
    const mockData = [{ id: '1', name: 'Test' }];
    mockSupabase.from().select().mockResolvedValue({ data: mockData, error: null });

    const { result } = renderHook(() => useMyHook());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
  });

  it('should handle errors', async () => {
    mockSupabase
      .from()
      .select()
      .mockResolvedValue({
        data: null,
        error: new Error('Failed'),
      });

    const { result } = renderHook(() => useMyHook());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed');
  });
});
```

### Component Tests

**File location:** `__tests__/components/MyComponent.test.tsx`

```typescript
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock external dependencies
jest.unstable_mockModule('@/lib/supabase/client', () => ({
  getSupabase: jest.fn(() => mockSupabase),
}));

jest.unstable_mockModule('@/hooks/useCustomHook', () => ({
  useCustomHook: jest.fn(() => ({ data: null, loading: false })),
}));

// Mock Next.js components
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) =>
    `<img src="${src}" alt="${alt}" />`,
}));

// Dynamic import after mocks
const { MyComponent } = await import('@/components/MyComponent');

describe('MyComponent', () => {
  const defaultProps = {
    title: 'Test Title',
    onClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(<MyComponent {...defaultProps} />);
    expect(container).toBeDefined();
  });

  it('should call onClick when clicked', () => {
    const onClick = jest.fn();
    render(<MyComponent {...defaultProps} onClick={onClick} />);

    fireEvent.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should display loading state', () => {
    jest.mocked(useCustomHook).mockReturnValue({
      data: null,
      loading: true
    });

    render(<MyComponent {...defaultProps} />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });
});
```

### Utility Function Tests

**File location:** `__tests__/utils/myUtil.test.ts`

```typescript
import { describe, it, expect } from '@jest/globals';
import { calculateDistance, formatCurrency } from '@/lib/utils/myUtil';

describe('calculateDistance', () => {
  it('should return 0 for same coordinates', () => {
    const distance = calculateDistance(33.5, -81.8, 33.5, -81.8);
    expect(distance).toBe(0);
  });

  it('should calculate distance correctly', () => {
    const distance = calculateDistance(33.4735, -81.9748, 33.749, -84.388);
    expect(distance).toBeGreaterThan(130);
    expect(distance).toBeLessThan(160);
  });

  it('should handle invalid inputs gracefully', () => {
    expect(calculateDistance(NaN, -81.8, 33.5, -81.8)).toBeNaN();
  });
});

describe('formatCurrency', () => {
  it('should format USD correctly', () => {
    expect(formatCurrency(10.5)).toBe('$10.50');
  });

  it('should handle zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('should handle negative values', () => {
    expect(formatCurrency(-5.25)).toBe('-$5.25');
  });
});
```

## Supabase Mock Patterns

### Basic Query Chain

```typescript
const mockQueryBuilder = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
};

const mockSupabase = {
  from: jest.fn(() => mockQueryBuilder),
};
```

### Insert/Upsert Pattern

```typescript
const mockQueryBuilder = {
  from: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  upsert: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  single: jest.fn(),
};

// Usage
mockQueryBuilder.single.mockResolvedValueOnce({
  data: { id: 'new-id' },
  error: null,
});

// Service code: .from('table').insert(data).select().single()
```

### Multiple Queries in One Test

```typescript
it('should handle multiple queries', async () => {
  // First query
  mockQueryBuilder.single
    .mockResolvedValueOnce({ data: { id: '1' }, error: null })
    // Second query
    .mockResolvedValueOnce({ data: { id: '2' }, error: null });

  await MyService.multipleQueries();

  expect(mockQueryBuilder.single).toHaveBeenCalledTimes(2);
});
```

### Transaction Pattern

```typescript
const mockSupabase = {
  from: jest.fn(() => mockQueryBuilder),
  rpc: jest.fn(),
};

it('should call RPC for transaction', async () => {
  mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: null });

  await MyService.transactionMethod();

  expect(mockSupabase.rpc).toHaveBeenCalledWith('my_function', expect.any(Object));
});
```

## What NOT to Do

### Never Test API Routes with Jest

```typescript
// ❌ NEVER DO THIS
// tests/api/trucks/route.test.ts
import { POST } from '@/app/api/trucks/route';

jest.mock('@/lib/supabase/server');
// This will NOT work - use Playwright instead
```

**Use Playwright E2E:**

```typescript
// tests/e2e.test.ts
test('API returns trucks', async ({ page }) => {
  await page.goto('/api/trucks');
  const response = await page.request.get('/api/trucks');
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  expect(data.trucks).toBeDefined();
});
```

### Never Use jest.mock() at Top of File

```typescript
// ❌ WRONG - Doesn't work with ts-jest ESM
jest.mock('@/lib/supabase/client');

import { MyService } from '@/lib/services/myService';
```

```typescript
// ✅ CORRECT - Use unstable_mockModule before import
jest.unstable_mockModule('@/lib/supabase/client', () => ({
  getSupabase: jest.fn(() => mockSupabase),
}));

const { MyService } = await import('@/lib/services/myService');
```

### Never Test Mock Behavior

```typescript
// ❌ BAD - Testing the mock, not the code
it('should call the API', () => {
  render(<Component />);
  expect(mockFetch).toHaveBeenCalled();
});

// ✅ GOOD - Test real behavior
it('should display data from API', async () => {
  mockFetch.mockResolvedValue({ data: { name: 'Test' } });
  render(<Component />);
  await waitFor(() => {
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

### Never Create Incomplete Mocks

```typescript
// ❌ BAD - Missing fields that real API has
const mockResponse = { status: 'success' };

// ✅ GOOD - Complete mock matching real response
const mockResponse = {
  status: 'success',
  data: { userId: '123', name: 'Alice' },
  metadata: { requestId: 'req-789', timestamp: 1234567890 },
};
```

## Global Mocks (jest.setup.ts)

These mocks are available in all tests:

```typescript
// jest.setup.ts
jest.mock('react-map-gl/mapbox', () => ({
  __esModule: true,
  Map: ({ children }: { children: React.ReactNode }) => children,
  Marker: ({ children, latitude, longitude }: any) =>
    React.createElement('div', { 'data-lat': latitude, 'data-lng': longitude }, children),
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => `<img src="${src}" alt="${alt}" />`,
}));
```

## Jest Configuration

Key settings in `jest.config.cjs`:

```javascript
module.exports = {
  preset: 'ts-jest/presets/default-esm',
  injectGlobals: true,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { useESM: true }],
  },
  testPathIgnorePatterns: ['<rootDir>/tests/e2e.test.ts', '<rootDir>/tests/.*\\.e2e\\.test\\.ts$'],
};
```

## Summary Table

| Test Type      | Location                  | Mock Pattern                 | Notes                     |
| -------------- | ------------------------- | ---------------------------- | ------------------------- |
| API Routes     | `tests/*.e2e.test.ts`     | Playwright (no Jest mocks)   | Use real DB or Playwright |
| Services       | `__tests__/lib/services/` | `jest.unstable_mockModule()` | Mock Supabase client      |
| Components     | `__tests__/components/`   | `jest.unstable_mockModule()` | Mock external deps        |
| Hooks          | `__tests__/hooks/`        | `jest.unstable_mockModule()` | Use `renderHook`          |
| Utilities      | `__tests__/utils/`        | No mocking needed            | Pure functions            |
| Zustand Stores | `tests/lib/stores/`       | Reset state in beforeEach    | Use `act()`               |
