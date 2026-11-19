import type { MetadataRoute } from 'next';
import { HONEYPOT_PATH_PREFIX } from '@/lib/security/honeypot';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: 'ClaudeBot', disallow: '/' },
      { userAgent: 'SemrushBot', disallow: '/' },
      { userAgent: 'SemrushBot-BA', disallow: '/' },
      { userAgent: 'SERankingBacklinksBot', disallow: '/' },
      { userAgent: 'Amazonbot', disallow: '/' },
      { userAgent: '*', disallow: '/manifest.json' },
      { userAgent: '*', allow: '/' },
      { userAgent: '*', allow: '/city/' },
      { userAgent: '*', allow: '/cuisine/' },
      { userAgent: '*', allow: '/best/' },
      { userAgent: '*', allow: '/events/' },
      { userAgent: '*', allow: '/blog/' },
      { userAgent: '*', disallow: '/api/' },
      { userAgent: '*', disallow: `${HONEYPOT_PATH_PREFIX}/` },
      { userAgent: '*', disallow: '/owner-dashboard/' },
      { userAgent: '*', disallow: '/admin/' },
      { userAgent: '*', disallow: '/@mobile/' },
      { userAgent: '*', disallow: '/auth/' },
      { userAgent: '*', disallow: '/debug/' },
      { userAgent: '*', disallow: '/debug-auth/' },
      { userAgent: '*', disallow: '/debug-session/' },
      { userAgent: '*', disallow: '/debug-trucks/' },
      { userAgent: '*', disallow: '/test-auth/' },
      { userAgent: '*', disallow: '/test-food-trucks/' },
      { userAgent: '*', disallow: '/test-session/' },
      { userAgent: '*', disallow: '/test-supabase/' },
      { userAgent: '*', disallow: '/test-token-refresh/' },
    ],
    sitemap: 'https://www.truckfull.food/sitemap.xml',
  };
}
