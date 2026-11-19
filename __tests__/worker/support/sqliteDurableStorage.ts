import { DatabaseSync } from 'node:sqlite';

type Row = Record<string, unknown>;
type Binding = string | number | bigint | null;

export interface SqlCursor {
  toArray: () => Row[];
  one: () => Row;
}

export interface SqlHandle {
  exec: (query: string, ...binds: Binding[]) => SqlCursor;
}

export interface DurableStorage {
  readonly sql: SqlHandle;
  transactionSync: <T>(run: () => T) => T;
  getAlarm: () => Promise<number | null>;
  setAlarm: (at: number) => Promise<void>;
  deleteAll: () => Promise<void>;
}

export interface DurableContext {
  readonly storage: DurableStorage;
  readonly background: Promise<unknown>[];
  blockConcurrencyWhile: (run: () => Promise<void>) => Promise<void>;
  waitUntil: (task: Promise<unknown>) => void;
}

function cursor(rows: Row[]): SqlCursor {
  return {
    toArray: () => rows,
    one: () => {
      if (rows.length !== 1) throw new Error(`expected one row, got ${rows.length}`);
      return rows[0];
    },
  };
}

function sqlHandle(db: DatabaseSync): SqlHandle {
  return {
    exec(query, ...binds) {
      const statement = db.prepare(query);
      if (statement.columns().length === 0) {
        statement.run(...binds);
        return cursor([]);
      }
      return cursor(statement.all(...binds) as Row[]);
    },
  };
}

function dropEverything(db: DatabaseSync): void {
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
    .all() as Array<{ name: string }>;
  for (const { name } of tables) db.exec(`DROP TABLE "${name}"`);
}

export function createDurableContext(): DurableContext {
  const db = new DatabaseSync(':memory:');
  let alarm: number | null = null;
  const background: Promise<unknown>[] = [];
  const storage: DurableStorage = {
    sql: sqlHandle(db),
    transactionSync(run) {
      db.exec('BEGIN');
      try {
        const result = run();
        db.exec('COMMIT');
        return result;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
    getAlarm: () => Promise.resolve(alarm),
    setAlarm: (at) => {
      alarm = at;
      return Promise.resolve();
    },
    deleteAll: () => {
      dropEverything(db);
      alarm = null;
      return Promise.resolve();
    },
  };
  return {
    storage,
    background,
    blockConcurrencyWhile: (run) => run(),
    waitUntil: (task) => {
      background.push(task);
    },
  };
}
