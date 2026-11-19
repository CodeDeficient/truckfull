import { describe, it, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

describe('Proxy Location', () => {
  it('should have proxy.ts at project root for Next.js recognition', () => {
    const rootProxy = path.join(process.cwd(), 'proxy.ts');

    expect(fs.existsSync(rootProxy)).toBe(true);
  });

  it('should NOT have proxy.ts in app directory (Next.js ignores it there)', () => {
    const appProxy = path.join(process.cwd(), 'app', 'proxy.ts');

    expect(fs.existsSync(appProxy)).toBe(false);
  });

  it('should have proxy with security blocking config', () => {
    const rootProxy = path.join(process.cwd(), 'proxy.ts');

    if (fs.existsSync(rootProxy)) {
      const content = fs.readFileSync(rootProxy, 'utf-8');

      expect(content).toContain('/.git/config');
    }
  });
});
