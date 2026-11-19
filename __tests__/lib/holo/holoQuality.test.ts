import { describe, expect, it } from '@jest/globals';
import {
  QUALITY_LADDER,
  initialQualityLevel,
  nextQualityLevel,
  qualityAt,
} from '@/lib/holo/holoQuality';

const LAST = QUALITY_LADDER.length - 1;
const strong = { cores: 16, memoryGb: 16, saveData: false };

describe('initialQualityLevel', () => {
  it('starts capable devices at the highest quality', () => {
    expect(initialQualityLevel(strong)).toBe(0);
  });

  it('starts devices without hints at the highest quality', () => {
    expect(initialQualityLevel({ cores: undefined, memoryGb: undefined, saveData: false })).toBe(0);
  });

  it('starts low-power devices at a reduced resolution', () => {
    expect(qualityAt(initialQualityLevel({ ...strong, cores: 4 })).scale).toBeLessThan(1);
    expect(qualityAt(initialQualityLevel({ ...strong, memoryGb: 2 })).scale).toBeLessThan(1);
  });

  it('shows a still frame when the visitor asked to save data', () => {
    expect(qualityAt(initialQualityLevel({ ...strong, saveData: true })).frozen).toBe(true);
  });
});

describe('nextQualityLevel', () => {
  it('keeps the level when the 30 fps target is met', () => {
    expect(nextQualityLevel(0, 33.4)).toBe(0);
  });

  it('drops supersampling when the 30 fps target is occasionally missed', () => {
    expect(nextQualityLevel(0, 40)).toBe(1);
  });

  it('keeps normal resolution when frames are only occasionally missed', () => {
    expect(nextQualityLevel(2, 40)).toBe(2);
  });

  it('steps down when frames fall well below 30 fps', () => {
    expect(nextQualityLevel(4, 50)).toBe(5);
  });

  it('never steps past the still frame', () => {
    expect(nextQualityLevel(LAST, 500)).toBe(LAST);
    expect(qualityAt(LAST).frozen).toBe(true);
  });
});

describe('qualityAt', () => {
  it('clamps out-of-range levels', () => {
    expect(qualityAt(-3)).toBe(QUALITY_LADDER[0]);
    expect(qualityAt(99)).toBe(QUALITY_LADDER[LAST]);
  });

  it('only ever lowers cost going down the ladder', () => {
    for (let i = 1; i < QUALITY_LADDER.length; i++) {
      const prev = qualityAt(i - 1);
      const cur = qualityAt(i);
      expect(cur.scale).toBeLessThanOrEqual(prev.scale);
      expect(cur.steps).toBeLessThanOrEqual(prev.steps);
    }
  });
});
