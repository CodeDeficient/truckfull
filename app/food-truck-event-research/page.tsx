import { Metadata } from 'next';
import Link from '@/components/navigation/IntentLink';
import { SeoPageShell } from '@/components/ui/organisms/SeoPageShell';
import {
  eventDiscoveryFeature,
  eventVettingFeature,
  posterInvestigationFeature,
  contactVerificationFeature,
  sourceTrustFeature,
  quickCheckFeature,
  compatibilityFeature,
  eventPipelineFeature,
} from '@/lib/content/feature-descriptions';

const CANONICAL_URL = 'https://www.truckfull.food/food-truck-event-research';
const OG_IMAGE_URL = 'https://www.truckfull.food/api/og/default';

export const metadata: Metadata = {
  title: 'Food Truck Event Research — AI Event Discovery & Vetting | TruckFull',
  description:
    'Find vending events across Georgia and South Carolina with AI-powered discovery, poster investigation, contact verification, and fraud prevention. Built for food truck owners.',
  alternates: {
    canonical: CANONICAL_URL,
  },
  openGraph: {
    title: 'Food Truck Event Research — Find & Vend Events | TruckFull',
    description:
      'Paste a flyer, get the full breakdown. AI event discovery, contact verification, and fraud prevention for food truck owners in GA & SC.',
    url: CANONICAL_URL,
    siteName: 'TruckFull',
    type: 'website',
    images: [{ url: OG_IMAGE_URL, width: 1200, height: 630, alt: 'TruckFull event research for food truck owners' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Food Truck Event Research — Find & Vend Events | TruckFull',
    description:
      'Paste a flyer, get the full breakdown. AI event discovery, contact verification, and fraud prevention for food truck owners.',
    images: [OG_IMAGE_URL],
  },
};

export default function FoodTruckEventResearchPage() {
  return (
    <SeoPageShell>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Food Truck Event Research &amp; Discovery
          </h1>
          <p className="text-muted-foreground">
            Instead of hunting events across 20 websites every week, TruckFull
            automatically finds, vets, and scores vending events across the Southeast so
            you can focus on cooking — not searching.
          </p>
        </div>

        <div className="space-y-8 text-foreground/90">
          <section className="glass rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Is this event worth your time?
            </h2>
            <p className="text-muted-foreground mb-4">
              {eventVettingFeature.long}
            </p>
            <p className="text-muted-foreground">
              You spend less time researching and more time generating revenue.
            </p>
          </section>

          <section className="glass rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Quick Check — 12 red flags before you pay
            </h2>
            <p className="text-muted-foreground mb-4">
              {quickCheckFeature.long}
            </p>
          </section>

          <section className="glass rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Automated Discovery — Events find you
            </h2>
            <p className="text-muted-foreground mb-4">
              {eventDiscoveryFeature.long}
            </p>
          </section>

          <section className="glass rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Poster Investigation — Paste a flyer, get the full breakdown
            </h2>
            <p className="text-muted-foreground">
              {posterInvestigationFeature.long}
            </p>
          </section>

          <section className="glass rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Contact Verification — Catch the red flags
            </h2>
            <p className="text-muted-foreground">
              {contactVerificationFeature.long}
            </p>
          </section>

          <section className="glass rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Source Trust — Know where the info comes from
            </h2>
            <p className="text-muted-foreground">
              {sourceTrustFeature.long}
            </p>
          </section>

          <section className="glass rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Compatibility Matching — Is this event right for your truck?
            </h2>
            <p className="text-muted-foreground">
              {compatibilityFeature.long}
            </p>
          </section>

          <section className="glass rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Save and Track — Build your event pipeline
            </h2>
            <p className="text-muted-foreground">
              {eventPipelineFeature.long}
            </p>
          </section>

          <section className="glass rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-3">
              Start Researching Events
            </h2>
            <p className="text-muted-foreground mb-4">
              Start finding vending events that match your truck and territory.
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
