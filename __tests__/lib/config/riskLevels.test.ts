/**
 * Unit tests for lib/config/riskLevels.ts
 * WBS: 3.5.4 - Risk levels configuration
 */

import {
  RiskLevel,
  UpdateCategory,
  CATEGORY_RISK_LEVELS,
  AUTO_APPROVAL_THRESHOLDS,
  LOCATION_ANOMALY_DISTANCE_MILES,
  getRiskLevel,
  canAutoApprove,
  isLocationAnomaly,
} from '@/lib/config/riskLevels';

describe('riskLevels configuration', () => {
  describe('CATEGORY_RISK_LEVELS', () => {
    it('rates location_update as HIGH risk', () => {
      expect(CATEGORY_RISK_LEVELS[UpdateCategory.LOCATION_UPDATE]).toBe(RiskLevel.HIGH);
    });

    it('rates cuisine_change as HIGH risk', () => {
      expect(CATEGORY_RISK_LEVELS[UpdateCategory.CUISINE_CHANGE]).toBe(RiskLevel.HIGH);
    });

    it('rates menu_update as MEDIUM risk', () => {
      expect(CATEGORY_RISK_LEVELS[UpdateCategory.MENU_UPDATE]).toBe(RiskLevel.MEDIUM);
    });

    it('rates hours_update as LOW risk', () => {
      expect(CATEGORY_RISK_LEVELS[UpdateCategory.HOURS_UPDATE]).toBe(RiskLevel.LOW);
    });

    it('rates general_content as LOW risk', () => {
      expect(CATEGORY_RISK_LEVELS[UpdateCategory.GENERAL_CONTENT]).toBe(RiskLevel.LOW);
    });
  });

  describe('AUTO_APPROVAL_THRESHOLDS', () => {
    it('requires 80% confidence for LOW risk', () => {
      expect(AUTO_APPROVAL_THRESHOLDS[RiskLevel.LOW]).toBe(0.8);
    });

    it('requires 90% confidence for MEDIUM risk', () => {
      expect(AUTO_APPROVAL_THRESHOLDS[RiskLevel.MEDIUM]).toBe(0.9);
    });

    it('has no threshold for HIGH risk (never auto-approved)', () => {
      expect(AUTO_APPROVAL_THRESHOLDS[RiskLevel.HIGH]).toBeUndefined();
    });
  });

  describe('LOCATION_ANOMALY_DISTANCE_MILES', () => {
    it('is set to 100 miles', () => {
      expect(LOCATION_ANOMALY_DISTANCE_MILES).toBe(100);
    });
  });
});

describe('getRiskLevel', () => {
  it('returns correct risk level for known categories', () => {
    expect(getRiskLevel(UpdateCategory.LOCATION_UPDATE)).toBe(RiskLevel.HIGH);
    expect(getRiskLevel(UpdateCategory.HOURS_UPDATE)).toBe(RiskLevel.LOW);
    expect(getRiskLevel(UpdateCategory.MENU_UPDATE)).toBe(RiskLevel.MEDIUM);
  });

  it('returns HIGH for unknown categories (defensive)', () => {
    // @ts-expect-error - testing unknown category handling
    expect(getRiskLevel('unknown_category')).toBe(RiskLevel.HIGH);
  });
});

describe('canAutoApprove', () => {
  describe('HIGH risk updates (never auto-approved)', () => {
    it('rejects location_update even with 100% confidence', () => {
      expect(canAutoApprove(UpdateCategory.LOCATION_UPDATE, 1.0)).toBe(false);
    });

    it('rejects cuisine_change even with 100% confidence', () => {
      expect(canAutoApprove(UpdateCategory.CUISINE_CHANGE, 1.0)).toBe(false);
    });
  });

  describe('MEDIUM risk updates (require >= 90% confidence)', () => {
    it('approves menu_update at 90% confidence', () => {
      expect(canAutoApprove(UpdateCategory.MENU_UPDATE, 0.9)).toBe(true);
    });

    it('approves menu_update at 95% confidence', () => {
      expect(canAutoApprove(UpdateCategory.MENU_UPDATE, 0.95)).toBe(true);
    });

    it('rejects menu_update at 89% confidence', () => {
      expect(canAutoApprove(UpdateCategory.MENU_UPDATE, 0.89)).toBe(false);
    });
  });

  describe('LOW risk updates (require >= 80% confidence)', () => {
    it('approves hours_update at 80% confidence', () => {
      expect(canAutoApprove(UpdateCategory.HOURS_UPDATE, 0.8)).toBe(true);
    });

    it('approves hours_update at 95% confidence', () => {
      expect(canAutoApprove(UpdateCategory.HOURS_UPDATE, 0.95)).toBe(true);
    });

    it('rejects hours_update at 79% confidence', () => {
      expect(canAutoApprove(UpdateCategory.HOURS_UPDATE, 0.79)).toBe(false);
    });

    it('approves general_content at 80% confidence', () => {
      expect(canAutoApprove(UpdateCategory.GENERAL_CONTENT, 0.8)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('rejects at exactly the boundary minus epsilon', () => {
      expect(canAutoApprove(UpdateCategory.HOURS_UPDATE, 0.7999)).toBe(false);
    });

    it('rejects at 0% confidence', () => {
      expect(canAutoApprove(UpdateCategory.HOURS_UPDATE, 0.0)).toBe(false);
    });

    it('approves at 100% confidence for LOW risk', () => {
      expect(canAutoApprove(UpdateCategory.HOURS_UPDATE, 1.0)).toBe(true);
    });
  });
});

describe('isLocationAnomaly', () => {
  it('returns false for distance under threshold', () => {
    expect(isLocationAnomaly(50)).toBe(false);
    expect(isLocationAnomaly(99)).toBe(false);
    expect(isLocationAnomaly(100)).toBe(false);
  });

  it('returns true for distance over threshold', () => {
    expect(isLocationAnomaly(101)).toBe(true);
    expect(isLocationAnomaly(500)).toBe(true);
    expect(isLocationAnomaly(1000)).toBe(true);
  });

  it('handles edge case at exactly threshold', () => {
    // 100 miles is NOT an anomaly (threshold is >100, not >=100)
    expect(isLocationAnomaly(100)).toBe(false);
    expect(isLocationAnomaly(100.01)).toBe(true);
  });

  it('handles zero distance', () => {
    expect(isLocationAnomaly(0)).toBe(false);
  });

  it('handles negative distance (invalid input treated as safe)', () => {
    expect(isLocationAnomaly(-50)).toBe(false);
  });
});
