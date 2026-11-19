const AI_REFERRERS = [
  'chatgpt.com',
  'chat.openai.com',
  'claude.ai',
  'perplexity.ai',
  'gemini.google.com',
  'copilot.microsoft.com',
  'you.com',
  'phind.com',
  'meta.ai',
];

function detectTrafficSource(): string {
  if (typeof document === 'undefined' || typeof navigator === 'undefined') return 'direct';
  const referrer = document.referrer.toLowerCase();
  if (!referrer) return 'direct';
  if (referrer.includes('google')) return 'google_organic';
  if (referrer.includes('facebook') || referrer.includes('fb.')) return 'facebook';
  if (referrer.includes('instagram') || referrer.includes('ig.')) return 'instagram';
  if (AI_REFERRERS.some((ai) => referrer.includes(ai))) return 'ai_referral';
  return 'other';
}

import { markPosthogReady, markPosthogFailed } from '@/lib/analytics/posthogReady';

const trafficSource = detectTrafficSource();

function initPostHog() {
  import('posthog-js')
    .then(({ default: posthog }) => {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY as string, {
        api_host: '/ingest',
        ui_host: 'https://us.posthog.com',
        defaults: '2025-05-24',
        autocapture: false,
        capture_pageview: 'history_change',
        capture_pageleave: false,
        disable_session_recording: true,
        advanced_disable_feature_flags: false,
        capture_exceptions: true,
        debug: false,
      });
      posthog.register({ traffic_source: trafficSource });
      markPosthogReady();

      const reportWebVital = (metric: {
        name: string;
        value: number;
        rating: string;
        id: string;
      }) => {
        if (process.env.NODE_ENV !== 'production') return;
        posthog.capture('web_vital', {
          metric_name: metric.name,
          metric_value: metric.value,
          metric_rating: metric.rating,
          metric_id: metric.id,
        });
      };

      import('web-vitals').then(({ onCLS, onINP, onLCP, onFCP, onTTFB }) => {
        onCLS(reportWebVital);
        onINP(reportWebVital);
        onLCP(reportWebVital);
        onFCP(reportWebVital);
        onTTFB(reportWebVital);
      });
    })
    .catch(() => {
      markPosthogFailed();
    });
}

if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  if (typeof requestAnimationFrame === 'undefined') {
    initPostHog();
  } else {
    requestAnimationFrame(() => initPostHog());
  }
}
