export const BACKUP_KEY_PREFIX = 'backups/';

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function decodeObjectKey(pathname) {
  if (!pathname.startsWith('/object/')) return null;
  try {
    return decodeURIComponent(pathname.slice('/object/'.length));
  } catch {
    return null;
  }
}

export function createR2BridgeHandler(bucket, prefix = BACKUP_KEY_PREFIX) {
  if (!bucket) throw new Error('R2 bridge requires an R2 bucket binding');

  return async function handle(request) {
    const url = new URL(request.url);

    if (url.pathname === '/list') {
      if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
      const listPrefix = url.searchParams.get('prefix') ?? prefix;
      if (!listPrefix.startsWith(prefix)) return json({ error: 'Key outside backup prefix' }, 400);

      const keys = [];
      let cursor;
      do {
        const listed = await bucket.list({ prefix: listPrefix, cursor, limit: 1000 });
        for (const object of listed.objects) keys.push(object.key);
        cursor = listed.truncated ? listed.cursor : undefined;
      } while (cursor);
      return json({ keys });
    }

    const key = decodeObjectKey(url.pathname);
    if (key === null) return json({ error: 'Not found' }, 404);
    if (!key.startsWith(prefix)) return json({ error: 'Key outside backup prefix' }, 400);

    if (request.method === 'PUT') {
      const object = await bucket.put(key, request.body);
      return json({ key, size: object?.size ?? null });
    }

    if (request.method === 'HEAD') {
      const object = await bucket.head(key);
      if (!object) return new Response(null, { status: 404 });
      // The Workers runtime derives content-length from the body and ignores a
      // value set here, so the size travels in a custom header the runtime
      // leaves untouched.
      return new Response(null, { status: 200, headers: { 'x-object-size': String(object.size) } });
    }

    if (request.method === 'DELETE') {
      await bucket.delete(key);
      return json({ deleted: key });
    }

    return json({ error: 'Method not allowed' }, 405);
  };
}
