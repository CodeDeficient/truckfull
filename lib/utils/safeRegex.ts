import { logError, logWarning } from '@/lib/logging';

const MAX_INPUT_LENGTH = 50_000;
const REGEX_TIMEOUT_MS = 1000;

interface SafeRegexResult<T = string> {
  success: boolean;
  result?: T;
  error?: string;
}

export function validateRegexInput(input: string, maxLength = MAX_INPUT_LENGTH): string {
  if (input.length > maxLength) {
    logWarning(`Input truncated from ${input.length} to ${maxLength} chars for regex safety`);
    return input.slice(0, Math.max(0, maxLength));
  }
  return input;
}

export function safeRegexTest(
  pattern: RegExp | string,
  input: string,
  timeout = REGEX_TIMEOUT_MS,
): SafeRegexResult<boolean> {
  const safeInput = validateRegexInput(input);
  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

  try {
    const startTime = Date.now();
    const result = regex.test(safeInput);
    const elapsed = Date.now() - startTime;

    if (elapsed > timeout) {
      logWarning(`Regex test exceeded ${timeout}ms: ${regex.source}`);
      return { success: false, error: 'Regex timeout' };
    }

    return { success: true, result };
  } catch (error) {
    logError('Regex test error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export function safeRegexMatch(
  pattern: RegExp | string,
  input: string,
  timeout = REGEX_TIMEOUT_MS,
): SafeRegexResult<RegExpExecArray | null> {
  const safeInput = validateRegexInput(input);
  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

  try {
    const startTime = Date.now();
    const result = regex.exec(safeInput);
    const elapsed = Date.now() - startTime;

    if (elapsed > timeout) {
      logWarning(`Regex match exceeded ${timeout}ms: ${regex.source}`);
      return { success: false, error: 'Regex timeout' };
    }

    return { success: true, result };
  } catch (error) {
    logError('Regex match error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export function safeRegexReplace(
  pattern: RegExp | string,
  replacement: string,
  input: string,
  timeout = REGEX_TIMEOUT_MS,
): SafeRegexResult<string> {
  const safeInput = validateRegexInput(input);
  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

  try {
    const startTime = Date.now();
    const result = safeInput.replace(regex, replacement);
    const elapsed = Date.now() - startTime;

    if (elapsed > timeout) {
      logWarning(`Regex replace exceeded ${timeout}ms: ${regex.source}`);
      return { success: false, error: 'Regex timeout' };
    }

    return { success: true, result };
  } catch (error) {
    logError('Regex replace error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export function safeRegexMatchAll(
  pattern: RegExp | string,
  input: string,
  timeout = REGEX_TIMEOUT_MS,
): SafeRegexResult<(RegExpMatchArray | string)[]> {
  const safeInput = validateRegexInput(input);
  let regex: RegExp;

  if (typeof pattern === 'string') {
    regex = new RegExp(pattern, 'g');
  } else {
    const flags = pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g';
    regex = new RegExp(pattern.source, flags);
  }

  try {
    const startTime = Date.now();
    const matches = safeInput.match(regex);
    const elapsed = Date.now() - startTime;

    if (elapsed > timeout) {
      logWarning(`Regex matchAll exceeded ${timeout}ms: ${regex.source}`);
      return { success: false, error: 'Regex timeout' };
    }

    return { success: true, result: matches ? [...matches] : [] };
  } catch (error) {
    logError('Regex matchAll error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
