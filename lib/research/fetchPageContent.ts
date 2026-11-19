import { load } from 'cheerio';
import { logError, logMessage } from '@/lib/logging';

const DECIMAL_IP = /^\d+$/;
const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const IPV4_MAPPED_DOTTED = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/;
const IPV4_MAPPED_HEX = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/;
const WHITESPACE_RUNS = /\s+/g;
const NEWLINE_RUNS = /\n+/g;

const REMOVE_SELECTORS = [
  'script', 'style', 'nav', 'footer', 'header',
  'aside', '.sidebar', '.ad', '.advertisement',
  '.cookie-banner', '.popup', '.modal',
  '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
];

const MAX_CONTENT_LENGTH = 50_000;
const FETCH_TIMEOUT_MS = 5000;
const MAX_FETCH_SIZE = 200_000;

/* eslint-disable sonarjs/no-hardcoded-ip -- SSRF protection blocklist */
const BLOCKED_HOSTS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '169.254.169.254',
  'metadata.google.internal',
  '100.100.100.200',
];
/* eslint-enable sonarjs/no-hardcoded-ip */

function isPrivateIP(hostname: string): boolean {
  if (DECIMAL_IP.test(hostname)) {
    const num = Number.parseInt(hostname, 10);
    if (num < 0 || num > 4_294_967_295) return true;
    const a = (num >>> 24) & 0xff;
    const b = (num >>> 16) & 0xff;
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
  }

  const m = hostname.match(IPV4);
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
    const v4Mapped = IPV4_MAPPED_DOTTED.exec(inner);
    if (v4Mapped) return isPrivateIP(v4Mapped[1]!);
    const hexMapped = IPV4_MAPPED_HEX.exec(inner);
    if (hexMapped) {
      const high = Number.parseInt(hexMapped[1]!, 16);
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

export function isPrivateUrl(url: string): boolean {
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

export function extractTextFromHtml(html: string): string {
  if (!html || html.trim().length === 0) return '';

  const $ = load(html);

  for (const selector of REMOVE_SELECTORS) {
    $(selector).remove();
  }

  const article = $('article').first();
  let text: string;
  if (article.length > 0) {
    text = article.text();
  } else {
    const main = $('main').first();
    text = main.length > 0
      ? main.text()
      : $('body').text() || $.root().text();
  }

  text = text
    .replaceAll(WHITESPACE_RUNS, ' ')
    .replaceAll(NEWLINE_RUNS, ' ')
    .trim();

  if (text.length > MAX_CONTENT_LENGTH) {
    text = text.slice(0, MAX_CONTENT_LENGTH);
  }

  return text;
}

async function resolveAndCheckIp(hostname: string): Promise<boolean> {
  if (isPrivateIP(hostname)) return true;
  if (BLOCKED_HOSTS.some((h) => hostname === h || hostname.endsWith(`.${h}`))) return true;
  try {
    const { lookup } = await import('node:dns/promises');
    const addresses = await lookup(hostname, { all: true }).catch(() => []);
    for (const addr of addresses) {
      if (addr.family === 4 && isPrivateIP(addr.address)) return true;
      if (addr.family === 6 && isPrivateIP(`[${addr.address}]`)) return true;
    }
  } catch {
    return true;
  }
  return false;
}

export async function fetchPageContent(url: string): Promise<string> {
  if (!url || url.trim().length === 0) return '';
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    const blocked = await resolveAndCheckIp(parsed.hostname.toLowerCase());
    if (blocked) return '';
  } catch {
    return '';
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'TruckFull/1.0 (https://truckfull.food)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) return '';
    if (!response.headers.get('content-type')?.includes('text/html')) return '';

    const html = await response.text();
    if (html.length > MAX_FETCH_SIZE) return '';

    const text = extractTextFromHtml(html);
    logMessage(`fetchPageContent: Extracted ${text.length} chars from ${url}`);
    return text;
  } catch (error) {
    logError(`fetchPageContent: Failed to fetch ${url}:`, error);
    return '';
  }
}