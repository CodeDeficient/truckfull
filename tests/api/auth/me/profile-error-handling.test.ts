import { describe, it, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

describe('/api/auth/me Profile Error Handling', () => {
  it('should destructure error from profile query', () => {
    const routePath = path.join(process.cwd(), 'app/api/auth/me/route.ts');
    const content = fs.readFileSync(routePath, 'utf-8');

    const profileQueryMatch = content.match(
      /const\s*\{[^}]*\}\s*=\s*await\s+supabase\.from\(['"]profiles['"]\)/,
    );
    expect(profileQueryMatch).toBeTruthy();

    const destructuring = profileQueryMatch![0];

    expect(destructuring).toMatch(/error/);
  });

  it('should check for profile query error', () => {
    const routePath = path.join(process.cwd(), 'app/api/auth/me/route.ts');
    const content = fs.readFileSync(routePath, 'utf-8');

    const hasErrorCheck = /profileError|profile.*error/i.test(content) && /if\s*\(/.test(content);

    expect(hasErrorCheck).toBe(true);
  });

  it('should handle missing profile by creating one', () => {
    const routePath = path.join(process.cwd(), 'app/api/auth/me/route.ts');
    const content = fs.readFileSync(routePath, 'utf-8');

    const handlesMissingProfile =
      /\.insert\(/.test(content) || /profile.*not.*found|missing.*profile/i.test(content);

    expect(handlesMissingProfile).toBe(true);
  });

  it('should not silently default role to customer without checking error', () => {
    const routePath = path.join(process.cwd(), 'app/api/auth/me/route.ts');
    const content = fs.readFileSync(routePath, 'utf-8');

    const roleMatch = content.match(/role:\s*profile\?\.role\s*\?\?\s*['"]customer['"]/);

    if (roleMatch) {
      const beforeRole = content.substring(0, content.indexOf(roleMatch[0]));
      expect(beforeRole).toMatch(/if\s*\(.*error|profileError/);
    }
  });
});
