import { describe, it, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

describe('Data Cleanup API Authentication', () => {
  const routePath = path.join(process.cwd(), 'app/api/admin/data-cleanup/route.ts');

  let content: string;

  beforeEach(() => {
    content = fs.readFileSync(routePath, 'utf-8');
  });

  it('should import verifyAdminAccess from authHelpers', () => {
    expect(content).toContain("from '@/lib/auth/authHelpers'");
    expect(content).toContain('verifyAdminAccess');
  });

  it('should check admin access in POST handler', () => {
    const postHandlerMatch = content.match(/export const POST[\s\S]*?^\}/m);
    expect(postHandlerMatch).toBeTruthy();
    expect(postHandlerMatch![0]).toMatch(/verifyAdminAccess.*request/);
  });

  it('should check admin access in GET handler', () => {
    const getHandlerMatch = content.match(/export async function GET[\s\S]*?^\}/m);
    expect(getHandlerMatch).toBeTruthy();
    expect(getHandlerMatch![0]).toMatch(/verifyAdminAccess/);
  });

  it('should return 401 when auth fails', () => {
    expect(content).toContain('status: 401');
  });

  it('should follow same auth pattern as other admin routes', () => {
    expect(content).toContain('verifyAdminAccess');
    expect(content).toMatch(/Unauthorized|401/);
  });

  it('should return unauthorized response pattern in POST', () => {
    const postHandlerMatch = content.match(/export const POST[\s\S]*?^\}/m);
    expect(postHandlerMatch).toBeTruthy();
    expect(postHandlerMatch![0]).toMatch(/NextResponse\.json.*Unauthorized/);
  });

  it('should return unauthorized response pattern in GET', () => {
    const getHandlerMatch = content.match(/export async function GET[\s\S]*?^\}/m);
    expect(getHandlerMatch).toBeTruthy();
    expect(getHandlerMatch![0]).toMatch(/NextResponse\.json.*Unauthorized/);
  });

  it('should use the standard admin auth structure', () => {
    const hasAccessCheck = /const hasAccess = await verifyAdminAccess\(request\)/;
    const unauthorizedResponse =
      /NextResponse\.json\(\{ error: 'Unauthorized' \}, \{ status: 401 \}\)/;

    expect(content).toMatch(hasAccessCheck);
    expect(content).toMatch(unauthorizedResponse);
  });
});
