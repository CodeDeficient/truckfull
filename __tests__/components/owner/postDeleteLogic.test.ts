import { describe, it, expect, beforeEach, jest } from '@jest/globals';

const mockLocalStorage: Record<string, string> = {};

Object.defineProperty(global, 'localStorage', {
  value: {
    getItem: jest.fn((key: string) => mockLocalStorage[key] ?? null),
    setItem: jest.fn((key: string, value: string) => {
      mockLocalStorage[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete mockLocalStorage[key];
    }),
    clear: jest.fn(() => {
      Object.keys(mockLocalStorage).forEach((k) => delete mockLocalStorage[k]);
    }),
  },
  writable: true,
});

// Dynamic import per test block to reset module-level side effects
// (shouldShowDeleteNotice reads localStorage at call time, but the ESM
// module cache persists across tests. Re-importing ensures each test
// evaluates the function with the current mockLocalStorage state.)
async function loadHelpers() {
  const mod = await import('@/components/owner/PostProcessingHistory');
  return mod as {
    shouldShowDeleteNotice: () => boolean;
    setPostError: (errors: Record<string, string>, postId: string, message: string) => Record<string, string>;
    clearPostError: (errors: Record<string, string>, postId: string) => Record<string, string>;
  };
}

describe('shouldShowDeleteNotice', () => {
  beforeEach(() => {
    Object.keys(mockLocalStorage).forEach((k) => delete mockLocalStorage[k]);
  });

  it('returns true when postDeleteNoticeDismissed is not set', async () => {
    const { shouldShowDeleteNotice } = await loadHelpers();
    expect(shouldShowDeleteNotice()).toBe(true);
  });

  it('returns false when postDeleteNoticeDismissed is set to "true"', async () => {
    mockLocalStorage['postDeleteNoticeDismissed'] = 'true';
    const { shouldShowDeleteNotice } = await loadHelpers();
    expect(shouldShowDeleteNotice()).toBe(false);
  });
});

describe('setPostError / clearPostError', () => {
  it('adds an error for a postId', async () => {
    const { setPostError } = await loadHelpers();
    const result = setPostError({}, 'post-1', 'Failed');
    expect(result).toEqual({ 'post-1': 'Failed' });
  });

  it('preserves existing errors when adding a new one', async () => {
    const { setPostError } = await loadHelpers();
    const withFirst = setPostError({}, 'post-1', 'Failed');
    const result = setPostError(withFirst, 'post-2', 'Network error');
    expect(result).toEqual({ 'post-1': 'Failed', 'post-2': 'Network error' });
  });

  it('overwrites error for same postId', async () => {
    const { setPostError } = await loadHelpers();
    const withFirst = setPostError({}, 'post-1', 'Failed');
    const result = setPostError(withFirst, 'post-1', 'New error');
    expect(result).toEqual({ 'post-1': 'New error' });
  });

  it('clears an existing error for a postId', async () => {
    const { clearPostError, setPostError } = await loadHelpers();
    const withError = setPostError({}, 'post-1', 'Failed');
    const result = clearPostError(withError, 'post-1');
    expect(result).toEqual({});
  });

  it('returns same object when clearing a postId with no error', async () => {
    const { clearPostError } = await loadHelpers();
    const original = { 'post-2': 'Error' };
    const result = clearPostError(original, 'post-1');
    expect(result).toBe(original);
  });
});
