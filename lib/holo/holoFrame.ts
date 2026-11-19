export interface HoloFrame {
  readonly focusX: number;
  readonly span: number;
}

export const FULL_SPAN = 13;
export const MIN_SPAN = 7.6;
const UNITS_PER_HEIGHT = 1 / 0.185;

export function frameFor(width: number, height: number, focusX: number): HoloFrame {
  const fit = (width / Math.max(height, 1)) * UNITS_PER_HEIGHT;
  const span = Math.min(Math.max(fit, MIN_SPAN), FULL_SPAN);
  const crop = (FULL_SPAN - span) / (FULL_SPAN - MIN_SPAN);
  return { focusX: focusX * crop, span };
}
