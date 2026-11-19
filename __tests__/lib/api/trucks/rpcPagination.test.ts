import { describe, expect, it, jest } from '@jest/globals';
import {
  DEFAULT_RPC_PAGE_SIZE,
  MAX_RPC_PAGES,
  fetchAllRpcRows,
  type RpcPage,
} from '@/lib/api/trucks/rpcPagination';

const page = <T>(rows: T[], count: number | null): RpcPage<T> => ({ rows, count });

describe('fetchAllRpcRows', () => {
  it('starts the remaining counted pages before either finishes and preserves row order', async () => {
    const ranges: number[] = [];
    const finishPages: Array<() => void> = [];
    const fetchPage = async (from: number): Promise<RpcPage<number>> => {
      ranges.push(from);
      const rows = Array.from({ length: DEFAULT_RPC_PAGE_SIZE }, (_, index) => from + index);
      if (from === 0) return page(rows, 3 * DEFAULT_RPC_PAGE_SIZE);
      return new Promise((resolve) => {
        finishPages.push(() => resolve(page(rows, null)));
      });
    };

    const result = fetchAllRpcRows(fetchPage);
    await Promise.resolve();
    await Promise.resolve();
    expect(ranges).toEqual([0, DEFAULT_RPC_PAGE_SIZE, 2 * DEFAULT_RPC_PAGE_SIZE]);
    finishPages.reverse().forEach((finish) => finish());
    expect(await result).toEqual(
      Array.from({ length: 3 * DEFAULT_RPC_PAGE_SIZE }, (_, index) => index),
    );
  });

  it('returns rows from a single short page without requesting another', async () => {
    const fetchPage = jest.fn(async () => page([1, 2, 3], 3));

    const rows = await fetchAllRpcRows(fetchPage);

    expect(rows).toEqual([1, 2, 3]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(fetchPage).toHaveBeenCalledWith(0, DEFAULT_RPC_PAGE_SIZE - 1, { withCount: true });
  });

  it('requests the exact count only on the first page', async () => {
    const first = Array.from({ length: DEFAULT_RPC_PAGE_SIZE }, (_, i) => i);
    const second = [2000, 2001];
    const fetchPage = jest.fn(async (from: number) =>
      from === 0 ? page(first, 2002) : page(second, 2002),
    );

    await fetchAllRpcRows(fetchPage);

    expect(fetchPage).toHaveBeenNthCalledWith(1, 0, DEFAULT_RPC_PAGE_SIZE - 1, {
      withCount: true,
    });
    expect(fetchPage).toHaveBeenNthCalledWith(
      2,
      DEFAULT_RPC_PAGE_SIZE,
      2 * DEFAULT_RPC_PAGE_SIZE - 1,
      { withCount: false },
    );
  });

  it('concatenates every page in order when the total exceeds one page', async () => {
    const first = Array.from({ length: DEFAULT_RPC_PAGE_SIZE }, (_, i) => i);
    const second = Array.from({ length: DEFAULT_RPC_PAGE_SIZE }, (_, i) => DEFAULT_RPC_PAGE_SIZE + i);
    const third = [9000, 9001];
    const pages = [page(first, 2002), page(second, 2002), page(third, 2002)];
    const fetchPage = jest.fn(async (from: number, to: number) => pages[Math.floor(from / DEFAULT_RPC_PAGE_SIZE)]);

    const rows = await fetchAllRpcRows(fetchPage);

    expect(rows).toHaveLength(2002);
    expect(rows[0]).toBe(0);
    expect(rows[DEFAULT_RPC_PAGE_SIZE]).toBe(DEFAULT_RPC_PAGE_SIZE);
    expect(rows.at(-1)).toBe(9001);
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });

  it('stops once the accumulated rows reach the reported count even on a full page', async () => {
    const full = Array.from({ length: DEFAULT_RPC_PAGE_SIZE }, (_, i) => i);
    const fetchPage = jest.fn(async () => page(full, DEFAULT_RPC_PAGE_SIZE));

    const rows = await fetchAllRpcRows(fetchPage);

    expect(rows).toHaveLength(DEFAULT_RPC_PAGE_SIZE);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('requests a follow-up page when a full page is returned and the count is unknown', async () => {
    const full = Array.from({ length: DEFAULT_RPC_PAGE_SIZE }, (_, i) => i);
    const fetchPage = jest
      .fn<() => Promise<RpcPage<number>>>()
      .mockResolvedValueOnce(page(full, null))
      .mockResolvedValueOnce(page([], null));

    const rows = await fetchAllRpcRows(fetchPage);

    expect(rows).toHaveLength(DEFAULT_RPC_PAGE_SIZE);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it('returns an empty array when the first page is empty', async () => {
    const fetchPage = jest.fn(async () => page([], 0));

    const rows = await fetchAllRpcRows(fetchPage);

    expect(rows).toEqual([]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('never exceeds the page guard when the backend reports a stale count', async () => {
    const full = Array.from({ length: DEFAULT_RPC_PAGE_SIZE }, (_, i) => i);
    const fetchPage = jest.fn(async () => page(full, Number.MAX_SAFE_INTEGER));

    const rows = await fetchAllRpcRows(fetchPage);

    expect(fetchPage).toHaveBeenCalledTimes(MAX_RPC_PAGES);
    expect(rows).toHaveLength(DEFAULT_RPC_PAGE_SIZE * MAX_RPC_PAGES);
  });
});
