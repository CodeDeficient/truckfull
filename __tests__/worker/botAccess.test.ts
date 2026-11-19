import { describe, it, expect } from '@jest/globals';
import {
  BOT_ACCESS_MESSAGE,
  SHAPBOT_IP_ADDRESSES,
  isBlockedCrawlerIp,
  isBlockedUserAgent,
} from '../../worker/botAccess.mjs';

// Mirrors docs.parallel.ai/resources/shapbot.json (retrieved 2026-10-01).
const PUBLISHED_SHAPBOT_IPS = [
  '23.251.146.115',
  '34.9.172.22',
  '34.31.203.120',
  '34.44.142.114',
  '34.44.196.215',
  '34.45.55.180',
  '34.46.138.166',
  '34.68.39.29',
  '34.70.129.79',
  '34.122.173.216',
];

describe('isBlockedUserAgent', () => {
  it('blocks ShapBot, whose spike preceded the September 2026 outage', () => {
    expect(
      isBlockedUserAgent(
        'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ShapBot/0.1.0',
      ),
    ).toBe(true);
  });

  it('blocks the crawler patterns already denied at the edge', () => {
    for (const userAgent of [
      'Mozilla/5.0 (compatible; ClaudeBot/1.0)',
      'Mozilla/5.0 (compatible; SemrushBot/7~bl)',
      'SERankingBacklinksBot/1.0',
      'Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)',
      'Mozilla/5.0 HeadlessChrome/120.0.0.0',
      'Mozilla/5.0 (compatible; GoogleOther)',
    ]) {
      expect(isBlockedUserAgent(userAgent)).toBe(true);
    }
  });

  it('matches case-insensitively', () => {
    expect(isBlockedUserAgent('shapbot')).toBe(true);
    expect(isBlockedUserAgent('SHAPBOT/0.1.0')).toBe(true);
  });

  it('allows real browsers and search engines that may index the site', () => {
    for (const userAgent of [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'DuckDuckBot/1.0; (+http://duckduckgo.com/duckduckbot.html)',
    ]) {
      expect(isBlockedUserAgent(userAgent)).toBe(false);
    }
  });

  it('allows requests without a user agent rather than failing closed on empty input', () => {
    expect(isBlockedUserAgent(undefined)).toBe(false);
    expect(isBlockedUserAgent(null)).toBe(false);
    expect(isBlockedUserAgent('')).toBe(false);
  });

  it('blocks any user agent containing a blocked name, matching the edge rule semantics', () => {
    // Substring matching is intentional and mirrors the WAF expression
    // (http.user_agent contains "..."), so a renamed variant is still caught.
    expect(isBlockedUserAgent('Mozilla/5.0 ShapBotAppreciator/1.0')).toBe(true);
    expect(isBlockedUserAgent('Mozilla/5.0 (compatible; NotGoogleOtherish)')).toBe(true);
    expect(isBlockedUserAgent('Mozilla/5.0 MyAhrefsBotRival/1.0')).toBe(true);
  });
});

describe('BOT_ACCESS_MESSAGE', () => {
  it('tells blocked automated clients how to request access', () => {
    expect(BOT_ACCESS_MESSAGE).toContain('support@truckfull.food');
    expect(BOT_ACCESS_MESSAGE).toContain('enterprise data access or crawl permission');
  });
});

describe('isBlockedCrawlerIp', () => {
  it('blocks the addresses observed during the ShapBot spike', () => {
    for (const address of [
      '23.251.146.115',
      '34.31.203.120',
      '34.44.142.114',
      '34.44.196.215',
      '34.45.55.180',
      '34.46.138.166',
      '34.68.39.29',
      '34.122.173.216',
    ]) {
      expect(isBlockedCrawlerIp(address)).toBe(true);
    }
  });

  it('allows addresses outside the published crawler ranges', () => {
    expect(isBlockedCrawlerIp('8.8.8.8')).toBe(false);
    expect(isBlockedCrawlerIp('34.44.142.115')).toBe(false);
    expect(isBlockedCrawlerIp('1.1.1.1')).toBe(false);
  });

  it('does not fail closed on a missing or malformed address', () => {
    expect(isBlockedCrawlerIp(undefined)).toBe(false);
    expect(isBlockedCrawlerIp(null)).toBe(false);
    expect(isBlockedCrawlerIp('')).toBe(false);
    expect(isBlockedCrawlerIp('not-an-ip')).toBe(false);
  });

  it('keeps every published address in the set, so the list cannot silently shrink', () => {
    for (const address of PUBLISHED_SHAPBOT_IPS) {
      expect(SHAPBOT_IP_ADDRESSES.has(address)).toBe(true);
    }
    expect(SHAPBOT_IP_ADDRESSES.size).toBe(PUBLISHED_SHAPBOT_IPS.length);
  });
});
