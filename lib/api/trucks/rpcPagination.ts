export interface RpcPage<T> {
  rows: T[];
  count: number | null;
}

export const DEFAULT_RPC_PAGE_SIZE = 1000;

export const MAX_RPC_PAGES = 50;

export interface FetchRpcPageOptions {
  readonly withCount: boolean;
}

export type FetchRpcPage<T> = (
  from: number,
  to: number,
  options: FetchRpcPageOptions,
) => Promise<RpcPage<T>>;

function rangeArgs(pageIndex: number): [number, number] {
  const from = pageIndex * DEFAULT_RPC_PAGE_SIZE;
  return [from, from + DEFAULT_RPC_PAGE_SIZE - 1];
}

export async function fetchAllRpcRows<T>(fetchPage: FetchRpcPage<T>): Promise<T[]> {
  const [firstFrom, firstTo] = rangeArgs(0);
  const first = await fetchPage(firstFrom, firstTo, { withCount: true });
  const rows = [...first.rows];

  if (first.rows.length < DEFAULT_RPC_PAGE_SIZE) return rows;
  if (first.count !== null && rows.length >= first.count) return rows;

  if (first.count === null) {
    for (let pageIndex = 1; pageIndex < MAX_RPC_PAGES; pageIndex += 1) {
      const [from, to] = rangeArgs(pageIndex);
      const { rows: pageRows } = await fetchPage(from, to, { withCount: false });
      rows.push(...pageRows);
      if (pageRows.length < DEFAULT_RPC_PAGE_SIZE) break;
    }
    return rows;
  }

  const pageCount = Math.min(MAX_RPC_PAGES, Math.ceil(first.count / DEFAULT_RPC_PAGE_SIZE));
  const remaining = await Promise.all(
    Array.from({ length: pageCount - 1 }, (_, offset) => {
      const [from, to] = rangeArgs(offset + 1);
      return fetchPage(from, to, { withCount: false });
    }),
  );
  for (const page of remaining) rows.push(...page.rows);

  return rows;
}
