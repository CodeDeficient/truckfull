type Row = Record<string, unknown>;

type QueryError = {
  code?: string;
  message: string;
  details?: string;
  hint?: string;
};

type QueryResult = {
  data: Row | Row[] | null;
  error: QueryError | null;
  count?: number;
};

interface EqFilter {
  column: string;
  value: unknown;
}

interface InFilter {
  column: string;
  values: unknown[];
}

interface IsFilter {
  column: string;
  value: boolean | null;
}

interface ComparisonFilter {
  column: string;
  value: unknown;
}

interface OrFilter {
  filters: string[];
}

interface OrderConfig {
  column: string;
  ascending: boolean;
}

interface RangeConfig {
  from: number;
  to: number;
}

type Operation = 'select' | 'insert' | 'update' | 'delete' | 'upsert';

type BeforeUpdateHook = (rows: Row[]) => Row[];

function canonicalJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonicalJson(nested)]),
    );
  }
  return value;
}

function valuesEqual(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
  return JSON.stringify(canonicalJson(left)) === JSON.stringify(canonicalJson(right));
}

/**
 * Splits a filter string on top-level commas, ignoring commas nested inside
 * parentheses (e.g. and(status.eq.applying,updated_at.lt.x) stays one unit).
 */
function splitTopLevelCommas(input: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const char of input) {
    if (char === '(') depth++;
    if (char === ')') depth--;
    if (char === ',' && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  parts.push(current);
  return parts;
}

/**
 * Coerces a stored value or filter bound to a comparable number, parsing
 * ISO timestamps when the value is a non-numeric string.
 */
function toComparableNumber(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

class FakeQueryBuilder {
  private operation: Operation | null = null;
  private filters: EqFilter[] = [];
  private neqFilters: EqFilter[] = [];
  private inFilters: InFilter[] = [];
  private isFilters: IsFilter[] = [];
  private gtFilters: ComparisonFilter[] = [];
  private gteFilters: ComparisonFilter[] = [];
  private lteFilters: ComparisonFilter[] = [];
  private orFilters: OrFilter[] = [];
  private orderCfg: OrderConfig | null = null;
  private rangeCfg: RangeConfig | null = null;
  private limitCount: number | null = null;
  private singleMode = false;
  private maybeSingleMode = false;
  private returnData = false;
  private payload: Row | Row[] | null = null;
  private readonly tableName: string;
  private readonly store: Map<string, Row[]>;
  private readonly beforeUpdateHooks: Map<string, BeforeUpdateHook[]>;

  constructor(
    tableName: string,
    store: Map<string, Row[]>,
    beforeUpdateHooks: Map<string, BeforeUpdateHook[]>,
  ) {
    this.tableName = tableName;
    this.store = store;
    this.beforeUpdateHooks = beforeUpdateHooks;
  }

  select(_columns?: string): this {
    if (this.operation === null) {
      this.operation = 'select';
    } else if (this.operation !== 'select') {
      this.returnData = true;
    }
    return this;
  }

  insert(data: Row | Row[]): this {
    this.operation = 'insert';
    this.payload = data;
    return this;
  }

  update(data: Row): this {
    this.operation = 'update';
    this.payload = data;
    return this;
  }

  delete(): this {
    this.operation = 'delete';
    return this;
  }

  upsert(data: Row | Row[]): this {
    this.operation = 'upsert';
    this.payload = data;
    return this;
  }

  eq(column: string, value: unknown): this {
    this.filters.push({ column, value });
    return this;
  }

  filter(column: string, operator: string, value: unknown): this {
    if (operator !== 'eq') return this;
    let parsed = value;
    if (typeof value === 'string') {
      try {
        parsed = JSON.parse(value) as unknown;
      } catch {
        parsed = value;
      }
    }
    this.filters.push({ column, value: parsed });
    return this;
  }

  neq(column: string, value: unknown): this {
    this.neqFilters.push({ column, value });
    return this;
  }

  in(column: string, values: unknown[]): this {
    this.inFilters.push({ column, values });
    return this;
  }

  is(column: string, value: boolean | null): this {
    this.isFilters.push({ column, value });
    return this;
  }

  gte(column: string, value: unknown): this {
    this.gteFilters.push({ column, value });
    return this;
  }

  gt(column: string, value: unknown): this {
    this.gtFilters.push({ column, value });
    return this;
  }

  lte(column: string, value: unknown): this {
    this.lteFilters.push({ column, value });
    return this;
  }

  /**
   * Accepts Supabase-style "col.op.value,col2.eq.v2" strings.
   * Supports the eq / lt / is.null predicates and and(...) groups used by
   * schedule override writes and confirmation claims.
   */
  or(filterString: string): this {
    const parsed: string[] = [];
    for (const clause of splitTopLevelCommas(filterString)) {
      if (!clause.trim()) continue;
      const groupMatch = clause.match(/^and\((.+)\)$/);
      if (groupMatch) {
        const groupClauses: string[] = [];
        for (const inner of splitTopLevelCommas(groupMatch[1])) {
          const innerTrimmed = inner.trim();
          if (!innerTrimmed) continue;
          const eqMatch = innerTrimmed.match(/^(\w+)\.eq\.(.+)$/);
          if (eqMatch) {
            groupClauses.push(`eq(${eqMatch[1]},${eqMatch[2]})`);
            continue;
          }
          const ltMatch = innerTrimmed.match(/^(\w+)\.lt\.(.+)$/);
          if (ltMatch) {
            groupClauses.push(`lt(${ltMatch[1]},${ltMatch[2]})`);
            continue;
          }
          const gtMatch = innerTrimmed.match(/^(\w+)\.gt\.(.+)$/);
          if (gtMatch) {
            groupClauses.push(`gt(${gtMatch[1]},${gtMatch[2]})`);
            continue;
          }
          const isNullMatch = innerTrimmed.match(/^(\w+)\.is\.null$/);
          if (isNullMatch) {
            groupClauses.push(`is(${isNullMatch[1]},null)`);
            continue;
          }
          groupClauses.push(innerTrimmed);
        }
        parsed.push(`and(${groupClauses.join(',')})`);
        continue;
      }
      const isNullMatch = clause.match(/^(\w+)\.is\.null$/);
      if (isNullMatch) {
        parsed.push(`is(${isNullMatch[1]},null)`);
        continue;
      }
      const eqMatch = clause.match(/^(\w+)\.eq\.(.+)$/);
      if (eqMatch) {
        parsed.push(`eq(${eqMatch[1]},${eqMatch[2]})`);
        continue;
      }
      const ltMatch = clause.match(/^(\w+)\.lt\.(.+)$/);
      if (ltMatch) {
        parsed.push(`lt(${ltMatch[1]},${ltMatch[2]})`);
        continue;
      }
      parsed.push(clause.trim());
    }
    this.orFilters.push({ filters: parsed });
    return this;
  }

  order(column: string, options: { ascending?: boolean } = {}): this {
    this.orderCfg = { column, ascending: options.ascending ?? true };
    return this;
  }

  range(from: number, to: number): this {
    this.rangeCfg = { from, to };
    return this;
  }

  limit(count: number): this {
    this.limitCount = count;
    return this;
  }

  single(): this {
    this.singleMode = true;
    return this;
  }

  maybeSingle(): this {
    this.maybeSingleMode = true;
    return this;
  }

  private matchFilters(row: Row): boolean {
    for (const f of this.filters) {
      if (!valuesEqual(row[f.column], f.value)) return false;
    }
    for (const f of this.neqFilters) {
      if (row[f.column] === f.value) return false;
    }
    for (const f of this.inFilters) {
      if (!f.values.includes(row[f.column])) return false;
    }
    for (const f of this.isFilters) {
      const val = row[f.column];
      if (f.value === null) {
        if (val !== null && val !== undefined) return false;
      } else if (val !== f.value) {
        return false;
      }
    }
    for (const f of this.gtFilters) {
      const val = toComparableNumber(row[f.column]);
      const bound = toComparableNumber(f.value);
      if (val === null || bound === null || val <= bound) return false;
    }
    for (const f of this.gteFilters) {
      const val = row[f.column];
      const bound = f.value as number;
      if (val == null || (val as number) < bound) return false;
    }
    for (const f of this.lteFilters) {
      const val = row[f.column];
      const bound = f.value as number;
      if (val == null || (val as number) > bound) return false;
    }
    for (const group of this.orFilters) {
      const anyMatch = group.filters.some((clause) => {
        const groupMatch = clause.match(/^and\((.+)\)$/);
        if (groupMatch) {
          return splitTopLevelCommas(groupMatch[1]).every((inner) => {
            const eqMatch = inner.match(/^eq\((\w+),(.+)\)$/);
            if (eqMatch) return row[eqMatch[1]] === eqMatch[2];
            const ltMatch = inner.match(/^lt\((\w+),(.+)\)$/);
            if (ltMatch) {
              const val = row[ltMatch[1]];
              const bound = toComparableNumber(ltMatch[2]);
              if (bound === null) return false;
              const valNum = toComparableNumber(val);
              return valNum !== null && valNum < bound;
            }
            const gtMatch = inner.match(/^gt\((\w+),(.+)\)$/);
            if (gtMatch) {
              const val = row[gtMatch[1]];
              const bound = toComparableNumber(gtMatch[2]);
              if (bound === null) return false;
              const valNum = toComparableNumber(val);
              return valNum !== null && valNum > bound;
            }
            return false;
          });
        }
        const eqMatch = clause.match(/^eq\((\w+),(.+)\)$/);
        if (eqMatch) return row[eqMatch[1]] === eqMatch[2];
        const ltMatch = clause.match(/^lt\((\w+),(.+)\)$/);
        if (ltMatch) {
          const val = row[ltMatch[1]];
          const bound = toComparableNumber(ltMatch[2]);
          if (bound === null) return false;
          const valNum = toComparableNumber(val);
          if (valNum === null) return true;
          return valNum < bound;
        }
        const isNullMatch = clause.match(/^is\((\w+),null\)$/);
        if (isNullMatch) {
          const val = row[isNullMatch[1]];
          return val === null || val === undefined;
        }
        return false;
      });
      if (!anyMatch) return false;
    }
    return true;
  }

  private filterRows(rows: Row[]): Row[] {
    return rows.filter((r) => this.matchFilters(r));
  }

  private sortRows(rows: Row[]): Row[] {
    if (!this.orderCfg) return rows;
    const { column, ascending } = this.orderCfg;
    return [...rows].sort((a, b) => {
      const av = a[column];
      const bv = b[column];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av < bv) return ascending ? -1 : 1;
      if (av > bv) return ascending ? 1 : -1;
      return 0;
    });
  }

  private paginateRows(rows: Row[]): Row[] {
    if (this.rangeCfg) return rows.slice(this.rangeCfg.from, this.rangeCfg.to + 1);
    if (this.limitCount != null) return rows.slice(0, this.limitCount);
    return rows;
  }

  private singleResult(rows: Row[], totalCount?: number): QueryResult {
    if (rows.length === 0) {
      return {
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
        ...(totalCount !== undefined ? { count: 0 } : {}),
      };
    }
    return {
      data: rows[0],
      error: null,
      ...(totalCount !== undefined ? { count: totalCount } : {}),
    };
  }

  private maybeSingleResult(rows: Row[]): QueryResult {
    if (rows.length === 0) {
      return { data: null, error: null };
    }
    return { data: rows[0], error: null };
  }

  private execute(): QueryResult {
    if (this.operation === 'update') {
      const hooks = this.beforeUpdateHooks.get(this.tableName);
      const hook = hooks?.shift();
      if (hook) {
        const currentRows = [...(this.store.get(this.tableName) ?? [])];
        this.store.set(this.tableName, hook(currentRows));
      }
    }
    const allRows = [...(this.store.get(this.tableName) ?? [])];

    switch (this.operation) {
      case 'select': {
        let rows = this.filterRows(allRows);
        const totalCount = rows.length;
        rows = this.sortRows(rows);
        rows = this.paginateRows(rows);
        if (this.singleMode) {
          return this.singleResult(rows, this.rangeCfg ? totalCount : undefined);
        }
        if (this.maybeSingleMode) {
          return this.maybeSingleResult(rows);
        }
        if (this.rangeCfg) {
          return { data: rows, error: null, count: totalCount };
        }
        return { data: rows, error: null };
      }

      case 'insert': {
        const items = Array.isArray(this.payload)
          ? this.payload
          : this.payload
            ? [this.payload]
            : [];
        const newRows = items.map((r) => ({
          ...r,
          ...(r.id === undefined ? { id: crypto.randomUUID() } : {}),
        }));
        this.store.set(this.tableName, [...allRows, ...newRows]);
        if (this.returnData) {
          return this.singleMode ? this.singleResult(newRows) : { data: newRows, error: null };
        }
        return { data: null, error: null };
      }

      case 'update': {
        const matchIndices = new Set<number>();
        allRows.forEach((r, i) => {
          if (this.matchFilters(r)) matchIndices.add(i);
        });
        const updated = allRows.map((r, i) =>
          matchIndices.has(i) ? { ...r, ...(this.payload as Row) } : r,
        );
        this.store.set(this.tableName, updated);
        const resultRows = updated.filter((_, i) => matchIndices.has(i));
        if (this.returnData) {
          if (this.singleMode) {
            return this.singleResult(resultRows);
          }
          if (this.maybeSingleMode) {
            return this.maybeSingleResult(resultRows);
          }
          return { data: resultRows, error: null };
        }
        return { data: null, error: null };
      }

      case 'delete': {
        const matchIndices = new Set<number>();
        allRows.forEach((r, i) => {
          if (this.matchFilters(r)) matchIndices.add(i);
        });
        const remaining = allRows.filter((_, i) => !matchIndices.has(i));
        const deleted = allRows.filter((_, i) => matchIndices.has(i));
        this.store.set(this.tableName, remaining);
        if (this.returnData) {
          return this.singleMode ? this.singleResult(deleted) : { data: deleted, error: null };
        }
        return { data: null, error: null };
      }

      case 'upsert': {
        const items = Array.isArray(this.payload)
          ? this.payload
          : this.payload
            ? [this.payload]
            : [];
        const rows = [...allRows];
        const upserted: Row[] = [];
        for (const newRow of items) {
          const idx = rows.findIndex((r) => r.id === (newRow as Row).id);
          if (idx >= 0) {
            rows[idx] = { ...rows[idx], ...newRow };
            upserted.push(rows[idx]);
          } else {
            const inserted = { ...newRow };
            rows.push(inserted);
            upserted.push(inserted);
          }
        }
        this.store.set(this.tableName, rows);
        if (this.returnData) {
          return this.singleMode ? this.singleResult(upserted) : { data: upserted, error: null };
        }
        return { data: null, error: null };
      }

      default:
        return { data: null, error: null };
    }
  }

  then(
    onfulfilled?: ((value: QueryResult) => unknown) | null,
    onrejected?: ((reason: unknown) => unknown) | null,
  ): Promise<unknown> {
    const p: Promise<QueryResult> = Promise.resolve(this.execute());
    if (onfulfilled && onrejected) return p.then(onfulfilled, onrejected);
    if (onfulfilled) return p.then(onfulfilled);
    if (onrejected) return p.then(undefined, onrejected);
    return p;
  }
}

type ChannelCallback = {
  event: string;
  callback: (...args: unknown[]) => void;
};

class FakeChannel {
  private callbacks: ChannelCallback[] = [];
  private subscribed = false;

  on(event: string, _filter: unknown, callback: (...args: unknown[]) => void): this {
    this.callbacks.push({ event, callback });
    return this;
  }

  subscribe(cb?: () => void): this {
    this.subscribed = true;
    cb?.();
    return this;
  }

  unsubscribe(): void {
    this.subscribed = false;
    this.callbacks = [];
  }

  isSubscribed(): boolean {
    return this.subscribed;
  }

  emit(event: string, ...args: unknown[]): void {
    for (const entry of this.callbacks) {
      if (entry.event === event || entry.event === '*') {
        entry.callback(...args);
      }
    }
  }
}

type AuthUser = Row | null;

class FakeAuth {
  private userResult: AuthUser = null;

  setUser(user: AuthUser): void {
    this.userResult = user;
  }

  getUser(): Promise<{ data: { user: AuthUser }; error: QueryError | null }> {
    return Promise.resolve({ data: { user: this.userResult }, error: null });
  }

  getSession(): Promise<{ data: { session: unknown }; error: QueryError | null }> {
    return Promise.resolve({ data: { session: null }, error: null });
  }
}

type RpcStub = (args: Record<string, unknown>) => unknown;

interface FakeSupabaseClient {
  from(tableName: string): FakeQueryBuilder;
  rpc(fnName: string, args: Record<string, unknown>): Promise<QueryResult>;
  channel(name: string): FakeChannel;
  auth: FakeAuth;
}

interface FakeSupabaseFactory {
  client: FakeSupabaseClient;
  seedTable: (tableName: string, rows: Row[]) => void;
  clearAll: () => void;
  stubRpc: (fnName: string, impl: RpcStub) => void;
  getChannel: (name: string) => FakeChannel | undefined;
  beforeNextUpdate: (tableName: string, hook: BeforeUpdateHook) => void;
}

function createFakeSupabaseClient(): FakeSupabaseFactory {
  const store = new Map<string, Row[]>();
  const rpcStubs = new Map<string, RpcStub>();
  const channels = new Map<string, FakeChannel>();
  const beforeUpdateHooks = new Map<string, BeforeUpdateHook[]>();
  const fakeAuth = new FakeAuth();

  const client: FakeSupabaseClient = {
    from(tableName: string): FakeQueryBuilder {
      return new FakeQueryBuilder(tableName, store, beforeUpdateHooks);
    },

    rpc(fnName: string, args: Record<string, unknown>): Promise<QueryResult> {
      const stub = rpcStubs.get(fnName);
      if (stub) {
        return Promise.resolve({ data: stub(args) as Row | Row[] | null, error: null });
      }
      return Promise.resolve({
        data: null,
        error: { message: `RPC function "${fnName}" not stubbed` },
      });
    },

    channel(name: string): FakeChannel {
      let ch = channels.get(name);
      if (!ch) {
        ch = new FakeChannel();
        channels.set(name, ch);
      }
      return ch;
    },

    auth: fakeAuth,
  };

  return {
    client,
    seedTable(tableName: string, rows: Row[]): void {
      store.set(
        tableName,
        rows.map((r) => ({ ...r })),
      );
    },
    clearAll(): void {
      store.clear();
      rpcStubs.clear();
      channels.clear();
      beforeUpdateHooks.clear();
      fakeAuth.setUser(null);
    },
    stubRpc(fnName: string, impl: RpcStub): void {
      rpcStubs.set(fnName, impl);
    },
    getChannel(name: string): FakeChannel | undefined {
      return channels.get(name);
    },
    beforeNextUpdate(tableName: string, hook: BeforeUpdateHook): void {
      const hooks = beforeUpdateHooks.get(tableName) ?? [];
      hooks.push(hook);
      beforeUpdateHooks.set(tableName, hooks);
    },
  };
}

export { createFakeSupabaseClient, FakeQueryBuilder, FakeChannel, FakeAuth };
export type { FakeSupabaseClient, FakeSupabaseFactory, QueryResult, QueryError, Row };
