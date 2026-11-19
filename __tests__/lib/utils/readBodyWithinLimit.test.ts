import { describe, expect, it } from '@jest/globals';
import { ReadableStream } from 'node:stream/web';
import { readBodyWithinLimit } from '@/lib/utils/readBodyWithinLimit';

function streamFromChunks(chunks: readonly string[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk));
      controller.close();
    },
  });
}

describe('readBodyWithinLimit', () => {
  it('reads a body whose encoded byte length is within the limit', async () => {
    await expect(readBodyWithinLimit(streamFromChunks(['{"events":[]}']), 32)).resolves.toEqual({
      body: '{"events":[]}',
      tooLarge: false,
    });
  });

  it('rejects a chunked body after it exceeds the byte limit', async () => {
    await expect(readBodyWithinLimit(streamFromChunks(['1234', '5678']), 7)).resolves.toEqual({
      body: null,
      tooLarge: true,
    });
  });

  it('reports a missing body without treating it as oversized', async () => {
    await expect(readBodyWithinLimit(null, 32)).resolves.toEqual({
      body: null,
      tooLarge: false,
    });
  });
});
