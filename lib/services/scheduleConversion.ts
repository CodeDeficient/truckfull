interface WeeklyConversionSteps {
  readonly saveWeekly: () => Promise<void>;
  readonly removeOverride: () => Promise<void>;
  readonly restoreWeekly: () => Promise<void>;
}

export type WeeklyConversionResult =
  | { readonly success: true }
  | { readonly success: false; readonly error: string };

export async function convertOneOffToWeeklySchedule(
  steps: WeeklyConversionSteps,
): Promise<WeeklyConversionResult> {
  try {
    await steps.saveWeekly();
  } catch {
    return { success: false, error: 'Unable to save weekly schedule' };
  }
  try {
    await steps.removeOverride();
    return { success: true };
  } catch {
    try {
      await steps.restoreWeekly();
    } catch {
      return { success: false, error: 'Unable to restore the previous weekly schedule' };
    }
    return { success: false, error: 'Unable to convert date-specific schedule' };
  }
}
