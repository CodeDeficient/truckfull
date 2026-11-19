/**
 * @jest-environment jsdom
 *
 * Production-mode tests for logging module.
 * NODE_ENV is set to 'production' before module import to test
 * the PostHog integration and server-side error handling paths.
 */

import { jest } from '@jest/globals';

const mockPostHog = {
  capture: jest.fn(),
  identify: jest.fn(),
};

beforeAll(() => {
  process.env.NODE_ENV = 'production';

  jest.unstable_mockModule('posthog-js', () => ({
    __esModule: true,
    default: mockPostHog,
  }));
});

let logDebug: typeof import('@/lib/logging').logDebug;
let logError: typeof import('@/lib/logging').logError;
let logMessage: typeof import('@/lib/logging').logMessage;
let logWarning: typeof import('@/lib/logging').logWarning;
let setUserContext: typeof import('@/lib/logging').setUserContext;

beforeEach(async () => {
  jest.resetModules();
  mockPostHog.capture.mockReset();
  mockPostHog.identify.mockReset();

  const logging = await import('@/lib/logging');
  logDebug = logging.logDebug;
  logError = logging.logError;
  logMessage = logging.logMessage;
  logWarning = logging.logWarning;
  setUserContext = logging.setUserContext;
});

afterAll(() => {
  delete process.env.NODE_ENV;
});

describe('Logging - Production Mode', () => {
  describe('logDebug', () => {
    it('should be silent in production', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      logDebug('Test message');
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should be silent even with arguments in production', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      logDebug('Test message', { data: 'value' });
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('logMessage', () => {
    it('should be silent in client-side production', () => {
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
      logMessage('Info message');
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('logWarning', () => {
    it('should be silent in production', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      logWarning('Warning message');
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('logError - client-side production (PostHog)', () => {
    it('should capture Error instance to PostHog', async () => {
      const error = new Error('Test error');
      logError('Context message', error);
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(mockPostHog.capture).toHaveBeenCalledWith('$exception', {
        $exception_message: 'Test error',
        $exception_type: 'Error',
        $exception_stack_trace_raw: error.stack,
        context: 'Context message',
      });
    });

    it('should capture non-Error data to PostHog', async () => {
      logError('Context message', 'string error');
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(mockPostHog.capture).toHaveBeenCalledWith('$exception', {
        $exception_message: 'Context message',
        $exception_type: 'Error',
        context: 'Context message',
        additional_data: 'string error',
      });
    });

    it('should include extra context in PostHog capture', async () => {
      const error = new Error('DB error');
      logError('Query failed', error, { extra: { query: 'SELECT *' } });
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(mockPostHog.capture).toHaveBeenCalledWith('$exception', {
        $exception_message: 'DB error',
        $exception_type: 'Error',
        $exception_stack_trace_raw: error.stack,
        context: 'Query failed',
        query: 'SELECT *',
      });
    });

    it('should handle logError without error data', async () => {
      logError('Something went wrong');
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(mockPostHog.capture).toHaveBeenCalledWith('$exception', {
        $exception_message: 'Something went wrong',
        $exception_type: 'Error',
        context: 'Something went wrong',
        additional_data: undefined,
      });
    });

    it('should sanitize error message before PostHog capture', async () => {
      logError('Error\nwith\nnewlines', new Error('test'));
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(mockPostHog.capture).toHaveBeenCalledWith(
        '$exception',
        expect.objectContaining({
          $exception_message: 'test',
        }),
      );
    });
  });

  describe('setUserContext', () => {
    it('should be silent in production without window', () => {
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
      setUserContext({ id: '123', email: 'test@example.com' });
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should not call PostHog identify without user id', () => {
      setUserContext({ email: 'test@example.com' });
      expect(mockPostHog.identify).not.toHaveBeenCalled();
    });
  });
});
