import sanitizeHtml from 'sanitize-html';

const LEADING_SLASHES = /^[\/\\]+/;
const UNSAFE_FILENAME_CHARS = /[<>:"|?*]/g;

/**
 * Sanitize input to prevent XSS and other injection attacks
 * Uses sanitize-html for robust XSS protection instead of regex-based sanitization
 *
 * @param input - The string to sanitize
 * @param allowedTags - Optional array of allowed HTML tags (default: basic formatting only)
 * @returns Sanitized string safe for display
 */
export function sanitizeInput(
  input: string,
  allowedTags: string[] = ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
): string {
  if (!input) return input;

  return sanitizeHtml(input, {
    allowedTags,
    allowedAttributes: {
      a: ['href', 'title', 'target'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowProtocolRelative: false,
  }).trim();
}

/**
 * Sanitize filename to prevent directory traversal
 * @param filename - The filename to sanitize
 * @returns Sanitized filename
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return filename;

  // Iteratively remove path traversal attempts to prevent reconstruction attacks
  // Patterns like ....// reconstruct .. after single-pass removal
  let sanitized = filename;
  let previous = '';
  const MAX_ITERATIONS = 100;
  let iterations = 0;

  while (sanitized !== previous && iterations < MAX_ITERATIONS) {
    previous = sanitized;
    sanitized = sanitized
      .replaceAll('../', '')
      .replaceAll('..\\', '')
      .replace(LEADING_SLASHES, '')
      .replaceAll(UNSAFE_FILENAME_CHARS, '_');
    iterations++;
  }

  return sanitized.trim();
}
