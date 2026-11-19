import { describe, it, expect, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

describe('Mobile Owner Dashboard Authorization', () => {
  const mobilePagePath = path.join(process.cwd(), 'app/@mobile/owner-dashboard/page.tsx');
  const desktopPagePath = path.join(process.cwd(), 'app/owner-dashboard/page.tsx');

  it('should import verifyRoleFromCookies from auth helpers', () => {
    const content = fs.readFileSync(mobilePagePath, 'utf-8');

    expect(content).toContain('verifyRoleFromCookies');
    expect(content).toMatch(/from\s+['"`]@\/lib\/auth\/authHelpers['"`]/);
  });

  it('should import redirect from next/navigation', () => {
    const content = fs.readFileSync(mobilePagePath, 'utf-8');

    expect(content).toContain('redirect');
    expect(content).toMatch(/from\s+['"`]next\/navigation['"`]/);
  });

  it('should import logError from logging utility', () => {
    const content = fs.readFileSync(mobilePagePath, 'utf-8');

    expect(content).toContain('logError');
    expect(content).toMatch(/from\s+['"`]@\/lib\/logging['"`]/);
  });

  it('should call verifyRoleFromCookies with food_truck_owner and admin roles', () => {
    const content = fs.readFileSync(mobilePagePath, 'utf-8');

    expect(content).toContain("verifyRoleFromCookies(['food_truck_owner', 'admin'])");
  });

  it('should redirect to /unauthorized when role check fails', () => {
    const content = fs.readFileSync(mobilePagePath, 'utf-8');

    expect(content).toContain('if (!ok)');
    expect(content).toContain("redirect('/unauthorized')");
  });

  it('should handle errors and redirect to login with auth open', () => {
    const content = fs.readFileSync(mobilePagePath, 'utf-8');

    expect(content).toContain('catch (error_)');
    expect(content).toContain("logError('Error verifying mobile owner dashboard access:', error_)");
    expect(content).toContain("redirect('/?auth=open')");
  });

  it('should have same auth structure as desktop owner dashboard', () => {
    const mobileContent = fs.readFileSync(mobilePagePath, 'utf-8');
    const desktopContent = fs.readFileSync(desktopPagePath, 'utf-8');

    const mobileAuthPattern = [
      'verifyRoleFromCookies',
      'redirect',
      'logError',
      'food_truck_owner',
      'admin',
    ];

    mobileAuthPattern.forEach((pattern) => {
      expect(mobileContent).toContain(pattern);
      expect(desktopContent).toContain(pattern);
    });
  });

  it('should export page as default async function', () => {
    const content = fs.readFileSync(mobilePagePath, 'utf-8');

    expect(content).toContain('export default async function Page()');
    expect(content).toContain('return <EnhancedOwnerDashboardClient />');
  });
});
