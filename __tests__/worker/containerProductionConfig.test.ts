import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from '@jest/globals';

function readProductionConfig(): Record<string, unknown> {
  const raw = readFileSync(
    path.join(process.cwd(), 'wrangler.container-production.jsonc'),
    'utf8',
  );
  const code = raw
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n')
    .replace(/,(\s*[}\]])/g, '$1');
  return JSON.parse(code) as Record<string, unknown>;
}

interface ContainerEntry {
  instance_type: string;
  max_instances: number;
}

describe('production container cost configuration', () => {
  it('uses the basic instance type', () => {
    const config = readProductionConfig();
    const containers = config.containers as ContainerEntry[];
    expect(containers[0].instance_type).toBe('basic');
  });

  it('does not provision more capacity than the included memory allowance affords', () => {
    // Basic is 1 GiB. standard-1 (4 GiB) and standard-2 (6 GiB) exhaust the
    // 25 GiB-hours/month included memory allowance within a day of uptime.
    const config = readProductionConfig();
    const containers = config.containers as ContainerEntry[];
    expect(['lite', 'basic']).toContain(containers[0].instance_type);
  });

  it('keeps a single instance', () => {
    const config = readProductionConfig();
    const containers = config.containers as ContainerEntry[];
    expect(containers[0].max_instances).toBe(1);
  });

  it('does not run an hourly container cron', () => {
    // An hourly cron wakes the container every hour and bills the idle tail.
    // Re-enable deliberately when post recovery is actually needed.
    const config = readProductionConfig();
    const triggers = config.triggers as { crons?: string[] };
    expect(triggers.crons ?? []).toEqual([]);
  });
});
