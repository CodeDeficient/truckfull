import { describe, it, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

describe('Server-Side Error Logging', () => {
  it('should have server-side production error handling in logError function', () => {
    const loggingPath = path.join(process.cwd(), 'lib/logging/index.ts');
    const content = fs.readFileSync(loggingPath, 'utf-8');

    const logErrorMatch = content.match(/export function logError[\s\S]*?^}/m);
    expect(logErrorMatch).toBeTruthy();

    const logErrorCode = logErrorMatch![0];

    expect(logErrorCode).toContain('isDevelopment');
    expect(logErrorCode).toContain('globalThis.window');
    expect(logErrorCode).toContain('logErrorToConsole');
    expect(logErrorCode).toContain('captureErrorToPostHog');
  });

  it('should log to console.error in server-side production path', () => {
    const loggingPath = path.join(process.cwd(), 'lib/logging/index.ts');
    const content = fs.readFileSync(loggingPath, 'utf-8');

    const serverPathMatch = content.match(
      /if \(globalThis\.window === undefined\)[\s\S]*?return;/m,
    );
    expect(serverPathMatch).toBeTruthy();
    expect(serverPathMatch![0]).toContain('logErrorToConsole');
  });

  it('should NOT silently drop server-side production errors', () => {
    const loggingPath = path.join(process.cwd(), 'lib/logging/index.ts');
    const content = fs.readFileSync(loggingPath, 'utf-8');

    const logErrorMatch = content.match(/export function logError[\s\S]*?^}/m);
    expect(logErrorMatch).toBeTruthy();

    const logErrorCode = logErrorMatch![0];

    const hasServerPath = logErrorCode.includes('globalThis.window === undefined');
    const hasClientPath = logErrorCode.includes('captureErrorToPostHog');
    const hasLoggingCall = logErrorCode.includes('logErrorToConsole');

    expect(hasServerPath).toBe(true);
    expect(hasClientPath).toBe(true);
    expect(hasLoggingCall).toBe(true);
  });
});
