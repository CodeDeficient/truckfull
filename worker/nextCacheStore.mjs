const DIGITS_ONLY = /^\d+$/;

export const NEXT_CACHE_KEY_PREFIX = 'v1/';
export const NEXT_CACHE_MAX_BYTES = 17 * 1024 * 1024;

const OBJECT_PATH_PREFIX = '/object/';
const MAX_KEY_LENGTH = 1024;

function empty(status) {
  return new Response(null, { status });
}

function decodeObjectKey(pathname) {
  if (!pathname.startsWith(OBJECT_PATH_PREFIX)) return null;
  try {
    return decodeURIComponent(pathname.slice(OBJECT_PATH_PREFIX.length));
  } catch {
    return null;
  }
}

function isAllowedKey(key) {
  return (
    key.startsWith(NEXT_CACHE_KEY_PREFIX) && key.length <= MAX_KEY_LENGTH && !key.includes('..')
  );
}

function declaredLengthWithinCap(request) {
  const raw = request.headers.get('content-length');
  if (raw === null) return true;
  return DIGITS_ONLY.test(raw) && Number(raw) <= NEXT_CACHE_MAX_BYTES;
}

async function readObject(bucket, key) {
  const object = await bucket.get(key);
  if (!object) return empty(404);
  return new Response(object.body, { status: 200 });
}

async function writeObject(bucket, key, request) {
  if (!declaredLengthWithinCap(request)) return empty(413);
  const buffer = await request.arrayBuffer();
  if (buffer.byteLength > NEXT_CACHE_MAX_BYTES) return empty(413);
  await bucket.put(key, buffer);
  return empty(204);
}

export function createNextCacheStoreHandler(bucket) {
  return async function handle(request) {
    if (!bucket) return empty(503);
    const key = decodeObjectKey(new URL(request.url).pathname);
    if (key === null) return empty(404);
    if (!isAllowedKey(key)) return empty(400);
    if (request.method === 'GET') return readObject(bucket, key);
    if (request.method === 'PUT') return writeObject(bucket, key, request);
    return empty(405);
  };
}
