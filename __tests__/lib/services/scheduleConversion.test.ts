import { describe, expect, it } from '@jest/globals';
import { convertOneOffToWeeklySchedule } from '@/lib/services/scheduleConversion';

describe('convertOneOffToWeeklySchedule', () => {
  it('removes the one-off only after the weekly schedule succeeds', async () => {
    const steps: string[] = [];
    const result = await convertOneOffToWeeklySchedule({
      saveWeekly: async () => { steps.push('weekly'); },
      removeOverride: async () => { steps.push('override'); },
      restoreWeekly: async () => { steps.push('restore'); },
    });

    expect(result).toEqual({ success: true });
    expect(steps).toEqual(['weekly', 'override']);
  });

  it('keeps the one-off when the weekly schedule fails', async () => {
    const steps: string[] = [];
    const result = await convertOneOffToWeeklySchedule({
      saveWeekly: async () => { throw new Error('write failed'); },
      removeOverride: async () => { steps.push('override'); },
      restoreWeekly: async () => { steps.push('restore'); },
    });

    expect(result).toEqual({ success: false, error: 'Unable to save weekly schedule' });
    expect(steps).toEqual([]);
  });

  it('restores the previous weekly schedule when one-off removal fails', async () => {
    const steps: string[] = [];
    const result = await convertOneOffToWeeklySchedule({
      saveWeekly: async () => { steps.push('weekly'); },
      removeOverride: async () => { throw new Error('delete failed'); },
      restoreWeekly: async () => { steps.push('restore'); },
    });

    expect(result).toEqual({ success: false, error: 'Unable to convert date-specific schedule' });
    expect(steps).toEqual(['weekly', 'restore']);
  });
});
