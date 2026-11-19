const TRAILING_SLASH = /\/$/;

export function createBridgeClient(baseUrl, fetchImpl = fetch) {
  const base = baseUrl.replace(TRAILING_SLASH, '');

  function objectUrl(key) {
    return `${base}/object/${encodeURIComponent(key)}`;
  }

  async function upload(key, body) {
    const response = await fetchImpl(objectUrl(key), { method: 'PUT', body });
    if (!response.ok) {
      throw new Error(`R2 bridge upload failed for ${key} with status ${response.status}`);
    }
    const payload = await response.json().catch(() => ({}));
    return { key, size: typeof payload.size === 'number' ? payload.size : body.length };
  }

  async function head(key) {
    const response = await fetchImpl(objectUrl(key), { method: 'HEAD' });
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`R2 bridge head failed for ${key} with status ${response.status}`);
    }
    const rawSize = response.headers.get('x-object-size');
    const size = rawSize === null ? Number.NaN : Number(rawSize);
    if (!Number.isFinite(size)) {
      throw new TypeError(`R2 bridge head for ${key} did not include a usable x-object-size header`);
    }
    return { key, size };
  }

  async function list(prefix = 'backups/') {
    const response = await fetchImpl(`${base}/list?prefix=${encodeURIComponent(prefix)}`);
    if (!response.ok) {
      throw new Error(`R2 bridge list failed with status ${response.status}`);
    }
    const payload = await response.json();
    return Array.isArray(payload.keys) ? payload.keys : [];
  }

  async function deleteObjects(keys) {
    for (const key of keys) {
      const response = await fetchImpl(objectUrl(key), { method: 'DELETE' });
      if (!response.ok && response.status !== 404) {
        throw new Error(`R2 bridge delete failed for ${key} with status ${response.status}`);
      }
    }
  }

  return { upload, head, list, deleteObjects };
}
