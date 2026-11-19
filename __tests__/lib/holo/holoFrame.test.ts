import { describe, expect, it } from '@jest/globals';
import { FULL_SPAN, MIN_SPAN, frameFor } from '@/lib/holo/holoFrame';

describe('frameFor', () => {
  it('shows the whole scene centred on wide desktop heroes', () => {
    expect(frameFor(1600, 500, 1)).toEqual({ focusX: 0, span: FULL_SPAN });
  });

  it('zooms to the focal point on tall phone heroes', () => {
    expect(frameFor(390, 900, 1)).toEqual({ focusX: 1, span: MIN_SPAN });
  });

  it('moves smoothly between the two as the hero narrows', () => {
    const frame = frameFor(390, 250, 1);
    expect(frame.span).toBeGreaterThan(MIN_SPAN);
    expect(frame.span).toBeLessThan(FULL_SPAN);
    expect(frame.focusX).toBeGreaterThan(0);
    expect(frame.focusX).toBeLessThan(1);
  });
});
