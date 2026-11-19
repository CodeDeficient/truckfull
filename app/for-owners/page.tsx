import { Metadata } from 'next';
import Link from '@/components/navigation/IntentLink';
import { SeoPageShell } from '@/components/ui/organisms/SeoPageShell';
import { OwnerCtaLink } from '@/components/analytics/OwnerCtaLink';
import {
  eventDiscoveryFeature,
  eventVettingFeature,
  quickCheckFeature,
  liveGpsFeature,
  trafficIntelligenceFeature,
  menuManagementFeature,
  claimYourTruckFeature,
} from '@/lib/content/feature-descriptions';

const CANONICAL_URL = 'https://www.truckfull.food/for-owners';
const OG_IMAGE_URL = 'https://www.truckfull.food/api/og/default';

export function generateMetadata(): Metadata {
  return {
    title: 'TruckFull for Food Truck Owners — Events, GPS & Traffic Data',
    description: `Find events worth vending at, broadcast your live location, and manage your food truck profile across Georgia and South Carolina.`,
    alternates: {
      canonical: CANONICAL_URL,
    },
    openGraph: {
      title: 'TruckFull for Food Truck Owners — Events, GPS & Traffic Data',
      description: `Find events worth vending at. Broadcast your live location. Scout high-traffic parking spots. Tools for food truck owners in GA & SC.`,
      url: CANONICAL_URL,
      siteName: 'TruckFull',
      type: 'website',
      images: [{ url: OG_IMAGE_URL, width: 1200, height: 630, alt: 'TruckFull for food truck owners' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'TruckFull for Food Truck Owners',
      description: `Find events worth vending at. Broadcast your live location. Scout high-traffic parking spots. Tools for food truck owners in GA & SC.`,
      images: [OG_IMAGE_URL],
    },
  };
}

export default function ForOwnersPage() {
  return (
    <SeoPageShell>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Find Events. Go Live. Get Discovered.
          </h1>
          <p className="text-muted-foreground">
            Stop scrolling Facebook groups and driving blind. TruckFull gives food truck owners the
            tools to find vending opportunities, broadcast their location, and make data-driven
            parking decisions across Georgia and South Carolina.
          </p>
        </div>

        <div className="space-y-8 text-foreground/90">
          <section className="glass rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Is this event worth your time?
            </h2>
            <p className="text-muted-foreground mb-4">{eventVettingFeature.long}</p>
            <Link href="/food-truck-event-research" className="text-primary hover:underline">
              See how vetting works →
            </Link>
          </section>

          <section className="glass rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              How do you find events worth vending at?
            </h2>
            <p className="text-muted-foreground mb-4">{eventDiscoveryFeature.long}</p>
            <Link href="/food-truck-event-research" className="text-primary hover:underline">
              Learn about event research →
            </Link>
          </section>

          <section className="glass rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Quick Check — 12 red flags before you pay
            </h2>
            <p className="text-muted-foreground mb-4">{quickCheckFeature.long}</p>
            <Link href="/food-truck-event-research" className="text-primary hover:underline">
              Learn about event vetting →
            </Link>
          </section>

          <section className="glass rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Let customers find you in real time
            </h2>
            <p className="text-muted-foreground mb-4">{liveGpsFeature.long}</p>
            <Link href="/food-truck-live-location" className="text-primary hover:underline">
              Learn about live location →
            </Link>
          </section>

          <section className="glass rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Where should you park today?
            </h2>
            <p className="text-muted-foreground mb-4">{trafficIntelligenceFeature.long}</p>
            <Link href="/food-truck-traffic-data" className="text-primary hover:underline">
              Explore traffic data →
            </Link>
          </section>

          <section className="glass rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Keep your profile current
            </h2>
            <p className="text-muted-foreground">{menuManagementFeature.long}</p>
          </section>

          <section className="glass rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Claim your listing</h2>
            <p className="text-muted-foreground mb-4">{claimYourTruckFeature.long}</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <OwnerCtaLink
                href="/claim-your-truck"
                ctaLocation="for_owners_claim"
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
              </OwnerCtaLink>
              <OwnerCtaLink
                href="/pricing"
                ctaLocation="for_owners_pricing"
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
              </OwnerCtaLink>
            </div>
          </section>
        </div>

        <div className="h-12" />
      </div>
    </SeoPageShell>
  );
}
