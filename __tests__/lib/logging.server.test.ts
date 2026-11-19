/**
 * @jest-environment node
 *
 * Server-side production-mode tests for logging module.
 * NODE_ENV is set to 'production' and globalThis.window is undefined
 * (node environment), testing the server-side console output paths.
 */

import { jest } from '@jest/globals';

beforeAll(() => {
  process.env.NODE_ENV = 'production';
});

let logMessage: typeof import('@/lib/logging').logMessage;
let logError: typeof import('@/lib/logging').logError;
let logDebug: typeof import('@/lib/logging').logDebug;
let logWarning: typeof import('@/lib/logging').logWarning;

beforeEach(async () => {
  jest.resetModules();

  const logging = await import('@/lib/logging');
  logMessage = logging.logMessage;
  logError = logging.logError;
  logDebug = logging.logDebug;
  logWarning = logging.logWarning;
});

afterAll(() => {
  delete process.env.NODE_ENV;
});

describe('Logging - Server-Side Production', () => {
  describe('logMessage', () => {
    it('should output to console in server-side production', () => {
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
      logMessage('Server info message');
      expect(consoleSpy).toHaveBeenCalledWith('[INFO] Server info message');
      consoleSpy.mockRestore();
    });

    it('should output with arguments in server-side production', () => {
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
      logMessage('Server info', { key: 'value' });
      expect(consoleSpy).toHaveBeenCalledWith('[INFO] Server info', { key: 'value' });
      consoleSpy.mockRestore();
    });
  });

  describe('logError', () => {
    it('should output to console in server-side production', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      logError('Server error');
      expect(consoleSpy).toHaveBeenCalledWith('[ERROR] Server error');
      consoleSpy.mockRestore();
    });
  });

  describe('logDebug', () => {
    it('should be silent in server-side production', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      logDebug('Debug message');
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('logWarning', () => {
    it('should be silent in server-side production', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      logWarning('Warning message');
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});