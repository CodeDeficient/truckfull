import type { ParsedPost, SpamResult } from './types';

const WHITESPACE = /\s+/;
const EXCLAMATION_OR_QUESTION = /[!?]/g;

const EMOJI_PATTERN = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;
const SPAM_PHRASES = [
  'click here',
  'special offer',
  'limited time',
  'act now',
  "don't miss",
  'free',
  'bonus',
];
const SUSPICIOUS_URLS = ['bit.ly', 'tinyurl.com', 'goo.gl', 'short.link'];

export function detectSpam(post: ParsedPost): SpamResult {
  const reasons: string[] = [];
  let confidence = 0;

  if (!post || !post.content) {
    return { isSpam: false, confidence: 0, reasons: [] };
  }

  const content = post.content.trim();
  const words = content.split(WHITESPACE);

  if (content.length === 0) {
    return { isSpam: false, confidence: 0, reasons: [] };
  }

  const emojiMatches = content.match(EMOJI_PATTERN);
  const emojiCount = emojiMatches ? emojiMatches.length : 0;
  const emojiRatio = emojiCount / Math.max(words.length, 1);

  if (emojiRatio > 0.3 || emojiCount > 5) {
    reasons.push('Excessive emojis');
    confidence += 0.3;
  }

  const upperCaseCount = words.filter(
    (word) => word === word.toUpperCase() && word.length > 2,
  ).length;
  const upperCaseRatio = upperCaseCount / Math.max(words.length, 1);

  if (upperCaseRatio >= 0.7 && content.length > 20) {
    reasons.push('All caps text');
    confidence += 0.6;
  }

  const repeatedPhrases: Record<string, number> = {};
  for (let i = 0; i < words.length - 2; i++) {
    const phrase = words
      .slice(i, i + 3)
      .join(' ')
      .toLowerCase();
    repeatedPhrases[phrase] = (repeatedPhrases[phrase] || 0) + 1;
  }

  const hasRepeats = Object.values(repeatedPhrases).some((count) => count >= 2);
  if (hasRepeats) {
    reasons.push('Repeated phrases');
    confidence += 0.6;
  }

  const punctuationCount = (content.match(EXCLAMATION_OR_QUESTION) || []).length;
  if (punctuationCount >= 3) {
    reasons.push('Excessive punctuation');
    confidence += 0.55;
  }

  const lowerContent = content.toLowerCase();
  let spamPhraseCount = 0;
  for (const phrase of SPAM_PHRASES) {
    if (lowerContent.includes(phrase)) {
      spamPhraseCount++;
    }
  }

  if (spamPhraseCount >= 3) {
    reasons.push('Bot-like posting patterns');
    confidence += 0.2;
  }

  let hasSuspiciousUrl = false;
  for (const url of SUSPICIOUS_URLS) {
    if (lowerContent.includes(url)) {
      hasSuspiciousUrl = true;
      break;
    }
  }

  if (hasSuspiciousUrl) {
    reasons.push('Suspicious URLs');
    confidence += 0.6;
  }

  confidence = Math.min(confidence, 1);

  const isSpam = confidence > 0.5;

  return {
    isSpam,
    confidence,
    reasons,
  };
}
