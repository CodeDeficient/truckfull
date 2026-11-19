const SCRIPT_TAGS = /<script[^>]*>[\s\S]*?<\/script>/gi;
const JAVASCRIPT_PROTOCOL = /javascript:\s*/gi;
const EVENT_HANDLER_ATTRS = /on\w+\s*=\s*["'][^"']*["']/gi;
const HTML_DATA_URLS = /data:text\/html[^>]*/gi;

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 4096;
const MIN_IMAGE_DIMENSION = 10;

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

export function validateImageFile(file: File): ImageValidationResult {
  if (!file) return { valid: false, error: 'No file provided' };

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return {
      valid: false,
      error: `Invalid file type: ${file.type}. Allowed: JPEG, PNG, WebP`,
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: 5MB`,
    };
  }

  if (file.size === 0) {
    return { valid: false, error: 'Empty file' };
  }

  return { valid: true };
}

export function validateImageBase64(base64Data: string): ImageValidationResult {
  if (!base64Data || base64Data.length === 0) {
    return { valid: false, error: 'Empty image data' };
  }

  const buffer = Buffer.from(base64Data, 'base64');
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `Image too large: ${(buffer.length / 1024 / 1024).toFixed(1)}MB. Max: 5MB`,
    };
  }

  return { valid: true };
}

export async function validateImageDimensions(file: File): Promise<ImageValidationResult> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.addEventListener('load', () => {
      URL.revokeObjectURL(url);

      if (img.width < MIN_IMAGE_DIMENSION || img.height < MIN_IMAGE_DIMENSION) {
        return resolve({
          valid: false,
          error: `Image too small: ${img.width}x${img.height}. Min: ${MIN_IMAGE_DIMENSION}px`,
        });
      }

      if (img.width > MAX_IMAGE_DIMENSION || img.height > MAX_IMAGE_DIMENSION) {
        return resolve({
          valid: false,
          error: `Image too large: ${img.width}x${img.height}. Max: ${MAX_IMAGE_DIMENSION}px`,
        });
      }

      resolve({ valid: true });
    });

    img.addEventListener('error', () => {
      URL.revokeObjectURL(url);
      resolve({ valid: false, error: 'Could not load image. File may be corrupted.' });
    });

    img.src = url;
  });
}

export function sanitizeExtractedText(text: string): string {
  let cleaned = text.trim();

  cleaned = cleaned.replaceAll(SCRIPT_TAGS, '');
  cleaned = cleaned.replaceAll(JAVASCRIPT_PROTOCOL, '');
  cleaned = cleaned.replaceAll(EVENT_HANDLER_ATTRS, '');
  cleaned = cleaned.replaceAll(HTML_DATA_URLS, '');

  const MAX_LENGTH = 10_000;
  if (cleaned.length > MAX_LENGTH) {
    cleaned = cleaned.slice(0, MAX_LENGTH);
  }

  return cleaned;
}
