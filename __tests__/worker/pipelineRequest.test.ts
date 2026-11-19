import { describe, expect, it } from '@jest/globals';
import { validatePipelineRequest } from '../../worker/pipelineRequest.mjs';

const enabled = { PIPELINE_ENABLED: 'true', CRON_SECRET: 'secret' };

describe('validatePipelineRequest', () => {
  it('refuses to wake the container while the pipeline is disabled', () => {
    expect(
      validatePipelineRequest('POST', '/run', 'Bearer secret', {
        ...enabled,
        PIPELINE_ENABLED: 'false',
      }),
    ).toBe(503);
  });

  it('allows only an authenticated read-only status probe while disabled', () => {
    const disabled = { ...enabled, PIPELINE_ENABLED: 'false' };

    expect(validatePipelineRequest('GET', '/status', 'Bearer secret', disabled)).toBe(200);
    expect(validatePipelineRequest('GET', '/status', 'Bearer wrong', disabled)).toBe(401);
    expect(validatePipelineRequest('GET', '/status', undefined, disabled)).toBe(401);
    expect(validatePipelineRequest('POST', '/status', 'Bearer secret', disabled)).toBe(503);
    expect(validatePipelineRequest('POST', '/run', 'Bearer secret', disabled)).toBe(503);
  });

  it('rejects unauthorized manual triggers', () => {
    expect(validatePipelineRequest('POST', '/run', 'Bearer wrong', enabled)).toBe(401);
    expect(validatePipelineRequest('POST', '/run', undefined, enabled)).toBe(401);
  });

  it('only permits authenticated run and status requests', () => {
    expect(validatePipelineRequest('POST', '/run', 'Bearer secret', enabled)).toBe(200);
    expect(validatePipelineRequest('GET', '/status', 'Bearer secret', enabled)).toBe(200);
    expect(validatePipelineRequest('GET', '/run', 'Bearer secret', enabled)).toBe(405);
    expect(validatePipelineRequest('POST', '/status', 'Bearer secret', enabled)).toBe(405);
    expect(validatePipelineRequest('POST', '/other', 'Bearer secret', enabled)).toBe(404);
  });
});
