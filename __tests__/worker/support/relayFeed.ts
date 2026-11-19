export const RELAY_IPV4 = '172.16.0.5';
export const RELAY_IPV6 = '2a02:26f7:0:3::1';
export const OTHER_IPV4 = '198.51.100.7';

const PADDING = ',US,US-CA,Los Angeles,'.padEnd(40, ' ');

export function relayFeedText(): string {
  const lines: string[] = [];
  for (let i = 0; i < 10_000; i += 1) {
    lines.push(
      `172.${16 + Math.floor(i / 256 / 256)}.${Math.floor(i / 256) % 256}.${i % 256}/32${PADDING}`,
    );
  }
  for (let i = 0; i < 10_000; i += 1) {
    lines.push(`2a02:26f7:0:${i.toString(16)}::/64${PADDING}`);
  }
  return `${lines.join('\n')}\n`;
}

export function relayFeedResponse(text = relayFeedText()): Response {
  return new Response(text, {
    status: 200,
    headers: {
      etag: '"feed-1"',
      'content-length': String(new TextEncoder().encode(text).byteLength),
    },
  });
}
