/**
 * @jest-environment node
 */

import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

describe('Apify Artifacts Removal', () => {
  describe('Apify Files Should Not Exist', () => {
    it('should not have apify-input.json file', () => {
      const apifyInputPath = join(process.cwd(), 'apify-input.json');
      expect(existsSync(apifyInputPath)).toBe(false);
    });

    it('should not have apify-manual-run.sh script', () => {
      const apifyScriptPath = join(process.cwd(), 'scripts', 'apify-manual-run.sh');
      expect(existsSync(apifyScriptPath)).toBe(false);
    });

    it('should not have fix-randalls.ts script (uses apify-client)', () => {
      const fixRandallsPath = join(process.cwd(), 'scripts', 'fix-randalls.ts');
      expect(existsSync(fixRandallsPath)).toBe(false);
    });
  });

  describe('Package Dependencies Should Not Include Apify', () => {
    it('should not have apify-client in dependencies', () => {
      const pkgPath = join(process.cwd(), 'package.json');
      const pkgContent = readFileSync(pkgPath, 'utf-8');
      const pkgJson = JSON.parse(pkgContent);
      expect(pkgJson.dependencies?.['apify-client']).toBeUndefined();
      expect(pkgJson.devDependencies?.['apify-client']).toBeUndefined();
    });

    it('should not have apify-client references in package-lock.json', () => {
      const lockPath = join(process.cwd(), 'package-lock.json');
      if (existsSync(lockPath)) {
        const lockContent = readFileSync(lockPath, 'utf-8');
        expect(lockContent).not.toContain('apify-client');
      }
    });
  });

  describe('Source Code Should Not Reference Apify', () => {
    function scanDirectory(dir: string, extensions: string[]): string[] {
      const files: string[] = [];
      const items = readdirSync(dir, { withFileTypes: true });

      for (const item of items) {
        const fullPath = join(dir, item.name);

        if (item.isDirectory()) {
          if (
            !item.name.startsWith('.') &&
            !['node_modules', '.next', 'dist'].includes(item.name)
          ) {
            files.push(...scanDirectory(fullPath, extensions));
          }
        } else if (extensions.some((ext) => item.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }

      return files;
    }

    it('should not have apify imports in TypeScript files', () => {
      const tsFiles = scanDirectory(process.cwd(), ['.ts']);
      for (const file of tsFiles) {
        const content = readFileSync(file, 'utf-8');
        expect(content).not.toMatch(/from ['"`]apify-client['"`]/);
      }
    });

    it('should not have apify imports in JavaScript files', () => {
      const jsFiles = scanDirectory(process.cwd(), ['.js']);
      for (const file of jsFiles) {
        const content = readFileSync(file, 'utf-8');
        expect(content).not.toMatch(/require\(['"`]apify-client['"`]\)/);
      }
    });
  });
});
