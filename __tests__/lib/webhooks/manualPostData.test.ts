import { describe, expect, it } from '@jest/globals';
import {
  applyPersistedCreatedTime,
  buildRecoveredPostData,
  normalizeManualPostData,
  parsePersistedPostData,
  reconstructPostData,
  type PersistedPostRow,
} from '@/lib/webhooks/manualPostData';

describe('applyPersistedCreatedTime', () => {
  it('uses the persisted timestamp when a post record exists', () => {
    const postData = { post_id: 'post-1', created_time: 'incoming-time' };

    expect(applyPersistedCreatedTime(postData, 'persisted-time')).toEqual({
      post_id: 'post-1',
      created_time: 'persisted-time',
    });
  });

  it('preserves payload data when no post record exists', () => {
    const postData = { post_id: 'post-1', created_time: 'incoming-time' };

    expect(applyPersistedCreatedTime(postData, null)).toBe(postData);
  });
});

describe('buildRecoveredPostData', () => {
  it('handles a null persisted payload without throwing', () => {
    expect(buildRecoveredPostData('post-1', null, null, null, 'stored-time')).toMatchObject({
      post_id: 'post-1',
      created_time: 'stored-time',
    });
  });

  it('uses the persisted payload message when columns are empty', () => {
    expect(buildRecoveredPostData(
      'post-1',
      { message: 'payload message' },
      null,
      null,
      'stored-time',
    )).toMatchObject({
      post_id: 'post-1',
      message: 'payload message',
      created_time: 'stored-time',
    });
  });
});

describe('reconstructPostData', () => {
  const row = (overrides?: Partial<Pick<PersistedPostRow, 'message' | 'raw_text' | 'raw_payload' | 'created_time'>>): Pick<
    PersistedPostRow,
    'facebook_post_id' | 'message' | 'raw_text' | 'created_time' | 'raw_payload'
  > => ({
    facebook_post_id: 'post-1',
    message: null,
    raw_text: null,
    created_time: 'stored-time',
    raw_payload: null,
    ...overrides,
  });

  it('prefers the persisted message column over the payload', () => {
    const result = reconstructPostData(
      row({ message: 'persisted message', raw_payload: JSON.stringify({ message: 'payload message' }) }),
    );

    expect(result).toEqual({
      post_id: 'post-1',
      message: 'persisted message',
      created_time: 'stored-time',
    });
  });

  it('falls back to raw_text then the validated payload message', () => {
    expect(reconstructPostData(row({ raw_text: 'raw text' }))).toEqual({
      post_id: 'post-1',
      message: 'raw text',
      created_time: 'stored-time',
    });
    expect(
      reconstructPostData(row({ raw_payload: JSON.stringify({ message: 'payload message' }) })),
    ).toEqual({
      post_id: 'post-1',
      message: 'payload message',
      created_time: 'stored-time',
    });
  });

  it('always uses the persisted created_time, never the payload timestamp', () => {
    const result = reconstructPostData(
      row({ created_time: 'stored-time', raw_payload: JSON.stringify({ created_time: 'payload-time' }) }),
    );

    expect(result.created_time).toBe('stored-time');
  });

  it('ignores non-string payload message shapes', () => {
    const result = reconstructPostData(
      row({ raw_payload: JSON.stringify({ message: { nested: true } }) }),
    );

    expect(result).toEqual({ post_id: 'post-1', created_time: 'stored-time' });
  });

  it('carries validated attachments and full_picture from the payload', () => {
    const result = reconstructPostData(
      row({
        raw_payload: JSON.stringify({
          full_picture: 'https://example.com/img.jpg',
          attachments: { data: [{ url: 'https://example.com/a.jpg' }] },
        }),
      }),
    );

    expect(result.full_picture).toBe('https://example.com/img.jpg');
    expect(result.attachments).toEqual({ data: [{ url: 'https://example.com/a.jpg' }] });
  });
});

describe('normalizeManualPostData', () => {
  it('derives the post id when the payload omits it', () => {
    expect(normalizeManualPostData({ message: 'hello' }, 'post-1')).toEqual({
      message: 'hello',
      post_id: 'post-1',
    });
  });

  it('preserves a matching supplied post id', () => {
    expect(normalizeManualPostData({ post_id: 'post-1' }, 'post-1')).toEqual({
      post_id: 'post-1',
    });
  });

  it('rejects mismatched, primitive, and array payloads', () => {
    expect(normalizeManualPostData({ post_id: 'post-2' }, 'post-1')).toBeNull();
    expect(normalizeManualPostData('post-1', 'post-1')).toBeNull();
    expect(normalizeManualPostData([], 'post-1')).toBeNull();
  });

  it('rejects malformed fields consumed by post analysis', () => {
    expect(normalizeManualPostData({ message: 42 }, 'post-1')).toBeNull();
    expect(normalizeManualPostData({ attachments: { data: [null] } }, 'post-1')).toBeNull();
  });

  it('preserves attachments without a data collection', () => {
    expect(normalizeManualPostData({ attachments: {} }, 'post-1')).toEqual({
      attachments: {},
      post_id: 'post-1',
    });
  });

  it('accepts nullable optional Facebook fields as absent', () => {
    expect(normalizeManualPostData({
      message: null,
      full_picture: null,
      attachments: null,
    }, 'post-1')).toEqual({
      post_id: 'post-1',
    });
  });
});

describe('parsePersistedPostData', () => {
  it('parses textual payloads for replay', () => {
    expect(parsePersistedPostData('{"full_picture":"https://example.com/photo.jpg"}')).toEqual({
      full_picture: 'https://example.com/photo.jpg',
    });
  });

  it('rejects malformed or non-object textual payloads', () => {
    expect(parsePersistedPostData('{invalid')).toBeNull();
    expect(parsePersistedPostData('[]')).toBeNull();
  });
});
