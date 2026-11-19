import { describe, expect, it } from '@jest/globals';
import { sortEventEntries } from '@/lib/events/eventSort';

const entries = [
  { key: '1', title: 'Wing Fest', date: '2026-11-22' },
  { key: '2', title: '2nd Annual Oyster Roast', date: '2026-10-25' },
  { key: '3', title: 'apple Market', date: '2026-11-22' },
  { key: '4', title: '10th Annual Chili Cook-Off', date: null },
];

describe('sortEventEntries', () => {
  it('sorts soonest first, undated last, ties by title', () => {
    expect(sortEventEntries(entries, 'date').map((e) => e.key)).toEqual(['2', '3', '1', '4']);
  });

  it('sorts A to Z ignoring case and ordering numbers naturally', () => {
    expect(sortEventEntries(entries, 'az').map((e) => e.key)).toEqual(['2', '4', '3', '1']);
  });

  it('leaves the input untouched', () => {
    const copy = [...entries];
    sortEventEntries(entries, 'az');
    expect(entries).toEqual(copy);
  });
});
