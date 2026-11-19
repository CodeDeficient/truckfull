/**
 * @jest-environment node
 */
import { describe, expect, it, jest } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  NEXT_CACHE_KEY_PREFIX,
  NEXT_CACHE_MAX_BYTES,
  createNextCacheStoreHandler,
} from '../../worker/nextCacheStore.mjs';

interface FakeBucket {
  readonly objects: Map<string, Buffer>;
  get: (key: string) => Promise<{ body: string } | null>;
  put: (key: string, body: ArrayBuffer) => Promise<{ key: string }>;
}

interface FakeRequestInit {
  readonly method?: string;
  readonly headers?: Record<string, string>;
  readonly body?: Buffer;
}

function createFakeBucket(): FakeBucket {
  const objects = new Map<string, Buffer>();
  return {
    objects,
    get: jest.fn(async (key: string) => {
      const value = objects.get(key);
      return value ? { body: value.toString('utf8') } : null;
    }),
    put: jest.fn(async (key: string, body: ArrayBuffer) => {
      objects.set(key, Buffer.from(body));
      return { key };
    }),
  };
}

function objectUrl(key: string): string {
  return `http://next-cache.internal/object/${encodeURIComponent(key)}`;
}

function fakeRequest(url: string, init: FakeRequestInit = {}): Request {
  const payload = init.body ?? Buffer.alloc(0);
  return {
    url,
    method: init.method ?? 'GET',
    headers: new Headers(init.headers),
    arrayBuffer: async () =>
      payload.buffer.slice(payload.byteOffset, payload.byteOffset + payload.byteLength),
  } as unknown as Request;
}

function getRequest(key: string): Request {
  return fakeRequest(objectUrl(key));
}

function putRequest(key: string, body: string, contentLength: string | null): Request {
  const headers: Record<string, string> = {};
  if (contentLength !== null) headers['content-length'] = contentLength;
  return fakeRequest(objectUrl(key), { method: 'PUT', headers, body: Buffer.from(body) });
}

describe('next cache store handler', () => {
  it('exposes the key prefix and size cap', () => {
    expect(NEXT_CACHE_KEY_PREFIX).toBe('v1/');
    expect(NEXT_CACHE_MAX_BYTES).toBe(17 * 1024 * 1024);
  });

  it('returns the stored bytes on GET hit', async () => {
    const bucket = createFakeBucket();
    bucket.objects.set('v1/page', Buffer.from('cached'));
    const handler = createNextCacheStoreHandler(bucket);

    const response = await handler(getRequest('v1/page'));
    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe('cached');
  });

  it('returns 404 on GET miss', async () => {
    const handler = createNextCacheStoreHandler(createFakeBucket());
    const response = await handler(getRequest('v1/missing'));
    expect(response.status).toBe(404);
  });

  it('stores the PUT body and answers 204', async () => {
    const bucket = createFakeBucket();
    const handler = createNextCacheStoreHandler(bucket);

    const response = await handler(putRequest('v1/page', 'hello', '5'));
    expect(response.status).toBe(204);
    expect(bucket.objects.get('v1/page')?.toString('utf8')).toBe('hello');
  });

  it('rejects a PUT whose declared length exceeds the cap with 413', async () => {
    const bucket = createFakeBucket();
    const handler = createNextCacheStoreHandler(bucket);

    const response = await handler(putRequest('v1/page', 'x', String(NEXT_CACHE_MAX_BYTES + 1)));
    expect(response.status).toBe(413);
    expect(bucket.put).not.toHaveBeenCalled();
  });

  it('rejects a PUT whose body exceeds the cap with 413 even when the declared length lies', async () => {
    const bucket = createFakeBucket();
    const handler = createNextCacheStoreHandler(bucket);
    const oversized = fakeRequest(objectUrl('v1/page'), {
      method: 'PUT',
      headers: { 'content-length': '1' },
      body: Buffer.alloc(NEXT_CACHE_MAX_BYTES + 1),
    });

    const response = await handler(oversized);
    expect(response.status).toBe(413);
    expect(bucket.put).not.toHaveBeenCalled();
  });

  it('accepts a PUT without a content-length header and still stores it', async () => {
    const bucket = createFakeBucket();
    const handler = createNextCacheStoreHandler(bucket);

    const response = await handler(putRequest('v1/page', 'hello', null));
    expect(response.status).toBe(204);
    expect(bucket.put).toHaveBeenCalledTimes(1);
  });

  it('rejects a PUT whose body exceeds the cap even without a content-length header', async () => {
    const bucket = createFakeBucket();
    const handler = createNextCacheStoreHandler(bucket);

    const response = await handler(
      putRequest('v1/page', 'x'.repeat(NEXT_CACHE_MAX_BYTES + 1), null),
    );
    expect(response.status).toBe(413);
    expect(bucket.put).not.toHaveBeenCalled();
  });

  it('rejects a PUT with a non-numeric content-length with 413', async () => {
    const bucket = createFakeBucket();
    const handler = createNextCacheStoreHandler(bucket);

    const response = await handler(putRequest('v1/page', 'hello', 'abc'));
    expect(response.status).toBe(413);
    expect(bucket.put).not.toHaveBeenCalled();
  });

  it('rejects a key without the v1/ prefix with 400', async () => {
    const handler = createNextCacheStoreHandler(createFakeBucket());
    const response = await handler(getRequest('backups/page'));
    expect(response.status).toBe(400);
  });

  it('rejects a key containing .. with 400', async () => {
    const handler = createNextCacheStoreHandler(createFakeBucket());
    const response = await handler(getRequest('v1/../secrets'));
    expect(response.status).toBe(400);
  });

  it('rejects a key longer than 1024 characters with 400', async () => {
    const handler = createNextCacheStoreHandler(createFakeBucket());
    const response = await handler(getRequest(`v1/${'a'.repeat(1024)}`));
    expect(response.status).toBe(400);
  });

  it('answers 404 for a path that is not /object/<key>', async () => {
    const handler = createNextCacheStoreHandler(createFakeBucket());
    const response = await handler(fakeRequest('http://next-cache.internal/list'));
    expect(response.status).toBe(404);
  });

  it('answers 404 for an undecodable object key', async () => {
    const handler = createNextCacheStoreHandler(createFakeBucket());
    const response = await handler(fakeRequest('http://next-cache.internal/object/%E0%A4%A'));
    expect(response.status).toBe(404);
  });

  it('answers 405 for unsupported methods', async () => {
    const handler = createNextCacheStoreHandler(createFakeBucket());
    const response = await handler(fakeRequest(objectUrl('v1/page'), { method: 'DELETE' }));
    expect(response.status).toBe(405);
  });

  it('answers 503 for every request when no bucket is bound', async () => {
    const handler = createNextCacheStoreHandler(undefined);
    const response = await handler(getRequest('v1/page'));
    expect(response.status).toBe(503);
  });
});

describe('container worker wiring for the next cache', () => {
  const source = readFileSync(join(process.cwd(), 'worker', 'container.mjs'), 'utf8');

  it('re-exports ContainerProxy so outbound interception works', () => {
    expect(source).toContain("export { ContainerProxy } from '@cloudflare/containers'");
  });

  it('routes the next-cache.internal host to the R2 store handler', () => {
    expect(source).toContain("'next-cache.internal'");
  });

  it('forwards NEXT_CACHE_R2 into the Next.js container', () => {
    expect(source).toContain("'NEXT_CACHE_R2'");
  });
});
