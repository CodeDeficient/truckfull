const IPV4_PART = /^\d{1,3}$/;
const IPV6_PART = /^[0-9a-fA-F]{1,4}$/;
const MIN_FEED_CHARS = 1_000_000;
const MAX_FEED_CHARS = 20_000_000;
const MIN_FEED_RANGES = 10_000;
const MAX_RANGES_PER_FAMILY = 100_000;

function parseIpv4(address) {
  const pieces = address.split('.');
  if (pieces.length !== 4 || pieces.some((p) => !IPV4_PART.test(p) || Number(p) > 255)) {
    throw new Error('invalid IPv4');
  }
  return { bits: 32, value: pieces.reduce((n, p) => (n << 8n) | BigInt(p), 0n) };
}

function parseIpv6(address, mapV4) {
  const halves = address.split('::');
  if (halves.length > 2) throw new Error('invalid IPv6');
  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const zeros = 8 - left.length - right.length;
  if ((halves.length === 1 && zeros !== 0) || (halves.length === 2 && zeros < 1)) {
    throw new Error('invalid IPv6');
  }
  const pieces = [...left, ...Array.from({ length: zeros }, () => '0'), ...right];
  if (pieces.length !== 8 || pieces.some((p) => !IPV6_PART.test(p))) {
    throw new Error('invalid IPv6');
  }
  const value = BigInt(`0x${pieces.map((p) => p.padStart(4, '0')).join('')}`);
  if (mapV4 && value >> 32n === 65_535n) return { bits: 32, value: value & 0xff_ff_ff_ffn };
  return { bits: 128, value };
}

function embeddedIpv4AsHex(address) {
  const cut = address.lastIndexOf(':');
  const v4 = parseAddress(address.slice(cut + 1), false);
  const high = Number((v4.value >> 16n) & 65_535n).toString(16);
  const low = Number(v4.value & 65_535n).toString(16);
  return `${address.slice(0, cut + 1)}${high}:${low}`;
}

export function parseAddress(address, mapV4 = true) {
  if (typeof address !== 'string' || !address || address.includes('%')) {
    throw new Error('invalid IP');
  }
  if (!address.includes('.')) return parseIpv6(address, mapV4);
  if (!address.includes(':')) return parseIpv4(address);
  return parseIpv6(embeddedIpv4AsHex(address), mapV4);
}

function* feedLines(text) {
  let pos = 0;
  while (pos < text.length) {
    const end = text.indexOf('\n', pos);
    const stop = end === -1 ? text.length : end;
    yield text.slice(pos, stop).trim();
    pos = stop + 1;
  }
}

function parseCidr(line) {
  const cidr = line.split(',', 1)[0];
  const slash = cidr.lastIndexOf('/');
  if (slash === -1 || !IPV4_PART.test(cidr.slice(slash + 1))) throw new Error('invalid relay CIDR');
  const { bits, value } = parseAddress(cidr.slice(0, slash), false);
  const prefix = Number(cidr.slice(slash + 1));
  if (prefix > bits) throw new Error('invalid relay prefix');
  const shift = BigInt(bits - prefix);
  const start = (value >> shift) << shift;
  return { bits, start, finish: start + (1n << shift) - 1n };
}

function appendRange(list, start, finish) {
  const previous = list.at(-1);
  if (previous && start >= previous[0] && start <= previous[1] + 1n) {
    if (finish > previous[1]) previous[1] = finish;
  } else {
    list.push([start, finish]);
  }
  if (list.length > MAX_RANGES_PER_FAMILY) throw new Error('relay feed too fragmented');
}

function compareStart(a, b) {
  if (a[0] < b[0]) return -1;
  return a[0] > b[0] ? 1 : 0;
}

function mergeRanges(list) {
  const merged = [];
  for (const [start, finish] of [...list].sort(compareStart)) {
    const previous = merged.at(-1);
    if (previous && start <= previous[1] + 1n) {
      if (finish > previous[1]) previous[1] = finish;
    } else {
      merged.push([start, finish]);
    }
  }
  return merged;
}

export function compileRelayFeed(text) {
  if (text.length < MIN_FEED_CHARS || text.length > MAX_FEED_CHARS) {
    throw new Error('unexpected relay feed size');
  }
  const ranges = { 32: [], 128: [] };
  const counts = { 32: 0, 128: 0 };
  for (const line of feedLines(text)) {
    if (!line) continue;
    const { bits, start, finish } = parseCidr(line);
    appendRange(ranges[bits], start, finish);
    counts[bits] += 1;
  }
  if (counts[32] < MIN_FEED_RANGES || counts[128] < MIN_FEED_RANGES) {
    throw new Error('relay feed incomplete');
  }
  return { ranges: { 32: mergeRanges(ranges[32]), 128: mergeRanges(ranges[128]) }, counts };
}
