import { jest } from '@jest/globals';

export const unstable_cache = jest.fn((fn: (...args: unknown[]) => unknown) => fn);
export const revalidateTag = jest.fn();
export const revalidatePath = jest.fn();
export const revalidate = jest.fn();
export const cache = jest.fn((fn: (...args: unknown[]) => unknown) => fn);