import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';

const source = readFileSync(join(process.cwd(), 'lib/services/scheduleOverride.ts'), 'utf-8');
const functionStart = source.indexOf('async function updateAllowedOverride(');
const functionEnd = source.indexOf('\nasync function readExistingSource(', functionStart);
const updateAllowedOverride = source.slice(functionStart, functionEnd);

describe('schedule override mutation contract', () => {
  it('projects the timestamp used by the preserved concurrency predicate', () => {
    expect(updateAllowedOverride).toContain('query = query.or(');
    expect(updateAllowedOverride).toContain(
      'source_post_created_at.is.null,source_post_created_at.lt.',
    );
    expect(updateAllowedOverride).toContain('source_post_id.eq.');
    expect(updateAllowedOverride).toMatch(
      /query\s*\.select\('id, updated_at, source_post_created_at, source_post_id'\)\s*\.maybeSingle\(\)/,
    );
  });
});
