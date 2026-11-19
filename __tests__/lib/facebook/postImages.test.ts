import { describe, it, expect } from '@jest/globals';
import { parseFullPicture } from '@/lib/facebook/postImages';

describe('parseFullPicture', () => {
  it('extracts full_picture from valid raw_payload JSON', () => {
    const payload = JSON.stringify({
      id: '123',
      full_picture: 'https://example.com/img.jpg',
      message: 'Test',
    });
    expect(parseFullPicture(payload)).toBe('https://example.com/img.jpg');
  });

  it('returns null when raw_payload is null', () => {
    expect(parseFullPicture(null)).toBeNull();
  });

  it('returns null when full_picture is missing', () => {
    const payload = JSON.stringify({ id: '123', message: 'Test' });
    expect(parseFullPicture(payload)).toBeNull();
  });

  it('returns null when full_picture is null in payload', () => {
    const payload = JSON.stringify({ id: '123', full_picture: null });
    expect(parseFullPicture(payload)).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    expect(parseFullPicture('not json')).toBeNull();
  });

  it('extracts image from attachments.media.image.src (webhook path)', () => {
    const payload = JSON.stringify({
      id: '456',
      message: 'Photo post',
      attachments: {
        data: [
          {
            media: {
              image: {
                src: 'https://scontent.facebook.com/v/photo.jpg',
              },
            },
          },
        ],
      },
    });
    expect(parseFullPicture(payload)).toBe('https://scontent.facebook.com/v/photo.jpg');
  });

  it('prefers full_picture over attachments when both present', () => {
    const payload = JSON.stringify({
      id: '789',
      full_picture: 'https://graph-image.com/img.jpg',
      message: 'Both fields',
      attachments: {
        data: [
          {
            media: {
              image: {
                src: 'https://scontent.facebook.com/v/attached.jpg',
              },
            },
          },
        ],
      },
    });
    expect(parseFullPicture(payload)).toBe('https://graph-image.com/img.jpg');
  });

  it('extracts url from attachment when media.image.src is missing but url has image extension', () => {
    const payload = JSON.stringify({
      id: '101',
      message: 'Link post',
      attachments: {
        data: [
          {
            url: 'https://example.com/photo.jpg',
          },
        ],
      },
    });
    expect(parseFullPicture(payload)).toBe('https://example.com/photo.jpg');
  });

  it('returns null when attachments exist but have no usable image data', () => {
    const payload = JSON.stringify({
      id: '102',
      message: 'Attachment without image',
      attachments: {
        data: [
          {
            url: 'https://facebook.com/permalink',
          },
        ],
      },
    });
    expect(parseFullPicture(payload)).toBeNull();
  });

  it('returns null when attachments array is empty', () => {
    const payload = JSON.stringify({
      id: '103',
      message: 'Empty attachments',
      attachments: {
        data: [],
      },
    });
    expect(parseFullPicture(payload)).toBeNull();
  });
});
