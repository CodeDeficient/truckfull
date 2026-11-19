import { describe, expect, it } from '@jest/globals';
import { deserializeEntry, serializeEntry } from '../../../lib/next-cache/serialize.mjs';

describe('serializeEntry / deserializeEntry', () => {
  it('round-trips an APP_PAGE-like value with binary and map fields', () => {
    const value = {
      kind: 'APP_PAGE',
      html: '<html><body>hi</body></html>',
      rscData: Buffer.from([0, 1, 2, 250, 255]),
      segmentData: new Map<string, Buffer>([
        ['/_tree', Buffer.from('tree')],
        ['/_head', Buffer.from('head')],
      ]),
      headers: { 'x-next-cache-tags': '_N_T_/', 'content-type': 'text/html' },
      status: 200,
      postponed: undefined,
    };

    const restored = deserializeEntry(serializeEntry({ lastModified: 42, value })) as {
      lastModified: number;
      value: typeof value;
    };

    expect(restored.lastModified).toBe(42);
    expect(restored.value.kind).toBe('APP_PAGE');
    expect(restored.value.html).toBe(value.html);
    expect(Buffer.isBuffer(restored.value.rscData)).toBe(true);
    expect(restored.value.rscData.equals(value.rscData)).toBe(true);
    expect(restored.value.segmentData).toBeInstanceOf(Map);
    expect(restored.value.segmentData.get('/_tree')?.toString()).toBe('tree');
    expect(restored.value.segmentData.get('/_head')?.toString()).toBe('head');
    expect(restored.value.headers).toEqual(value.headers);
    expect(restored.value.status).toBe(200);
    expect('postponed' in restored.value).toBe(false);
  });

  it('round-trips a plain FETCH-like object', () => {
    const value = {
      kind: 'FETCH',
      data: {
        headers: { etag: 'abc' },
        body: '{"ok":true}',
        url: 'https://example.com',
        status: 200,
      },
      revalidate: 60,
      tags: ['trucks'],
    };

    expect(deserializeEntry(serializeEntry({ lastModified: 1, value }))).toEqual({
      lastModified: 1,
      value,
    });
  });

  it('keeps arrays and nested binary values intact', () => {
    const value = {
      chunks: [Buffer.from('a'), Buffer.from('b')],
      nested: { deep: [1, 'two', null] },
    };

    const restored = deserializeEntry(serializeEntry(value)) as typeof value;

    expect(restored.chunks.map((chunk) => chunk.toString())).toEqual(['a', 'b']);
    expect(restored.nested).toEqual({ deep: [1, 'two', null] });
  });
});
