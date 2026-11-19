import { describe, expect, it } from '@jest/globals';
import { buildRowOffsets, computeVirtualWindow } from '@/components/home/useVirtualRows';

const offsets = Array.from({ length: 11 }, (_, index) => index * 100);

describe('buildRowOffsets', () => {
  it('advances by the estimate for unmeasured rows', () => {
    expect(buildRowOffsets(['a', 'b', 'c'], new Map(), 100)).toEqual([0, 100, 200, 300]);
  });

  it('keeps a measured height attached to its key when the order changes', () => {
    const measured = new Map([['c', 500]]);

    const forward = buildRowOffsets(['a', 'b', 'c'], measured, 100);
    const reversed = buildRowOffsets(['c', 'b', 'a'], measured, 100);

    expect(forward).toEqual([0, 100, 200, 700]);
    expect(reversed).toEqual([0, 500, 600, 700]);
  });

  it('does not carry a measured height to a different key after a swap', () => {
    const measured = new Map([['a', 300]]);

    const offsets = buildRowOffsets(['b', 'c'], measured, 100);

    expect(offsets).toEqual([0, 100, 200]);
  });
});

describe('computeVirtualWindow with measured offsets', () => {
  it('uses the measured height for a row when it differs from the estimate', () => {
    const mixed = [0, 120, 240, 340];
    const window = computeVirtualWindow({
      offsets: mixed,
      scrollTop: 130,
      viewportHeight: 100,
      overscan: 0,
    });

    expect(window.startIndex).toBe(1);
    expect(window.offsetY).toBe(120);
  });
});

describe('computeVirtualWindow', () => {
  it('renders only the rows intersecting the viewport plus overscan', () => {
    const window = computeVirtualWindow({
      offsets,
      scrollTop: 0,
      viewportHeight: 250,
      overscan: 0,
    });

    expect(window.startIndex).toBe(0);
    expect(window.endIndex).toBe(3);
    expect(window.offsetY).toBe(0);
  });

  it('starts at the first row not fully scrolled past', () => {
    const window = computeVirtualWindow({
      offsets,
      scrollTop: 350,
      viewportHeight: 200,
      overscan: 0,
    });

    expect(window.startIndex).toBe(3);
    expect(window.offsetY).toBe(300);
    expect(window.endIndex).toBe(6);
  });

  it('extends the range by the overscan on each side without exceeding the bounds', () => {
    const window = computeVirtualWindow({
      offsets,
      scrollTop: 350,
      viewportHeight: 200,
      overscan: 2,
    });

    expect(window.startIndex).toBe(1);
    expect(window.endIndex).toBe(8);
  });

  it('clamps the start at zero when the overscan would precede the first row', () => {
    const window = computeVirtualWindow({
      offsets,
      scrollTop: 0,
      viewportHeight: 50,
      overscan: 4,
    });

    expect(window.startIndex).toBe(0);
  });

  it('clamps the end at the item count when the overscan would exceed it', () => {
    const window = computeVirtualWindow({
      offsets,
      scrollTop: 900,
      viewportHeight: 200,
      overscan: 10,
    });

    expect(window.endIndex).toBe(10);
  });

  it('returns an empty range when there are no rows', () => {
    const window = computeVirtualWindow({
      offsets: [0],
      scrollTop: 0,
      viewportHeight: 500,
      overscan: 6,
    });

    expect(window.startIndex).toBe(0);
    expect(window.endIndex).toBe(0);
  });
});
