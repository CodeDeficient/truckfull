import { describe, it, expect } from '@jest/globals';
import sharp from 'sharp';
import {
  sanitizeSubmissionImage,
  isSubmissionImageSanitizeError,
  submissionImageSanitizeErrorLabel,
  isAnimatedPng,
  SUBMISSION_IMAGE_MAX_DIMENSION,
  SUBMISSION_IMAGE_MAX_INPUT_DIMENSION,
  SUBMISSION_IMAGE_OUTPUT_FORMAT,
} from '@/lib/claim/submissionImageSanitizer';
import { SUBMISSION_MAX_FILE_SIZE } from '@/lib/claim/truckListingSubmission';

// Real animated fixtures generated with ffmpeg (5-frame animated WebP,
// 5-frame APNG), embedded as base64 so the tests are deterministic.
const ANIMATED_WEBP_B64 =
  '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';

const ANIMATED_PNG_B64 =
  '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';

async function makePng(width: number, height: number, options: { alpha?: boolean } = {}): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: options.alpha ? 4 : 3,
      background: options.alpha ? { r: 255, g: 0, b: 0, alpha: 0.5 } : { r: 255, g: 0, b: 0 },
    },
  })
    .png()
    .toBuffer();
}

async function makeJpeg(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 0, g: 128, b: 0 } },
  })
    .jpeg()
    .toBuffer();
}

