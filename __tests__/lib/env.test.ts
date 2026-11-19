import { describe, it, expect } from '@jest/globals';

describe('env module', () => {
  it('should export EnvironmentValidator class', async () => {
    const mod = await import('@/lib/env');
    expect(typeof mod.EnvironmentValidator).toBe('function');
  });

  it('should export envValidator singleton', async () => {
    const mod = await import('@/lib/env');
    expect(mod.envValidator).toBeDefined();
  });

  it('should have getValidationSummary method on envValidator', async () => {
    const mod = await import('@/lib/env');
    expect(typeof mod.envValidator.getValidationSummary).toBe('function');
  });

  it('should have getValidationSummary method on EnvironmentValidator instance', async () => {
    const mod = await import('@/lib/env');
    const validator = new mod.EnvironmentValidator();
    expect(typeof validator.getValidationSummary).toBe('function');
  });
});
