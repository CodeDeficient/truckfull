import { describe, it, expect } from '@jest/globals';
import { MAX_TITLE_LENGTH } from '@/lib/seo/seo-test-utils';

type MetadataLike = { title: string | { absolute: string } };

function titleLength(meta: MetadataLike): number {
  const t = meta.title;
  return typeof t === 'string' ? t.length : t.absolute.length;
}

import { metadata as eventResearchMeta } from '@/app/food-truck-event-research/page';
import { metadata as liveLocationMeta } from '@/app/food-truck-live-location/page';
import { metadata as trafficDataMeta } from '@/app/food-truck-traffic-data/page';
import { metadata as contactMeta } from '@/app/contact/page';
import { metadata as takedownMeta } from '@/app/takedown/page';
import { metadata as termsMeta } from '@/app/terms/page';
import { metadata as privacyMeta } from '@/app/privacy/page';

describe('page title length', () => {
  describe('static metadata pages', () => {
    it.each<[string, MetadataLike]>([
      ['/food-truck-event-research', eventResearchMeta as MetadataLike],
      ['/food-truck-live-location', liveLocationMeta as MetadataLike],
      ['/food-truck-traffic-data', trafficDataMeta as MetadataLike],
      ['/contact', contactMeta as MetadataLike],
      ['/takedown', takedownMeta as MetadataLike],
      ['/terms', termsMeta as MetadataLike],
      ['/privacy', privacyMeta as MetadataLike],
    ])('title of %s ≤ %i chars', (_, meta) => {
      expect(titleLength(meta)).toBeLessThanOrEqual(MAX_TITLE_LENGTH);
    });
  });

  describe('generateMetadata() pages', () => {
    it('/features', async () => {
      const mod = await import('@/app/features/page');
      const meta = await (
        mod as { generateMetadata: () => Promise<MetadataLike> }
      ).generateMetadata();
      expect(titleLength(meta)).toBeLessThanOrEqual(MAX_TITLE_LENGTH);
    });

    it('/for-owners', async () => {
      const mod = await import('@/app/for-owners/page');
      const meta = (
        mod as { generateMetadata: () => MetadataLike }
      ).generateMetadata();
      expect(titleLength(meta)).toBeLessThanOrEqual(MAX_TITLE_LENGTH);
    });
  });
});
