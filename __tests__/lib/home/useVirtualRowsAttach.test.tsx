/**
 * @jest-environment jsdom
 */
import React, { useRef } from 'react';
import { render, fireEvent } from '@testing-library/react';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

import { useVirtualRows } from '@/components/home/useVirtualRows';

const KEYS = Array.from({ length: 50 }, (_, i) => `row-${i}`);

function Harness({ showContainer }: { showContainer: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { startIndex, endIndex } = useVirtualRows({
    keys: KEYS,
    estimatedItemHeight: 60,
    scrollRef,
  });
  const rows: string[] = [];
  for (let i = startIndex; i < endIndex; i++) rows.push(KEYS[i]);
  return (
    <div>
      {showContainer && (
        <div ref={scrollRef} data-testid="scroller">
          {rows.map((key) => (
            <div key={key} data-testid="row">
              {key}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

describe('useVirtualRows listener attachment', () => {
  let originalRaf: typeof globalThis.requestAnimationFrame;

  beforeEach(() => {
    originalRaf = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    }) as typeof globalThis.requestAnimationFrame;
  });

  afterEach(() => {
    globalThis.requestAnimationFrame = originalRaf;
  });

  it('attaches the scroll listener when the container mounts after the first render', () => {
    const { rerender, getAllByTestId, queryByTestId } = render(
      <Harness showContainer={false} />,
    );

    expect(queryByTestId('scroller')).toBeNull();

    rerender(<Harness showContainer={true} />);

    const scroller = queryByTestId('scroller');
    expect(scroller).not.toBeNull();
    if (!scroller) return;

    Object.defineProperty(scroller, 'clientHeight', { value: 300, configurable: true });
    fireEvent.scroll(scroller);

    const rowCount = getAllByTestId('row').length;
    expect(rowCount).toBeGreaterThan(6);
  });
});
