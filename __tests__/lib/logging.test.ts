jest.mock('posthog-js', () => ({
  __esModule: true,
  default: {
    capture: jest.fn(),
    identify: jest.fn(),
  },
}));

import { jest } from '@jest/globals';
import { logDebug, logError, logMessage, logWarning, setUserContext, setTag } from '@/lib/logging';

describe('Logging Module', () => {
  let consoleSpy: ReturnType<typeof jest.spyOn>;
  let consoleErrorSpy: ReturnType<typeof jest.spyOn>;
  let consoleInfoSpy: ReturnType<typeof jest.spyOn>;
  let consoleWarnSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleInfoSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('logDebug', () => {
    it('should log debug message in development mode', () => {
      logDebug('Test message');
      expect(consoleSpy).toHaveBeenCalledWith('[DEBUG] Test message');
    });

    it('should log debug message with additional arguments', () => {
      const data = { key: 'value' };
      logDebug('Test message', data);
      expect(consoleSpy).toHaveBeenCalledWith('[DEBUG] Test message', data);
    });

    it('should sanitize message by removing newlines', () => {
      logDebug('Test\nmessage');
      expect(consoleSpy).toHaveBeenCalledWith('[DEBUG] Test message');
    });

    it('should sanitize message by removing carriage returns', () => {
      logDebug('Test\rmessage');
      expect(consoleSpy).toHaveBeenCalledWith('[DEBUG] Test message');
    });

    it('should sanitize message by removing ANSI escape sequences', () => {
      logDebug('\u001B[31mTest message\u001B[0m');
      expect(consoleSpy).toHaveBeenCalledWith('[DEBUG] Test message');
    });

    it('should sanitize message by removing control characters', () => {
      logDebug('Test\u0000message');
      expect(consoleSpy).toHaveBeenCalledWith('[DEBUG] Testmessage');
    });

    it('should sanitize control characters in range \\u0010-\\u001F', () => {
      logDebug('Test\u0010\u0011\u0012\u0013\u0014\u0015\u0016\u0017message');
      expect(consoleSpy).toHaveBeenCalledWith('[DEBUG] Testmessage');
    });

    it('should preserve tabs and spaces', () => {
      logDebug('Test\t message');
      expect(consoleSpy).toHaveBeenCalledWith('[DEBUG] Test\t message');
    });

    it('should handle multiple control characters in sequence', () => {
      logDebug('Test\r\n\u001B[31mmessage');
      expect(consoleSpy).toHaveBeenCalledWith('[DEBUG] Test message');
    });

    it('should handle empty message', () => {
      logDebug('');
      expect(consoleSpy).toHaveBeenCalledWith('[DEBUG] ');
    });

    it('should handle null and undefined arguments', () => {
      logDebug('Test', null, undefined);
      expect(consoleSpy).toHaveBeenCalledWith('[DEBUG] Test', null, undefined);
    });
  });

  describe('logError', () => {
    it('should log error message in development mode', () => {
      logError('Error occurred');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Error occurred');
    });

    it('should log error with Error object', () => {
      const error = new Error('Test error');
      logError('Error occurred', error);
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Error occurred', error);
    });

    it('should log error with additional context', () => {
      logError('Error occurred', 'data', { userId: '123' });
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Error occurred', 'data');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error context:', { userId: '123' });
    });

    it('should sanitize error message', () => {
      logError('Error\noccurred');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Error occurred');
    });

    it('should handle error without context', () => {
      logError('Error occurred');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Error occurred');
    });
  });

  describe('logMessage', () => {
    it('should log info message in development mode', () => {
      logMessage('Info message');
      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] Info message');
    });

    it('should log info message with additional arguments', () => {
      logMessage('Info message', { data: 'test' });
      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] Info message', { data: 'test' });
    });

    it('should sanitize info message', () => {
      logMessage('Info\nmessage');
      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] Info message');
    });

    it('should handle empty message', () => {
      logMessage('');
      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] ');
    });
  });

  describe('logWarning', () => {
    it('should log warning message in development mode', () => {
      logWarning('Warning message');
      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] Warning message');
    });

    it('should log warning with additional arguments', () => {
      logWarning('Warning message', { detail: 'test' });
      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] Warning message', { detail: 'test' });
    });

    it('should sanitize warning message', () => {
      logWarning('Warning\nmessage');
      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] Warning message');
    });

    it('should handle empty message', () => {
      logWarning('');
      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] ');
    });
  });

  describe('setUserContext', () => {
    it('should log user context in development mode', () => {
      setUserContext({ id: '123', email: 'test@example.com' });
      expect(consoleInfoSpy).toHaveBeenCalledWith('[Logger] User context set:', {
        id: '123',
        email: 'test@example.com',
      });
    });

    it('should log user context with only email', () => {
      setUserContext({ email: 'test@example.com' });
      expect(consoleInfoSpy).toHaveBeenCalledWith('[Logger] User context set:', {
        email: 'test@example.com',
      });
    });
  });

  describe('setTag', () => {
    it('should log tag in development mode', () => {
      setTag('environment', 'test');
      expect(consoleInfoSpy).toHaveBeenCalledWith('[Logger] Tag set: environment = test');
    });

    it('should handle tag with special characters', () => {
      setTag('test-tag', 'value with spaces');
      expect(consoleInfoSpy).toHaveBeenCalledWith('[Logger] Tag set: test-tag = value with spaces');
    });
  });
});
