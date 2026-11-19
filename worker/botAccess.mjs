export const BOT_ACCESS_MESSAGE =
  'Automated access is restricted. For enterprise data access or crawl permission, contact support@truckfull.food with your organization, intended use, requested data, and expected request volume.';

const BLOCKED_USER_AGENT_PATTERNS = [
  'ClaudeBot',
  'SemrushBot',
  'SERankingBacklinksBot',
  'AhrefsBot',
  'HeadlessChrome',
  'GoogleOther',
  'ShapBot',
];

// Published ShapBot source addresses (docs.parallel.ai/resources/shapbot.json,
// retrieved 2026-10-01). All eight addresses observed hitting production during
// the 2026-09-29 spike were members of this set.
/* eslint-disable sonarjs/no-hardcoded-ip -- published crawler source ranges */
export const SHAPBOT_IP_ADDRESSES = new Set([
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
]);
/* eslint-enable sonarjs/no-hardcoded-ip */

export function isBlockedUserAgent(userAgent) {
  if (typeof userAgent !== 'string' || userAgent.length === 0) {
    return false;
  }
  const normalized = userAgent.toLowerCase();
  return BLOCKED_USER_AGENT_PATTERNS.some((pattern) =>
    normalized.includes(pattern.toLowerCase()),
  );
}

export function isBlockedCrawlerIp(clientIp) {
  if (typeof clientIp !== 'string' || clientIp.length === 0) {
    return false;
  }
  return SHAPBOT_IP_ADDRESSES.has(clientIp.trim());
}
