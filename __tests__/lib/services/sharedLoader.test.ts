import { describe, it, expect } from '@jest/globals';
import { createSharedLoader, freezeRows } from '@/lib/services/sharedLoader';

function countingLoader(results: Array<() => Promise<string[]>>): {
  load: () => Promise<string[]>;
  calls: () => number;
} {
  let calls = 0;
  return {
    load: () => {
      const result = results[Math.min(calls, results.length - 1)];
      calls += 1;
      return result();
    },
    calls: () => calls,
  };
}

describe('createSharedLoader', () => {
  it('gives concurrent and later callers the same loaded value until it ages out', async () => {
    let clock = 0;
    const source = countingLoader([() => Promise.resolve(['a'])]);
    const getRows = createSharedLoader(source.load, 1000, () => clock);

    const [first, second] = await Promise.all([getRows(), getRows()]);
    clock = 999;
    const third = await getRows();

    expect(source.calls()).toBe(1);
    expect(second).toBe(first);
    expect(third).toBe(first);
  });

  it('loads again once the value is older than the limit', async () => {
    let clock = 0;
    const source = countingLoader([() => Promise.resolve(['old']), () => Promise.resolve(['new'])]);
    const getRows = createSharedLoader(source.load, 1000, () => clock);

    await getRows();
    clock = 1000;

    expect(await getRows()).toEqual(['new']);
    expect(source.calls()).toBe(2);
  });

  it('does not keep a failed load, so the next caller retries', async () => {
    const source = countingLoader([
      () => Promise.reject(new Error('database unavailable')),
      () => Promise.resolve(['recovered']),
    ]);
    const getRows = createSharedLoader(source.load, 60_000, () => 0);

    await expect(getRows()).rejects.toThrow('database unavailable');
    expect(await getRows()).toEqual(['recovered']);
  });
});

describe('freezeRows', () => {
  it('stops callers from changing shared rows or their order', () => {
    const rows = freezeRows([{ name: 'b' }, { name: 'a' }]);

    expect(Object.isFrozen(rows)).toBe(true);
    expect(rows.every((row) => Object.isFrozen(row))).toBe(true);
    expect(() => (rows as Array<{ name: string }>).sort()).toThrow(TypeError);
  });
});
