import sharp, { type Metadata } from 'sharp';
import { SUBMISSION_MAX_FILE_SIZE } from '@/lib/claim/truckListingSubmission';

// Hard input ceilings: images beyond these are rejected outright before any
// decode work happens (decompression-bomb protection). These are deliberately
// conservative for logos/menu photos. The pixel ceiling is ALSO enforced at
// decode time via sharp's limitInputPixels, so a crafted file whose header
// dimensions pass the metadata check cannot force a pathological decode.
export const SUBMISSION_IMAGE_MAX_INPUT_DIMENSION = 8000;
export const SUBMISSION_IMAGE_MAX_INPUT_PIXELS = 24_000_000;

// Resize target: anything larger is scaled down to fit inside this box.
export const SUBMISSION_IMAGE_MAX_DIMENSION = 2000;
export const SUBMISSION_IMAGE_OUTPUT_FORMAT = 'webp' as const;
export const SUBMISSION_IMAGE_OUTPUT_QUALITY = 85;

export const SUBMISSION_IMAGE_INPUT_FORMATS = ['jpeg', 'png', 'webp'] as const;

export interface SanitizedSubmissionImage {
  buffer: Buffer;
  contentType: string;
  extension: string;
  width: number;
  height: number;
}

export type SubmissionImageSanitizeError =
  | 'not_an_image'
  | 'animated_not_supported'
  | 'dimensions_too_large'
  | 'output_too_large'
  | 'decode_failed';

export function submissionImageSanitizeErrorLabel(error: SubmissionImageSanitizeError): string {
  switch (error) {
    case 'not_an_image': {
      return 'The file is not a valid image.';
    }
    case 'animated_not_supported': {
      return 'Animated images are not supported.';
    }
    case 'dimensions_too_large': {
      return `Images must be no larger than ${SUBMISSION_IMAGE_MAX_INPUT_DIMENSION}px on the longest side and no more than ${SUBMISSION_IMAGE_MAX_INPUT_PIXELS / 1_000_000} megapixels.`;
    }
    case 'output_too_large': {
      return 'The processed image is too large to store.';
    }
    case 'decode_failed': {
      return 'The image could not be processed.';
    }
  }
}

export function isSubmissionImageSanitizeError(value: unknown): value is SubmissionImageSanitizeError {
  return (
    value === 'not_an_image' ||
    value === 'animated_not_supported' ||
    value === 'dimensions_too_large' ||
    value === 'output_too_large' ||
    value === 'decode_failed'
  );
}

// APNG files carry an acTL chunk before the first IDAT. Sharp does not expose
// a page count for APNG in metadata, so detect the container chunk directly.
export function isAnimatedPng(input: Buffer): boolean {
  let offset = 8; // skip the PNG signature
  while (offset + 8 <= input.length) {
    const length = input.readUInt32BE(offset);
    const type = input.toString('ascii', offset + 4, offset + 8);
    if (type === 'acTL') {
      return true;
    }
    if (type === 'IDAT') {
      return false;
    }
    offset += 12 + length;
  }
  return false;
}

export async function sanitizeSubmissionImage(
  input: Buffer,
): Promise<SanitizedSubmissionImage | SubmissionImageSanitizeError> {
  let metadata: Metadata;
  try {
    metadata = await sharp(input).metadata();
  } catch {
    return 'not_an_image';
  }

  if (
    !metadata.format ||
    !(SUBMISSION_IMAGE_INPUT_FORMATS as readonly string[]).includes(metadata.format)
  ) {
    return 'not_an_image';
  }

  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (width <= 0 || height <= 0) {
    return 'not_an_image';
  }

  // Reject animated images. Animated WebP exposes pages > 1 in metadata;
  // APNG does not, so detect its acTL container chunk. Animations are
  // deliberately out of scope (same policy as the removed GIF support).
  if ((metadata.pages ?? 1) > 1 || (metadata.format === 'png' && isAnimatedPng(input))) {
    return 'animated_not_supported';
  }

  if (
    width > SUBMISSION_IMAGE_MAX_INPUT_DIMENSION ||
    height > SUBMISSION_IMAGE_MAX_INPUT_DIMENSION ||
    width * height > SUBMISSION_IMAGE_MAX_INPUT_PIXELS
  ) {
    return 'dimensions_too_large';
  }

  const hasAlpha = metadata.hasAlpha;
  // failOn: 'warning' is sharp's recommended setting for untrusted input.
  // 'error' (the second-least sensitive level) lets mid-scan-corrupted
  // images through and re-encodes them into garbage.
  const pipeline = sharp(input, {
    failOn: 'warning',
    limitInputPixels: SUBMISSION_IMAGE_MAX_INPUT_PIXELS,
  })
    .rotate()
    .resize({
      width: SUBMISSION_IMAGE_MAX_DIMENSION,
      height: SUBMISSION_IMAGE_MAX_DIMENSION,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp(
      hasAlpha
        ? { quality: SUBMISSION_IMAGE_OUTPUT_QUALITY, alphaQuality: 90 }
        : { quality: SUBMISSION_IMAGE_OUTPUT_QUALITY },
    );

  let buffer: Buffer;
  try {
    buffer = await pipeline.toBuffer();
  } catch {
    return 'decode_failed';
  }

  // Verify the output is exactly what we expect to store before it is
  // returned for upload: a WebP within the resize bounds.
  let outputMetadata: Metadata;
  try {
    outputMetadata = await sharp(buffer).metadata();
  } catch {
    return 'decode_failed';
  }

  const outputWidth = outputMetadata.width ?? 0;
  const outputHeight = outputMetadata.height ?? 0;
  if (
    outputMetadata.format !== SUBMISSION_IMAGE_OUTPUT_FORMAT ||
    outputWidth <= 0 ||
    outputHeight <= 0 ||
    outputWidth > SUBMISSION_IMAGE_MAX_DIMENSION ||
    outputHeight > SUBMISSION_IMAGE_MAX_DIMENSION
  ) {
    return 'decode_failed';
  }

  // The bucket enforces a 3 MB object limit; a sanitized output that exceeds
  // it would fail at Storage upload time. Reject it here instead so the
  // submission is kept with a clear warning rather than a silent upload miss.
  if (buffer.length > SUBMISSION_MAX_FILE_SIZE) {
    return 'output_too_large';
  }

  return {
    buffer,
    contentType: 'image/webp',
    extension: 'webp',
    width: outputWidth,
    height: outputHeight,
  };
}
