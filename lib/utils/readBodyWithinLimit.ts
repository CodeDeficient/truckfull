export interface LimitedBodyResult {
  readonly body: string | null;
  readonly tooLarge: boolean;
}

export async function readBodyWithinLimit(
  body: ReadableStream<Uint8Array> | null,
  maxBytes: number,
): Promise<LimitedBodyResult> {
  if (!body) return { body: null, tooLarge: false };

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        return { body: null, tooLarge: true };
      }
      chunks.push(value);
    }

    const bytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { body: new TextDecoder().decode(bytes), tooLarge: false };
  } finally {
    reader.releaseLock();
  }
}
