/**
 * Risk Evaluation Tests
 *
 * Phase 3.2.4: Test social media post risk evaluation
 * Verifies risk detection and filtering logic
 */

import { test, expect } from '@playwright/test';

// Mock risk evaluation function
const MockRiskEvaluator = {
  evaluateRisk: (
    content: string,
    metadata?: {
      author?: string;
      timestamp?: string;
      images?: number;
      video?: boolean;
      shares?: number;
      comments?: number;
    },
  ): number => {
    let riskScore = 0;
    const lowerContent = content.toLowerCase();

    // High-risk keywords and phrases
    const highRiskKeywords = [
      // Fraud indicators
      'scam',
      'fake',
      'fraud',
      'phishing',
      'illegal',
      'illegal activity',
      'banned',
      'prohibited',
      'discontinued',
      'suspended',
      'shut down',
      'under investigation',
      'federal',
      'police',
      'authorities',
      // Harmful content
      'hate speech',
      'discrimination',
      'racist',
      'sexist',
      'homophobic',
      'threat',
      'threaten',
      'violence',
      'violent',
      'attack',
      'harm',
      'suicide',
      'self-harm',
      'cutting',
      'weapons',
      'gun',
      'bomb',
      // Scams and deception
      'win money',
      'free money',
      'get rich',
      'cash prize',
      'lottery',
      'inheritance',
      'overpayment',
      'fake check',
      'money transfer',
      'western union',
      'gift card',
      'bitcoin',
      'crypto',
    ];

    // Medium-risk keywords
    const mediumRiskKeywords = [
      // Spam indicators
      'click here',
      'link below',
      'www.',
      'http://',
      'https://',
      'buy now',
      'limited time',
      'act fast',
      'hurry',
      'while supplies last',
      // Misinformation indicators
      'conspiracy',
      'secret',
      'hidden',
      'classified',
      'leaked',
      'breaking news',
      'urgent',
      'important',
      'warning',
      // Suspicious patterns
      'verified',
      'official',
      'guarantee',
      '100%',
      'best price',
      'too good to be true',
      "can't believe",
      'unbelievable',
    ];

    // Low-risk indicators
    const lowRiskKeywords = [
      'question',
      'update',
      'notification',
      'reminder',
      'status',
      'report',
      'feedback',
      'review',
    ];

    // Check for high-risk keywords
    const highRiskFound = highRiskKeywords.some((keyword) => lowerContent.includes(keyword));
    if (highRiskFound) {
      riskScore += 80;
    }

    // Check for medium-risk keywords
    const mediumRiskFound = mediumRiskKeywords.some((keyword) => lowerContent.includes(keyword));
    if (mediumRiskFound) {
      riskScore += 40;
    }

    // Check for low-risk keywords
    const lowRiskFound = lowRiskKeywords.some((keyword) => lowerContent.includes(keyword));
    if (lowRiskFound) {
      riskScore += 10;
    }

    // Check for suspicious patterns
    if (lowerContent.includes('!')) {
      const exclamationCount = lowerContent.split('!').length - 1;
      if (exclamationCount > 3) {
        riskScore += 20;
      }
    }

    // Check for ALL CAPS (more than 50% of text)
    const capsCount = (content.match(/[A-Z]/g) || []).length;
    if (capsCount > content.length / 2) {
      riskScore += 15;
    }

    // Check for multiple special characters
    const specialCharCount = (content.match(/[^a-zA-Z0-9\s]/g) || []).length;
    if (specialCharCount > 10) {
      riskScore += 10;
    }

    // Check for URLs
    if (lowerContent.includes('http://') || lowerContent.includes('https://')) {
      riskScore += 30;
    }

    // Metadata-based risk scoring
    if (metadata) {
      // High share count without engagement
      if (
        metadata.shares &&
        metadata.shares > 1000 &&
        (metadata.comments ?? 0) < metadata.shares * 0.01
      ) {
        riskScore += 25;
      }

      // Fresh account posting controversial content
      if (metadata.timestamp) {
        const postAge = Date.now() - new Date(metadata.timestamp).getTime();
        const daysOld = postAge / (1000 * 60 * 60 * 24);
        if (daysOld < 1 && riskScore > 30) {
          riskScore += 20; // Recent controversial content is riskier
        }
      }

      // Media content
      if ((metadata.images && metadata.images > 5) || metadata.video) {
        // Heavy media can be used to hide text
        riskScore += 10;
      }

      // Suspicious author
      if (metadata.author && /(\d{5,}|bot|test|admin)/i.test(metadata.author)) {
        riskScore += 15;
      }
    }

    // Risk categories
    if (riskScore >= 80) {
      return 100; // Critical risk
    } else if (riskScore >= 60) {
      return 80; // High risk
    } else if (riskScore >= 40) {
      return 60; // Medium risk
    } else if (riskScore >= 20) {
      return 40; // Low risk
    } else if (riskScore >= 10) {
      return 20; // Very low risk
    } else {
      return 0; // No risk
    }
  },

  classifyRisk: (riskScore: number): string => {
    if (riskScore >= 80) return 'critical';
    if (riskScore >= 60) return 'high';
    if (riskScore >= 40) return 'medium';
    if (riskScore >= 20) return 'low';
    if (riskScore >= 10) return 'minimal';
    return 'safe';
  },

  detectSpamPatterns: (
    content: string,
    metadata?: { author?: string; timestamp?: string; shares?: number },
  ): { isSpam: boolean; confidence: number; reasons: string[] } => {
    const lowerContent = content.toLowerCase();
    const reasons: string[] = [];
    let confidence = 0;

    // Check for repetitive content
    const words = content.split(/\s+/);
    const uniqueWords = new Set(words.map((w) => w.toLowerCase()));
    if (uniqueWords.size < words.length * 0.3) {
      reasons.push('Highly repetitive content');
      confidence += 30;
    }

    // Check for suspicious word repetition
    const wordCounts: Record<string, number> = {};
    words.forEach((word) => {
      const lower = word.toLowerCase();
      if (lower.length > 3) {
        // Only count meaningful words
        wordCounts[lower] = (wordCounts[lower] || 0) + 1;
      }
    });

    for (const [word, count] of Object.entries(wordCounts)) {
      if (count > 5) {
        reasons.push(`Word "${word}" repeated ${count} times`);
        confidence += 10;
        if (count > 10) confidence += 20;
      }
    }

    // Check for repetitive punctuation
    const repeatedPunctuation = content.match(/([!?.]){2,}/g);
    if (repeatedPunctuation && repeatedPunctuation.length > 0) {
      reasons.push('Excessive punctuation');
      confidence += 25;
    }

    // Check for excessive links
    const linkCount = (lowerContent.match(/http/g) || []).length;
    if (linkCount > 3) {
      reasons.push(`Too many links (${linkCount})`);
      confidence += 30;
    }

    // Check for suspicious timestamps
    if (metadata?.timestamp) {
      const date = new Date(metadata.timestamp);
      const hour = date.getHours();
      // Posts at unusual hours
      if (hour < 6 || hour > 22) {
        reasons.push('Posted at unusual hour');
        confidence += 15;
      }
    }

    // Check for high share rate without organic engagement
    if (metadata?.shares && metadata.shares > 5000) {
      reasons.push('Viral content without context');
      confidence += 20;
    }

    // Check for excessive use of emojis or special characters
    const emojiCount = (content.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
    if (emojiCount > 15) {
      reasons.push('Excessive emojis');
      confidence += 15;
    }

    // Check for suspicious author patterns
    if (metadata?.author) {
      const author = metadata.author.toLowerCase();
      if (author.includes('test') || author.includes('bot') || /^[a-z]{5,}$/.test(author)) {
        reasons.push('Suspicious username');
        confidence += 20;
      }
    }

    // Check for urgency tactics
    const urgencyPhrases = [
      'act now',
      'hurry',
      'limited time',
      "don't miss",
      'last chance',
      'urgent',
      'immediate',
      'asap',
      'today only',
      'expires soon',
    ];

    const urgencyCount = urgencyPhrases.filter((phrase) => lowerContent.includes(phrase)).length;
    if (urgencyCount > 0) {
      reasons.push(`Urgency tactics detected (${urgencyCount})`);
      confidence += urgencyCount * 10;
    }

    const isSpam = confidence >= 40;

    return {
      isSpam,
      confidence,
      reasons,
    };
  },

  detectMisinformation: (
    content: string,
    metadata?: { timestamp?: string; shares?: number; comments?: number },
  ): { isMisinformation: boolean; confidence: number; indicators: string[] } => {
    const lowerContent = content.toLowerCase();
    const indicators: string[] = [];
    let confidence = 0;

    // Check for conspiracy-related terms
    const conspiracyTerms = [
      'conspiracy',
      'secret',
      'hidden',
      'classified',
      'leaked',
      'cover up',
      'whistleblower',
      'expose',
      'truth',
      "they don't want you to know",
      'wake up',
      'sheeple',
    ];

    const conspiracyFound = conspiracyTerms.some((term) => lowerContent.includes(term));
    if (conspiracyFound) {
      indicators.push('Conspiracy theory terminology');
      confidence += 40;
    }

    // Check for unverified claims
    const unverifiedPatterns = [
      /reportedly/i,
      /allegedly/i,
      /supposedly/i,
      /sources say/i,
      /it is said/i,
      /rumor/i,
      /speculation/i,
    ];

    const unverifiedFound = unverifiedPatterns.some((pattern) => pattern.test(content));
    if (unverifiedFound) {
      indicators.push('Unverified claims detected');
      confidence += 30;
    }

    // Check for extreme language
    const extremePhrases = [
      'never happened',
      'always lies',
      'everyone knows',
      'common knowledge',
      'obviously',
      'clearly',
      'undeniable',
      'proven',
      'fact',
    ];

    const extremeCount = extremePhrases.filter((phrase) => lowerContent.includes(phrase)).length;
    if (extremeCount > 0) {
      indicators.push(`Extreme language (${extremeCount})`);
      confidence += extremeCount * 10;
    }

    // Check for time-sensitive misinformation
    if (metadata?.timestamp) {
      const postDate = new Date(metadata.timestamp);
      const now = new Date();
      const hoursSince = (now.getTime() - postDate.getTime()) / (1000 * 60 * 60);

      if (hoursSince < 24 && confidence > 20) {
        indicators.push('Recent controversial content');
        confidence += 15;
      }
    }

    // Check for engagement patterns suggesting manipulation
    if (metadata?.shares && metadata.comments) {
      const ratio = metadata.shares / metadata.comments;
      if (ratio > 100 && metadata.shares > 1000) {
        indicators.push('Unnatural engagement ratio');
        confidence += 25;
      }
    }

    // Check for common misinformation patterns
    const misinformationPatterns = [
      /(\d+)% of people/i,
      /doctors are shocked/i,
      /secret they don't want you to know/i,
      /gov(ernment)? is hiding/i,
      /do your own research/i,
      /the media is lying/i,
    ];

    const patternFound = misinformationPatterns.some((pattern) => pattern.test(lowerContent));
    if (patternFound) {
      indicators.push('Known misinformation pattern');
      confidence += 35;
    }

    const isMisinformation = confidence >= 50;

    return {
      isMisinformation,
      confidence,
      indicators,
    };
  },

  detectHarmfulContent: (
    content: string,
  ): { isHarmful: boolean; confidence: number; categories: string[] } => {
    const lowerContent = content.toLowerCase();
    const categories: string[] = [];
    let confidence = 0;

    // Hate speech indicators
    const hateSpeechTerms = [
      // Racist terms
      'racist',
      'racial',
      'supremacist',
      'segregation',
      'apartheid',
      'white power',
      "black lives don't matter",
      'ethnic cleansing',
      // Sexist terms
      'sexist',
      'misogynist',
      'sexism',
      'patriarchy',
      // Homophobic terms
      'homophobic',
      'anti-gay',
      'anti-lgbt',
      'gay agenda',
      // Xenophobic terms
      'xenophobic',
      'anti-immigrant',
      'anti-muslim',
      'anti-semitic',
      // Other hate
      'hate group',
      'klu klux klan',
      'neo-nazi',
    ];

    const hateFound = hateSpeechTerms.some((term) => lowerContent.includes(term));
    if (hateFound) {
      categories.push('Hate speech');
      confidence += 80;
    }

    // Threat indicators
    const threatPatterns = [
      /I will (kill|hurt|attack|harm|shoot|stab)/i,
      /going to (kill|hurt|attack|harm|shoot|stab)/i,
      /should (die|be killed|be hurt|be attacked)/i,
      /wishes (death|harm|injury) on/i,
    ];

    const threatFound = threatPatterns.some((pattern) => pattern.test(content));
    if (threatFound) {
      categories.push('Threat of violence');
      confidence += 70;
    }

    // Self-harm indicators
    const selfHarmTerms = [
      'suicide',
      'kill myself',
      'end it all',
      'no point living',
      'cutting',
      'self harm',
      'self-harm',
      'self harm',
      'depression',
      'hopeless',
      'worthless',
    ];

    const selfHarmFound = selfHarmTerms.some((term) => lowerContent.includes(term));
    if (selfHarmFound) {
      categories.push('Self-harm indicators');
      confidence += 60;
    }

    // Harmful advice
    const harmfulAdvicePatterns = [
      /don't (take|go|see|get) (medication|doctor|help|care)/i,
      /(use|try) (bleach|poison|dangerous)/i,
      /dangerous (advice|idea|experiment)/i,
    ];

    const harmfulAdviceFound = harmfulAdvicePatterns.some((pattern) => pattern.test(lowerContent));
    if (harmfulAdviceFound) {
      categories.push('Harmful advice');
      confidence += 50;
    }

    // Check for extreme violence
    const violenceTerms = [
      'blood',
      'gore',
      'violence',
      'violent',
      'brutal',
      'torture',
      'suffer',
      'pain',
      'agony',
      'tortured',
    ];

    const violenceCount = violenceTerms.filter((term) => lowerContent.includes(term)).length;
    if (violenceCount > 1) {
      categories.push('Graphic violence');
      confidence += Math.min(violenceCount * 10, 50);
    }

    const isHarmful = confidence >= 60;

    return {
      isHarmful,
      confidence,
      categories,
    };
  },

  calculateOverallRisk: (
    content: string,
    metadata?: any,
  ): { score: number; category: string; issues: string[] } => {
    const issues: string[] = [];

    // Evaluate all aspects
    const riskScore = MockRiskEvaluator.evaluateRisk(content, metadata);
    const riskCategory = MockRiskEvaluator.classifyRisk(riskScore);

    const spamCheck = MockRiskEvaluator.detectSpamPatterns(content, metadata);
    if (spamCheck.isSpam) {
      issues.push(...spamCheck.reasons);
    }

    const misinformationCheck = MockRiskEvaluator.detectMisinformation(content, metadata);
    if (misinformationCheck.isMisinformation) {
      issues.push(...misinformationCheck.indicators);
    }

    const harmfulCheck = MockRiskEvaluator.detectHarmfulContent(content);
    if (harmfulCheck.isHarmful) {
      issues.push(...harmfulCheck.categories);
    }

    // Adjust final score based on additional issues
    let adjustedScore = riskScore;
    if (spamCheck.isSpam && spamCheck.confidence > 50) {
      adjustedScore = Math.min(100, adjustedScore + 10);
    }
    if (misinformationCheck.isMisinformation && misinformationCheck.confidence > 60) {
      adjustedScore = Math.min(100, adjustedScore + 15);
    }
    if (harmfulCheck.isHarmful && harmfulCheck.confidence > 70) {
      adjustedScore = Math.min(100, adjustedScore + 20);
    }

    const adjustedCategory = MockRiskEvaluator.classifyRisk(adjustedScore);

    return {
      score: adjustedScore,
      category: adjustedCategory,
      issues: [...new Set(issues)], // Remove duplicates
    };
  },
};

test.describe('Risk Evaluation Service', () => {
  test.describe('High-Risk Content Detection', () => {
    test('detects fraud and scam content', () => {
      const testCases = [
        { content: "This is a scam, don't trust it!" },
        { content: 'Fake products being sold' },
        { content: 'Illegal activity detected' },
        { content: 'Fraudulent claims about the business' },
      ];

      testCases.forEach(({ content }) => {
        const risk = MockRiskEvaluator.evaluateRisk(content);
        expect(risk).toBeGreaterThanOrEqual(80);
      });
    });

    test('detects harmful and dangerous content', () => {
      const testCases = [
        { content: 'I want to hurt someone' },
        { content: 'Weapons are available here' },
        { content: 'Hate speech against minority groups' },
        { content: 'You should harm yourself' },
      ];

      testCases.forEach(({ content }) => {
        const risk = MockRiskEvaluator.evaluateRisk(content);
        expect(risk).toBeGreaterThanOrEqual(80);
      });
    });

    test('detects financial scams', () => {
      const testCases = [
        { content: 'Send money via Western Union to claim your prize!' },
        { content: 'Bitcoin investment opportunity - guaranteed returns!' },
        { content: 'Click here to receive your cash prize!' },
        { content: 'Buy gift cards and send the codes' },
      ];

      testCases.forEach(({ content }) => {
        const risk = MockRiskEvaluator.evaluateRisk(content);
        expect(risk).toBeGreaterThanOrEqual(80);
      });
    });
  });

  test.describe('Medium-Risk Content Detection', () => {
    test('detects spam-like patterns', () => {
      const testCases = [
        { content: 'Click here! Buy now! Limited time offer!' },
        { content: "!!! ACT FAST !!! DON'T MISS OUT !!!" },
        { content: 'Best price guaranteed! 100% satisfaction!' },
        { content: 'Buy now! Limited stock! Discount ending soon!' },
      ];

      testCases.forEach(({ content }) => {
        const risk = MockRiskEvaluator.evaluateRisk(content);
        expect(risk).toBeGreaterThanOrEqual(40);
        expect(risk).toBeLessThan(80);
      });
    });

    test('detects misinformation indicators', () => {
      const testCases = [
        { content: 'Sources say that the government is hiding the truth' },
        { content: 'Conspiracy theory about secret operations' },
        { content: 'Unverified claims about the business' },
        { content: 'Allegedly, there are problems with the service' },
      ];

      testCases.forEach(({ content }) => {
        const risk = MockRiskEvaluator.evaluateRisk(content);
        expect(risk).toBeGreaterThanOrEqual(40);
        expect(risk).toBeLessThan(80);
      });
    });

    test('detects excessive urgency tactics', () => {
      const testCases = [
        { content: "Hurry! Act now! Don't miss out! Limited time!" },
        { content: 'Urgent! Important! Immediately!' },
        { content: 'Today only! Expires soon! Asap!' },
      ];

      testCases.forEach(({ content }) => {
        const risk = MockRiskEvaluator.evaluateRisk(content);
        expect(risk).toBeGreaterThanOrEqual(40);
        expect(risk).toBeLessThan(80);
      });
    });
  });

  test.describe('Low-Risk Content Detection', () => {
    test('identifies safe promotional content', () => {
      const testCases = [
        { content: 'Join us for lunch today!' },
        { content: 'Our new menu is available' },
        { content: "We're open today at 11 AM" },
      ];

      testCases.forEach(({ content }) => {
        const risk = MockRiskEvaluator.evaluateRisk(content);
        expect(risk).toBeLessThan(40);
      });
    });

    test('identifies customer feedback', () => {
      const testCases = [
        { content: 'Great service, loved the food!' },
        { content: '5 stars, highly recommend' },
        { content: 'Best tacos in town!' },
      ];

      testCases.forEach(({ content }) => {
        const risk = MockRiskEvaluator.evaluateRisk(content);
        expect(risk).toBeLessThan(20);
      });
    });

    test('identifies routine updates', () => {
      const testCases = [
        { content: "Reminder: We're closed on Mondays" },
        { content: 'Status update: Menu updated' },
        { content: 'Notification: New location opening soon' },
      ];

      testCases.forEach(({ content }) => {
        const risk = MockRiskEvaluator.evaluateRisk(content);
        expect(risk).toBeLessThan(20);
      });
    });
  });

  test.describe('Risk Classification', () => {
    test('classifies risk scores correctly', () => {
      const classifications = [
        { score: 0, expected: 'safe' },
        { score: 15, expected: 'minimal' },
        { score: 25, expected: 'low' },
        { score: 45, expected: 'medium' },
        { score: 65, expected: 'high' },
        { score: 85, expected: 'critical' },
      ];

      classifications.forEach(({ score, expected }) => {
        const classification = MockRiskEvaluator.classifyRisk(score);
        expect(classification).toBe(expected);
      });
    });
  });

  test.describe('Spam Detection', () => {
    test('detects repetitive content', () => {
      const content = 'Click here click here click here click here';
      const result = MockRiskEvaluator.detectSpamPatterns(content);

      expect(result.isSpam).toBe(true);
      expect(result.confidence).toBeGreaterThan(30);
      expect(result.reasons).toContain('Highly repetitive content');
    });

    test('detects excessive punctuation', () => {
      const content = "Buy now!!! Don't miss out!!! Limited time!!!";
      const result = MockRiskEvaluator.detectSpamPatterns(content);

      expect(result.isSpam).toBe(true);
      expect(result.confidence).toBeGreaterThan(20);
      expect(result.reasons).toContain('Excessive punctuation');
    });

    test('detects too many links', () => {
      const content =
        'http://example.com http://example2.com http://example3.com http://example4.com';
      const result = MockRiskEvaluator.detectSpamPatterns(content);

      expect(result.isSpam).toBe(true);
      expect(result.confidence).toBeGreaterThan(20);
      expect(result.reasons.some((r) => r.includes('Too many links'))).toBe(true);
    });

    test('detects urgency tactics', () => {
      const content = "Act now! Hurry! Limited time! Don't miss out!";
      const result = MockRiskEvaluator.detectSpamPatterns(content);

      expect(result.isSpam).toBe(true);
      expect(result.confidence).toBeGreaterThan(30);
      expect(result.reasons.some((r) => r.includes('Urgency tactics'))).toBe(true);
    });

    test('detects suspicious usernames', () => {
      const content = 'Click here!';
      const metadata = { author: 'testuser123' };
      const result = MockRiskEvaluator.detectSpamPatterns(content, metadata);

      expect(result.isSpam).toBe(true);
      expect(result.reasons).toContain('Suspicious username');
    });

    test('identifies non-spam content', () => {
      const content = 'We are open today at 11 AM for lunch service.';
      const result = MockRiskEvaluator.detectSpamPatterns(content);

      expect(result.isSpam).toBe(false);
      expect(result.confidence).toBeLessThan(40);
    });
  });

  test.describe('Misinformation Detection', () => {
    test('detects conspiracy theory content', () => {
      const testCases = [
        { content: 'The government is hiding the truth about this business!' },
        { content: 'Secret operations are happening behind the scenes!' },
        { content: "Wake up people, they don't want you to know!" },
      ];

      testCases.forEach(({ content }) => {
        const result = MockRiskEvaluator.detectMisinformation(content);
        expect(result.isMisinformation).toBe(true);
        expect(result.indicators).toContain('Conspiracy theory terminology');
      });
    });

    test('detects unverified claims', () => {
      const testCases = [
        { content: 'Sources say there are problems with the service' },
        { content: 'Allegedly, the food is not fresh' },
        { content: 'Reportedly, there are health violations' },
      ];

      testCases.forEach(({ content }) => {
        const result = MockRiskEvaluator.detectMisinformation(content);
        expect(result.isMisinformation).toBe(true);
        expect(result.indicators).toContain('Unverified claims detected');
      });
    });

    test('detects extreme language', () => {
      const content = 'Everyone knows this is the best! Obviously undeniably proven fact!';
      const result = MockRiskEvaluator.detectMisinformation(content);

      expect(result.isMisinformation).toBe(true);
      expect(result.indicators.some((i) => i.includes('Extreme language'))).toBe(true);
    });

    test('identifies non-misinformation', () => {
      const content = 'Our food is freshly prepared every day';
      const result = MockRiskEvaluator.detectMisinformation(content);

      expect(result.isMisinformation).toBe(false);
      expect(result.confidence).toBeLessThan(50);
    });
  });

  test.describe('Harmful Content Detection', () => {
    test('detects hate speech', () => {
      const testCases = [
        { content: 'This business is only for [racial slur] people' },
        { content: "We don't serve [homophobic slur] here" },
        { content: '[Xenophobic slur] should not be allowed' },
      ];

      testCases.forEach(({ content }) => {
        const result = MockRiskEvaluator.detectHarmfulContent(content);
        expect(result.isHarmful).toBe(true);
        expect(result.categories).toContain('Hate speech');
      });
    });

    test('detects threats', () => {
      const testCases = [
        { content: 'I will hurt someone at this business' },
        { content: 'You should be attacked for this' },
        { content: 'I wish harm on the owners' },
      ];

      testCases.forEach(({ content }) => {
        const result = MockRiskEvaluator.detectHarmfulContent(content);
        expect(result.isHarmful).toBe(true);
        expect(result.categories).toContain('Threat of violence');
      });
    });

    test('detects self-harm indicators', () => {
      const testCases = [
        { content: 'I want to kill myself' },
        { content: 'Life is not worth living' },
        { content: 'I am hurting myself' },
      ];

      testCases.forEach(({ content }) => {
        const result = MockRiskEvaluator.detectHarmfulContent(content);
        expect(result.isHarmful).toBe(true);
        expect(result.categories).toContain('Self-harm indicators');
      });
    });

    test('detects harmful advice', () => {
      const testCases = [
        { content: "Don't take medication for this" },
        { content: 'Try bleach as a cure' },
        { content: "Dangerous idea: Don't go to the doctor" },
      ];

      testCases.forEach(({ content }) => {
        const result = MockRiskEvaluator.detectHarmfulContent(content);
        expect(result.isHarmful).toBe(true);
        expect(result.categories).toContain('Harmful advice');
      });
    });

    test('identifies safe content', () => {
      const content = 'We serve delicious food with fresh ingredients';
      const result = MockRiskEvaluator.detectHarmfulContent(content);

      expect(result.isHarmful).toBe(false);
      expect(result.confidence).toBeLessThan(60);
    });
  });

  test.describe('Overall Risk Calculation', () => {
    test('calculates overall risk with multiple factors', () => {
      const content = "SCAM!!! Don't trust this!!! Click here now!!! Sources say it's fraud!!!";
      const result = MockRiskEvaluator.calculateOverallRisk(content);

      expect(result.score).toBeGreaterThanOrEqual(60);
      expect(['high', 'critical']).toContain(result.category);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    test('identifies completely safe content', () => {
      const content = 'We are open today for lunch, serving fresh food.';
      const result = MockRiskEvaluator.calculateOverallRisk(content);

      expect(result.score).toBeLessThan(20);
      expect(result.category).toBe('safe');
    });

    test('adjusts score based on metadata', () => {
      const content = 'Suspicious claims about the business';
      const metadata = {
        shares: 10000,
        comments: 50,
        timestamp: new Date().toISOString(),
      };
      const result = MockRiskEvaluator.calculateOverallRisk(content, metadata);

      // Should be higher due to viral suspicious content
      expect(result.score).toBeGreaterThan(40);
    });

    test('removes duplicate issues', () => {
      const content = 'SCAM! FRAUD! ILLEGAL! SCAM!';
      const result = MockRiskEvaluator.calculateOverallRisk(content);

      const uniqueIssues = [...new Set(result.issues)];
      expect(result.issues.length).toBe(uniqueIssues.length);
    });
  });

  test.describe('Edge Cases', () => {
    test('handles empty content', () => {
      const result = MockRiskEvaluator.evaluateRisk('');
      expect(result).toBe(0);
    });

    test('handles very long content', () => {
      const longContent = 'Suspicious content. '.repeat(100);
      const result = MockRiskEvaluator.evaluateRisk(longContent);

      expect(result).toBeGreaterThan(0);
    });

    test('handles mixed case and special characters', () => {
      const content = 'SCAM!!! @#$%^&*() Fraudulent!!!';
      const result = MockRiskEvaluator.evaluateRisk(content);

      expect(result).toBeGreaterThan(50);
    });

    test('handles null metadata gracefully', () => {
      const content = 'Normal promotional content';
      const result = MockRiskEvaluator.evaluateRisk(content);

      expect(result).toBeLessThan(40);
    });

    test('identifies suspicious URLs in content', () => {
      const content = 'Check out http://suspicious-site.com for more info';
      const result = MockRiskEvaluator.evaluateRisk(content);

      expect(result).toBeGreaterThan(30);
    });

    test('handles Unicode characters', () => {
      const content = "This is a legit 🔥 deal! 🎉 Don't miss it! 🚨";
      const result = MockRiskEvaluator.evaluateRisk(content);

      expect(result).toBeLessThan(80);
    });
  });

  test.describe('Integration Scenarios', () => {
    test('evaluates real-world social media post', () => {
      const content =
        'Join us for our anniversary party this Saturday! Live music and special offers!';
      const metadata = {
        author: 'HappyTacos',
        timestamp: new Date().toISOString(),
        shares: 50,
        comments: 25,
        images: 2,
      };

      const result = MockRiskEvaluator.calculateOverallRisk(content, metadata);

      expect(result.score).toBeLessThan(30);
      expect(result.category).toBe('low');
    });

    test('evaluates suspicious promotional post', () => {
      const content = "!!! FREE MONEY !!! CLICK HERE NOW !!! LIMITED TIME !!! DON'T MISS OUT !!!";
      const metadata = {
        author: 'user123',
        timestamp: new Date().toISOString(),
        shares: 1000,
        comments: 10,
        images: 0,
      };

      const result = MockRiskEvaluator.calculateOverallRisk(content, metadata);

      expect(result.score).toBeGreaterThan(50);
      expect(result.category).toBe('high');
    });

    test('evaluates harmful content with urgency', () => {
      const content = "HURRY!!! This business is a SCAM!!! DON'T GO THERE!!!";
      const metadata = {
        author: 'testuser',
        timestamp: new Date().toISOString(),
        shares: 500,
        comments: 5,
      };

      const result = MockRiskEvaluator.calculateOverallRisk(content, metadata);

      expect(result.score).toBeGreaterThan(60);
      expect(result.category).toBe('high');
    });
  });
});
