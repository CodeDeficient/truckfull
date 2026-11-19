/**
 * @jest-environment node
 */
import { describe, expect, it, jest } from '@jest/globals';
import { createR2BridgeHandler } from '../../worker/backupR2.mjs';

async function toBuffer(body) {
  if (body == null) return Buffer.alloc(0);
  if (typeof body === 'string') return Buffer.from(body);
  if (Buffer.isBuffer(body)) return body;
  if (ArrayBuffer.isView(body)) return Buffer.from(body.buffer, body.byteOffset, body.byteLength);
  if (body instanceof ArrayBuffer) return Buffer.from(body);
  if (typeof body.getReader === 'function') {
    const reader = body.getReader();
    const chunks = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(Buffer.from(value));
    }
    return Buffer.concat(chunks);
  }
  if (typeof body.arrayBuffer === 'function') return Buffer.from(await body.arrayBuffer());
  return Buffer.alloc(0);
}

function createBucket() {
  const objects = new Map();
  return {
    objects,
    put: jest.fn(async (key, body) => {
      const buffer = await toBuffer(body);
      objects.set(key, buffer);
      return { key, size: buffer.length };
    }),
    head: jest.fn(async (key) => (objects.has(key) ? { key, size: objects.get(key).length } : null)),
    delete: jest.fn(async (key) => {
      objects.delete(key);
    }),
    list: jest.fn(async ({ prefix = '', cursor, limit = 1000 } = {}) => {
      const keys = [...objects.keys()].filter((key) => key.startsWith(prefix));
      const start = cursor ? Number(cursor) : 0;
      const page = keys.slice(start, start + limit);
      const truncated = start + limit < keys.length;
      return { objects: page.map((key) => ({ key })), truncated, cursor: truncated ? String(start + limit) : undefined };
    }),
  };
}

function request(method, path, body) {
  return new Request(`http://r2.bridge${path}`, { method, body });
}

describe('R2 bridge handler', () => {
  it('stores an object and reports its size', async () => {
    const bucket = createBucket();
    const handler = createR2BridgeHandler(bucket);

    const response = await handler(request('PUT', '/object/backups%2F1%2Fschema_1.sql.gz', 'payload'));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ key: 'backups/1/schema_1.sql.gz', size: 7 });
    expect(bucket.objects.get('backups/1/schema_1.sql.gz').toString()).toBe('payload');
  });

  it('reports the size of a stored object over HEAD via a custom header', async () => {
    const bucket = createBucket();
    const handler = createR2BridgeHandler(bucket);
    await handler(request('PUT', '/object/backups%2F1%2Fdata_1.sql.gz', '12345'));

    const response = await handler(request('HEAD', '/object/backups%2F1%2Fdata_1.sql.gz'));
    expect(response.status).toBe(200);
    // The Workers runtime overwrites content-length from the body, so the
    // contract deliberately uses a custom header the runtime leaves alone.
    expect(response.headers.get('x-object-size')).toBe('5');
  });

  it('answers 404 for a missing object and preserves the status contract', async () => {
    const handler = createR2BridgeHandler(createBucket());
    const response = await handler(request('HEAD', '/object/backups%2F1%2Fmissing.sql.gz'));
    expect(response.status).toBe(404);
  });

  it('lists only keys inside the backup prefix across pages', async () => {
    const bucket = createBucket();
    const handler = createR2BridgeHandler(bucket);
    for (const key of ['backups/1/a.sql.gz', 'backups/1/b.sql.gz', 'notes/x.txt']) {
      bucket.objects.set(key, Buffer.from('x'));
    }
    bucket.list.mockImplementation(async ({ prefix = '', cursor, limit = 1 } = {}) => {
      const keys = [...bucket.objects.keys()].filter((key) => key.startsWith(prefix));
      const start = cursor ? Number(cursor) : 0;
      const page = keys.slice(start, start + limit);
      const truncated = start + limit < keys.length;
      return { objects: page.map((key) => ({ key })), truncated, cursor: truncated ? String(start + limit) : undefined };
    });

    const response = await handler(request('GET', '/list?prefix=backups%2F'));
    await expect(response.json()).resolves.toEqual({ keys: ['backups/1/a.sql.gz', 'backups/1/b.sql.gz'] });
  });

  it('refuses to read or write outside the backup prefix', async () => {
    const bucket = createBucket();
    const handler = createR2BridgeHandler(bucket);

    const write = await handler(request('PUT', '/object/secrets.txt', 'data'));
    const read = await handler(request('GET', '/list?prefix=secrets%2F'));

    expect(write.status).toBe(400);
    expect(read.status).toBe(400);
    expect(bucket.put).not.toHaveBeenCalled();
  });

  it('rejects unsupported methods without touching the bucket', async () => {
    const bucket = createBucket();
    const handler = createR2BridgeHandler(bucket);
    const response = await handler(request('POST', '/object/backups%2F1%2Fs.sql.gz', 'x'));
    expect(response.status).toBe(405);
    expect(bucket.put).not.toHaveBeenCalled();
  });

  it('deletes objects inside the prefix', async () => {
    const bucket = createBucket();
    const handler = createR2BridgeHandler(bucket);
    bucket.objects.set('backups/1/a.sql.gz', Buffer.from('x'));

    const response = await handler(request('DELETE', '/object/backups%2F1%2Fa.sql.gz'));
    expect(response.status).toBe(200);
    expect(bucket.objects.has('backups/1/a.sql.gz')).toBe(false);
  });
});
