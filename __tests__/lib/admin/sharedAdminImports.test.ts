/**
 * @jest-environment node
 */

import { describe, it, expect } from '@jest/globals';

describe('sharedAdminImports', () => {
  it('should export Card components', async () => {
    const exports = await import('@/lib/admin/sharedAdminImports');
    expect(exports.Card).toBeDefined();
    expect(exports.CardContent).toBeDefined();
    expect(exports.CardDescription).toBeDefined();
    expect(exports.CardHeader).toBeDefined();
    expect(exports.CardTitle).toBeDefined();
  });

  it('should export Table components', async () => {
    const exports = await import('@/lib/admin/sharedAdminImports');
    expect(exports.Table).toBeDefined();
    expect(exports.TableBody).toBeDefined();
    expect(exports.TableCell).toBeDefined();
    expect(exports.TableHead).toBeDefined();
    expect(exports.TableHeader).toBeDefined();
    expect(exports.TableRow).toBeDefined();
  });

  it('should export Badge', async () => {
    const exports = await import('@/lib/admin/sharedAdminImports');
    expect(exports.Badge).toBeDefined();
  });

  it('should export Button', async () => {
    const exports = await import('@/lib/admin/sharedAdminImports');
    expect(exports.Button).toBeDefined();
  });

  it('should export dynamic constant', async () => {
    const exports = await import('@/lib/admin/sharedAdminImports');
    expect(exports.dynamic).toBe('force-dynamic');
  });
});