describe('sanitizeSubmissionImage', () => {
  it('re-encodes a valid jpeg to webp', async () => {
    const result = await sanitizeSubmissionImage(await makeJpeg(64, 32));

    expect(isSubmissionImageSanitizeError(result)).toBe(false);
    if (isSubmissionImageSanitizeError(result)) return;

    expect(result.contentType).toBe('image/webp');
    expect(result.extension).toBe('webp');
    expect(result.width).toBe(64);
    expect(result.height).toBe(32);

    const metadata = await sharp(result.buffer).metadata();
    expect(metadata.format).toBe(SUBMISSION_IMAGE_OUTPUT_FORMAT);
  });

  it('re-encodes a valid png to webp', async () => {
    const result = await sanitizeSubmissionImage(await makePng(64, 32));

    expect(isSubmissionImageSanitizeError(result)).toBe(false);
    if (isSubmissionImageSanitizeError(result)) return;

    const metadata = await sharp(result.buffer).metadata();
    expect(metadata.format).toBe(SUBMISSION_IMAGE_OUTPUT_FORMAT);
  });

  it('preserves transparency for alpha images', async () => {
    const result = await sanitizeSubmissionImage(await makePng(64, 64, { alpha: true }));

    expect(isSubmissionImageSanitizeError(result)).toBe(false);
    if (isSubmissionImageSanitizeError(result)) return;

    const metadata = await sharp(result.buffer).metadata();
    expect(metadata.hasAlpha).toBe(true);
  });

  it('rejects bytes that are not an image', async () => {
    const result = await sanitizeSubmissionImage(Buffer.from('this is definitely not an image'));

    expect(result).toBe('not_an_image');
  });

  it('rejects a fake image/jpeg containing non-image bytes', async () => {
    const result = await sanitizeSubmissionImage(
      Buffer.from('image/jpeg\x00\x00\x00\x00not really a jpeg payload'),
    );

    expect(result).toBe('not_an_image');
  });

  it('rejects a jpeg with a valid header but corrupted scan data', async () => {
    const valid = await makeJpeg(64, 64);
    const corrupt = Buffer.from(valid);
    const scanStart = corrupt.indexOf(Buffer.from([0xff, 0xda]));
    expect(scanStart).toBeGreaterThan(-1);
    const scanEnd = corrupt.length - 2;
    for (let i = scanStart + 2 + Math.floor((scanEnd - scanStart) / 2); i < scanEnd; i++) {
      corrupt[i] = 0xff;
    }

    const result = await sanitizeSubmissionImage(corrupt);

    expect(result).toBe('decode_failed');
  });

  it('rejects a pdf payload', async () => {
    const result = await sanitizeSubmissionImage(
      Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF'),
    );

    expect(result).toBe('not_an_image');
  });

  it('rejects a gif payload (gif not in the accepted format set)', async () => {
    const gif = await sharp({
      create: { width: 16, height: 16, channels: 3, background: { r: 0, g: 0, b: 0 } },
    })
      .gif()
      .toBuffer();

    const result = await sanitizeSubmissionImage(gif);

    expect(result).toBe('not_an_image');
  });

  it('rejects an animated webp (pages > 1)', async () => {
    const result = await sanitizeSubmissionImage(Buffer.from(ANIMATED_WEBP_B64, 'base64'));

    expect(result).toBe('animated_not_supported');
  });

  it('rejects an animated png (acTL chunk)', async () => {
    const apng = Buffer.from(ANIMATED_PNG_B64, 'base64');

    expect(isAnimatedPng(apng)).toBe(true);
    const result = await sanitizeSubmissionImage(apng);

    expect(result).toBe('animated_not_supported');
  });

  it('does not flag a static png as animated', () => {
    expect(isAnimatedPng(Buffer.from('89504e470d0a1a0a', 'hex'))).toBe(false);
  });

  it('rejects an image whose longest side exceeds the input dimension limit', async () => {
    const result = await sanitizeSubmissionImage(
      await makePng(SUBMISSION_IMAGE_MAX_INPUT_DIMENSION + 1, 10),
    );

    expect(result).toBe('dimensions_too_large');
  });

  it('rejects an image whose pixel count exceeds the input pixel limit', async () => {
    const result = await sanitizeSubmissionImage(await makePng(6000, 5000));

    expect(result).toBe('dimensions_too_large');
  });

  it('resizes an oversized image down to the dimension limit', async () => {
    const result = await sanitizeSubmissionImage(await makePng(4000, 1500));

    expect(isSubmissionImageSanitizeError(result)).toBe(false);
    if (isSubmissionImageSanitizeError(result)) return;

    const metadata = await sharp(result.buffer).metadata();
    expect(metadata.width).toBe(SUBMISSION_IMAGE_MAX_DIMENSION);
    expect(metadata.height).toBe(750);
  });

  it('normalizes orientation from EXIF', async () => {
    const withExif = await sharp({
      create: { width: 32, height: 64, channels: 3, background: { r: 0, g: 0, b: 255 } },
    })
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();

    const result = await sanitizeSubmissionImage(withExif);

    expect(isSubmissionImageSanitizeError(result)).toBe(false);
    if (isSubmissionImageSanitizeError(result)) return;

    const metadata = await sharp(result.buffer).metadata();
    expect(metadata.width).toBe(64);
    expect(metadata.height).toBe(32);
  });

  it('strips EXIF metadata on re-encode', async () => {
    const withExif = await sharp({
      create: { width: 32, height: 32, channels: 3, background: { r: 0, g: 0, b: 255 } },
    })
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();

    const result = await sanitizeSubmissionImage(withExif);

    expect(isSubmissionImageSanitizeError(result)).toBe(false);
    if (isSubmissionImageSanitizeError(result)) return;

    const metadata = await sharp(result.buffer).metadata();
    expect(metadata.exif).toBeUndefined();
  });

  it('bounds the output size and dimensions', async () => {
    const result = await sanitizeSubmissionImage(await makePng(3000, 2000));

    expect(isSubmissionImageSanitizeError(result)).toBe(false);
    if (isSubmissionImageSanitizeError(result)) return;

    const metadata = await sharp(result.buffer).metadata();
    expect(metadata.width ?? 0).toBeLessThanOrEqual(SUBMISSION_IMAGE_MAX_DIMENSION);
    expect(metadata.height ?? 0).toBeLessThanOrEqual(SUBMISSION_IMAGE_MAX_DIMENSION);
    expect(result.buffer.length).toBeLessThan(1024 * 1024);
  });

  it('keeps the sanitized output within the bucket 3 MB object limit', async () => {
    const result = await sanitizeSubmissionImage(await makePng(2000, 2000));

    expect(isSubmissionImageSanitizeError(result)).toBe(false);
    if (isSubmissionImageSanitizeError(result)) return;

    expect(result.buffer.length).toBeLessThanOrEqual(SUBMISSION_MAX_FILE_SIZE);
  });

  it('keeps the worst-case sanitized output within the bucket 3 MB object limit', async () => {
    const noise = Buffer.alloc(2000 * 2000 * 3);
    let seed = 12345;
    for (let i = 0; i < noise.length; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      noise[i] = seed & 0xff;
    }
    const noisyPng = await sharp(noise, {
      raw: { width: 2000, height: 2000, channels: 3 },
    })
      .png()
      .toBuffer();

    const result = await sanitizeSubmissionImage(noisyPng);

    expect(isSubmissionImageSanitizeError(result)).toBe(false);
    if (isSubmissionImageSanitizeError(result)) return;

    expect(result.buffer.length).toBeLessThanOrEqual(SUBMISSION_MAX_FILE_SIZE);
  });

  it('keeps the worst-case alpha sanitized output within the bucket 3 MB object limit', async () => {
    const noise = Buffer.alloc(2000 * 2000 * 4);
    let seed = 999;
    for (let i = 0; i < noise.length; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      noise[i] = seed & 0xff;
    }
    const noisyPng = await sharp(noise, {
      raw: { width: 2000, height: 2000, channels: 4 },
    })
      .png()
      .toBuffer();

    const result = await sanitizeSubmissionImage(noisyPng);

    expect(isSubmissionImageSanitizeError(result)).toBe(false);
    if (isSubmissionImageSanitizeError(result)) return;

    expect(result.buffer.length).toBeLessThanOrEqual(SUBMISSION_MAX_FILE_SIZE);
  });

  it('enforces the input pixel ceiling at decode time via limitInputPixels', async () => {
    const oversized = await sharp({
      create: { width: 6000, height: 5000, channels: 3, background: { r: 0, g: 0, b: 0 } },
    })
      .png()
      .toBuffer();

    const result = await sanitizeSubmissionImage(oversized);

    expect(result).toBe('dimensions_too_large');
  });
});

describe('submissionImageSanitizeErrorLabel', () => {
  it('labels each error kind', () => {
    expect(submissionImageSanitizeErrorLabel('not_an_image')).toContain('not a valid image');
    expect(submissionImageSanitizeErrorLabel('animated_not_supported')).toContain(
      'Animated images are not supported',
    );
    expect(submissionImageSanitizeErrorLabel('dimensions_too_large')).toContain('px');
    expect(submissionImageSanitizeErrorLabel('dimensions_too_large')).toContain('megapixels');
    expect(submissionImageSanitizeErrorLabel('output_too_large')).toContain('too large to store');
    expect(submissionImageSanitizeErrorLabel('decode_failed')).toContain('could not be processed');
  });
});
