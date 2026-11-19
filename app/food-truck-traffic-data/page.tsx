import { Metadata } from 'next';
import Link from '@/components/navigation/IntentLink';
import { SeoPageShell } from '@/components/ui/organisms/SeoPageShell';
import {
  trafficIntelligenceFeature,
  fieldGuideFeature,
  eventLocationScoringFeature,
  hotspotDiscoveryFeature,
} from '@/lib/content/feature-descriptions';

const CANONICAL_URL = 'https://www.truckfull.food/food-truck-traffic-data';
const OG_IMAGE_URL = 'https://www.truckfull.food/api/og/default';

export const metadata: Metadata = {
  title: 'Food Truck Traffic Data & Location Intelligence | TruckFull',
  description:
    'Use food truck traffic data, heatmap guidance, and event location scoring to choose better vending spots across Georgia and South Carolina.',
  alternates: {
    canonical: CANONICAL_URL,
  },
  openGraph: {
    title: 'Food Truck Traffic Data & Location Intelligence | TruckFull',
    description:
      'See where the traffic is before you pick your spot. Historical monitoring data, interactive heatmap, and event location scoring for food truck owners in GA & SC.',
    url: CANONICAL_URL,
    siteName: 'TruckFull',
    type: 'website',
    images: [{ url: OG_IMAGE_URL, width: 1200, height: 630, alt: 'TruckFull food truck traffic data' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Food Truck Traffic Data & Location Intelligence | TruckFull',
    description:
      'See where the traffic is before you pick your spot. Historical monitoring data, heatmap field guide, and event scoring.',
    images: [OG_IMAGE_URL],
  },
};

export default function FoodTruckTrafficDataPage() {
  return (
    <SeoPageShell>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Traffic Data for Food Trucks
          </h1>
          <p className="text-muted-foreground">
            Stop guessing which intersection gets more traffic. Know where the people are
            before you pick your spot across Georgia and South Carolina.
          </p>
        </div>

        <div className="space-y-8 text-foreground/90">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Location Intelligence
            </h2>
            <p className="text-muted-foreground mb-4">
              {trafficIntelligenceFeature.long}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Field Guide</h2>
            <p className="text-muted-foreground mb-4">
              {fieldGuideFeature.long}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Event Location Scoring
            </h2>
            <p className="text-muted-foreground mb-4">
              {eventLocationScoringFeature.long}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Hotspot Discovery
            </h2>
            <p className="text-muted-foreground mb-4">
              {hotspotDiscoveryFeature.long}
            </p>
          </section>

          <section className="glass rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Explore Traffic Data
            </h2>
            <p className="text-muted-foreground mb-4">
              Traffic intelligence is available to claimed truck owners. Claim your truck
              to access location data, event scoring, and the traffic heatmap field guide.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/claim-your-truck"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
              >
                Claim Your Truck
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                See Pricing
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </Link>
            </div>
          </section>
        </div>

        <div className="h-12" />
      </div>
    </SeoPageShell>
  );
}
