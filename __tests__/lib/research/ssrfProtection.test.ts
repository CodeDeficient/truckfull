import { describe, it, expect } from '@jest/globals';

const BLOCKED_HOSTS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '169.254.169.254',
  'metadata.google.internal',
  '100.100.100.200',
];

function isPrivateIP(hostname: string): boolean {
  const decimalIp = /^\d{7,10}$/;
  if (decimalIp.test(hostname)) {
    const num = parseInt(hostname, 10);
    const a = (num >>> 24) & 0xff;
    const b = (num >>> 16) & 0xff;
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
  }

  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const m = hostname.match(ipv4);
  if (m) {
    const octets = m.slice(1).map(Number);
    if (octets.some((n) => n > 255)) return true;
    const [a, b] = octets;
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 100 && b === 100) return true;
  }
  if (hostname.startsWith('[') && hostname.endsWith(']')) {
    const inner = hostname.slice(1, -1).toLowerCase();
    if (inner === '::1' || inner === '::') return true;
    if (inner.startsWith('fc') || inner.startsWith('fd')) return true;
    if (inner.includes('fe80')) return true;
    const v4Mapped = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(inner);
    if (v4Mapped) return isPrivateIP(v4Mapped[1]!);
    const hexMapped = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(inner);
    if (hexMapped) {
      const high = parseInt(hexMapped[1]!, 16);
      const low = parseInt(hexMapped[2]!, 16);
      const a = (high >> 8) & 0xff;
      const b = high & 0xff;
      if (a === 10) return true;
      if (a === 172 && b >= 16 && b <= 31) return true;
      if (a === 192 && b === 168) return true;
      if (a === 127) return true;
      if (a === 0) return true;
      if (a === 169 && b === 254) return true;
      if (a === 100 && b === 100) return true;
    }
  }
  return false;
}

function isPrivateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    if (BLOCKED_HOSTS.some((h) => hostname === h || hostname.endsWith(`.${h}`))) return true;
    if (isPrivateIP(hostname)) return true;
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return true;
    return false;
  } catch {
    return true;
  }
}

describe('isPrivateUrl (SSRF protection)', () => {
  it('blocks localhost', () => {
    expect(isPrivateUrl('http://localhost:3000/admin')).toBe(true);
  });

  it('blocks 127.0.0.1', () => {
    expect(isPrivateUrl('http://127.0.0.1:8080/internal')).toBe(true);
  });

  it('blocks AWS metadata endpoint', () => {
    expect(isPrivateUrl('http://169.254.169.254/latest/meta-data/')).toBe(true);
  });

  it('blocks Google Cloud metadata', () => {
    expect(isPrivateUrl('http://metadata.google.internal/computeMetadata/v1/')).toBe(true);
  });

  it('blocks Alibaba Cloud metadata', () => {
    expect(isPrivateUrl('http://100.100.100.200/latest/meta-data/')).toBe(true);
  });

  it('blocks 0.0.0.0', () => {
    expect(isPrivateUrl('http://0.0.0.0:3000/')).toBe(true);
  });

  it('blocks ftp protocol', () => {
    expect(isPrivateUrl('ftp://example.com/file')).toBe(true);
  });

  it('allows HTTPS URLs to public domains', () => {
    expect(isPrivateUrl('https://example.com/page')).toBe(false);
  });

  it('allows HTTP URLs to public domains', () => {
    expect(isPrivateUrl('http://example.com/page')).toBe(false);
  });

  it('allows subdomains of public domains', () => {
    expect(isPrivateUrl('https://www.eventbrite.com/e/event-123')).toBe(false);
  });

  it('blocks invalid URLs', () => {
    expect(isPrivateUrl('not-a-url')).toBe(true);
  });

  it('blocks RFC 1918 10.x.x.x range', () => {
    expect(isPrivateUrl('http://10.0.0.1/admin')).toBe(true);
  });

  it('blocks RFC 1918 172.16.x.x range', () => {
    expect(isPrivateUrl('http://172.16.0.1/internal')).toBe(true);
  });

  it('blocks RFC 1918 192.168.x.x range', () => {
    expect(isPrivateUrl('http://192.168.1.1/')).toBe(true);
  });

  it('allows public IP addresses', () => {
    expect(isPrivateUrl('https://8.8.8.8/dns')).toBe(false);
  });

  it('blocks IPv6 unique local addresses', () => {
    expect(isPrivateUrl('http://[fd00::1]/')).toBe(true);
  });

  it('blocks IPv4-mapped IPv6 to private IP', () => {
    expect(isPrivateUrl('http://[::ffff:10.0.0.1]/')).toBe(true);
  });

  it('blocks IPv4-mapped IPv6 to localhost', () => {
    expect(isPrivateUrl('http://[::ffff:127.0.0.1]/')).toBe(true);
  });

  it('blocks IPv4-mapped IPv6 to link-local', () => {
    expect(isPrivateUrl('http://[::ffff:a9fe:a9fe]/')).toBe(true);
  });

  it('blocks invalid octets >255', () => {
    expect(isPrivateUrl('http://999.0.0.1/')).toBe(true);
  });

  it('blocks IPv6 link-local addresses', () => {
    expect(isPrivateUrl('http://[fe80::1]/')).toBe(true);
  });

  it('blocks hex-normalized IPv4-mapped IPv6 to private IP', () => {
    expect(isPrivateUrl('http://[::ffff:a00:1]/')).toBe(true);
  });

  it('allows hex-normalized IPv4-mapped IPv6 to public IP', () => {
    expect(isPrivateUrl('http://[::ffff:808:808]/')).toBe(false);
  });

  it('blocks IPv6 unspecified address ::', () => {
    expect(isPrivateUrl('http://[::]/')).toBe(true);
  });

  it('blocks decimal IP for 127.0.0.1', () => {
    expect(isPrivateUrl('http://2130706433/')).toBe(true);
  });

  it('blocks hex-normalized Alibaba Cloud metadata', () => {
    expect(isPrivateUrl('http://[::ffff:6464:64c8]/')).toBe(true);
  });
});