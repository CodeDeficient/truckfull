import { describe, expect, it } from '@jest/globals';
import { createBridgeClient } from '../../containers/backup/r2Bridge.mjs';

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('R2 bridge client', () => {
  it('uploads through the bridge host and reports the stored size', async () => {
    const calls = [];
    const client = createBridgeClient('http://r2.bridge', async (url, options = {}) => {
      calls.push({ url: String(url), method: options.method });
      return jsonResponse({ key: 'backups/1/schema_1.sql.gz', size: 42 });
    });

    const result = await client.upload('backups/1/schema_1.sql.gz', Buffer.from('abc'));
    expect(result).toEqual({ key: 'backups/1/schema_1.sql.gz', size: 42 });
    expect(calls[0]).toMatchObject({
      url: 'http://r2.bridge/object/backups%2F1%2Fschema_1.sql.gz',
      method: 'PUT',
    });
  });

  it('encodes object keys so slashes never escape the bridge route', async () => {
    let seen;
    const client = createBridgeClient('http://r2.bridge/', async (url) => {
      seen = String(url);
      return new Response(null, { status: 404 });
    });

    await client.head('backups/1/data_1.sql.gz');
    expect(seen).toBe('http://r2.bridge/object/backups%2F1%2Fdata_1.sql.gz');
  });

  it('treats a missing object as null rather than an error', async () => {
    const client = createBridgeClient('http://r2.bridge', async () => new Response(null, { status: 404 }));
    await expect(client.head('backups/1/data_1.sql.gz')).resolves.toBeNull();
  });

  it('returns the size reported by the bridge for verification', async () => {
    const client = createBridgeClient('http://r2.bridge', async () =>
      new Response(null, { status: 200, headers: { 'x-object-size': '21' } }),
    );
    await expect(client.head('backups/1/data_1.sql.gz')).resolves.toEqual({
      key: 'backups/1/data_1.sql.gz',
      size: 21,
    });
  });

  it('fails loudly when the bridge omits the object size header', async () => {
    // A response that only carries content-length is the contract the Workers
    // runtime cannot honour for a null body; treat it as a bridge error rather
    // than silently verifying against 0.
    const client = createBridgeClient('http://r2.bridge', async () =>
      new Response(null, { status: 200, headers: { 'content-length': '21' } }),
    );
    await expect(client.head('backups/1/data_1.sql.gz')).rejects.toThrow(/x-object-size/);
  });

  it('reads the bucket listing as keys', async () => {
    const client = createBridgeClient('http://r2.bridge', async () =>
      jsonResponse({ keys: ['backups/1/manifest.json'] }),
    );
    await expect(client.list()).resolves.toEqual(['backups/1/manifest.json']);
  });

  it('fails loudly when an operation is rejected', async () => {
    const client = createBridgeClient('http://r2.bridge', async () => jsonResponse({ error: 'no' }, 500));
    await expect(client.upload('backups/1/data_1.sql.gz', Buffer.from('x'))).rejects.toThrow(
      /status 500/,
    );
    await expect(client.list()).rejects.toThrow(/status 500/);
  });
});
