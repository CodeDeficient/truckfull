export interface HoloQuality {
  readonly scale: number;
  readonly steps: number;
  readonly frameSkip: number;
  readonly frozen: boolean;
}

export interface DeviceHints {
  readonly cores: number | undefined;
  readonly memoryGb: number | undefined;
  readonly saveData: boolean;
}

const HIGHEST: HoloQuality = { scale: 1.5, steps: 40, frameSkip: 1, frozen: false };

export const QUALITY_LADDER: readonly HoloQuality[] = [
  HIGHEST,
  { scale: 1.25, steps: 40, frameSkip: 1, frozen: false },
  { scale: 1, steps: 40, frameSkip: 1, frozen: false },
  { scale: 0.75, steps: 40, frameSkip: 1, frozen: false },
  { scale: 0.6, steps: 34, frameSkip: 1, frozen: false },
  { scale: 0.5, steps: 30, frameSkip: 1, frozen: false },
  { scale: 0.5, steps: 30, frameSkip: 2, frozen: false },
  { scale: 0.5, steps: 30, frameSkip: 1, frozen: true },
];

const LAST_LEVEL = QUALITY_LADDER.length - 1;
const LOW_POWER_LEVEL = 3;
const SHARP_LEVEL_LIMIT = 2;
const SMOOTH_FRAME_MS = 38;
const SLOW_FRAME_MS = 45;

export function initialQualityLevel(hints: DeviceHints): number {
  if (hints.saveData) return LAST_LEVEL;
  const lowPower = (hints.cores ?? 8) <= 4 || (hints.memoryGb ?? 8) <= 4;
  return lowPower ? LOW_POWER_LEVEL : 0;
}

export function nextQualityLevel(level: number, averageFrameMs: number): number {
  if (level >= LAST_LEVEL) return level;
  if (averageFrameMs > SLOW_FRAME_MS) return level + 1;
  if (averageFrameMs > SMOOTH_FRAME_MS && level < SHARP_LEVEL_LIMIT) return level + 1;
  return level;
}

export function qualityAt(level: number): HoloQuality {
  return QUALITY_LADDER[Math.min(Math.max(level, 0), LAST_LEVEL)] ?? HIGHEST;
}
