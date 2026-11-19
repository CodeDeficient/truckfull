import { Metadata } from 'next';
import Image from 'next/image';
import Link from '@/components/navigation/IntentLink';
import { connection } from 'next/server';
import { SeoPageShell } from '@/components/ui/organisms/SeoPageShell';
import { getTruckMetrics, getEventSourceMetrics } from '@/lib/content/metrics';
import {
  eventDiscoveryFeature,
  liveGpsFeature,
  trafficIntelligenceFeature,
  menuManagementFeature,
  claimYourTruckFeature,
} from '@/lib/content/feature-descriptions';

export async function generateMetadata(): Promise<Metadata> {
  let displayTotal = '255+';
  try {
    const metrics = await getTruckMetrics();
    displayTotal = metrics.displayTotal;
  } catch {
    // fallback
  }

  return {
    title: 'About TruckFull: Food Truck Discovery & Owner Tools',
    description: `TruckFull helps people find ${displayTotal} food trucks across Georgia and South Carolina, with owner tools for events, live GPS, traffic data, and menus.`,
  };
}

export default async function AboutPage() {
  if (process.env.NEXT_OUTPUT_STANDALONE === 'true') await connection();

  let metrics = {
    totalTrucks: 255,
    displayTotal: '255+',
    csraTrucks: 80,
    displayCsra: '80+',
    claimedTrucks: 15,
  };
  let sourceMetrics = { sourceCount: 30, displaySourceCount: '30+' };
  try {
    metrics = await getTruckMetrics();
    sourceMetrics = await getEventSourceMetrics();
  } catch {
    // fallback to defaults above
  }

  return (
    <SeoPageShell>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">About TruckFull</h1>
          <p className="text-muted-foreground">
            Helping food truck owners find events, go live, and make data-driven decisions about
            where to park.
          </p>
        </div>

        <div className="space-y-8 text-foreground/90">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">What is TruckFull?</h2>
            <p className="text-muted-foreground mb-4">
              TruckFull is a food truck platform built for Georgia and South Carolina. We track{' '}
              {metrics.displayTotal} food trucks across the region, from Augusta and the CSRA to
              Charleston and the Lowcountry, with live locations, menus, and operating hours all in
              one place.
            </p>
            <p className="text-muted-foreground mb-4">
              For customers, TruckFull shows what&apos;s nearby on a live map. For food truck
              owners, TruckFull provides tools to find events worth vending at, broadcast your live
              location to customers, manage your menu and schedule, and analyze traffic data to pick
              profitable locations.
            </p>
            <p className="text-muted-foreground">
              We are actively expanding our event coverage across the Southeast, pulling from{' '}
              {sourceMetrics.displaySourceCount} government, tourism, and event sources to help
              owners find opportunities they would otherwise miss.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">From the Founder</h2>
            <div className="glass rounded-lg p-4 md:p-6 space-y-4 text-muted-foreground">
              <p>I&apos;m Daniel, the founder and solo developer behind TruckFull.</p>
              <p>
                Before building TruckFull, I ran a small business called Sticker Drip, selling at
                markets and local events. I learned firsthand how difficult it could be to find good
                opportunities. Some events looked promising but barely brought in enough customers
                to cover the costs. A few bad choices could set my business back for an entire
                month.
              </p>
              <p>
                I also noticed how much of a difference the right event could make for food trucks,
                and how surprisingly difficult it was to find those trucks when you actually wanted
                to visit one. Information was scattered across websites, flyers, and social media,
                and it wasn&apos;t always accurate or up to date.
              </p>
              <p>
                That&apos;s where TruckFull started. I wanted to make it easier for vendors to find
                and research opportunities, avoid costly mistakes, and help customers find the
                trucks they&apos;re looking for.
              </p>
              <p>
                Today, TruckFull has grown to include {metrics.displayTotal} food trucks and
                caterers across Georgia and South Carolina, with tools for event discovery,
                research, business management, and automatic schedule updates from Facebook.
              </p>
              <p>
                I&apos;ve built TruckFull independently, learning and solving problems as I&apos;ve
                gone. There&apos;s still plenty I want to accomplish, but the reason I started
                hasn&apos;t changed.
              </p>
              <p>
                I know how much time, money, and effort goes into running a small business. I want
                TruckFull to make that a little easier.
              </p>
              <div className="flex items-center gap-4">
                <Image
                  src="/placeholder-user.jpg"
                  alt="Founder of TruckFull"
                  width={72}
                  height={72}
                  className="h-[72px] w-[72px] shrink-0 rounded-full object-cover"
                />
                <div>
                  <p className="font-medium text-foreground">Daniel</p>
                  <p className="text-sm">Founder, TruckFull</p>
                  <a
                    href="https://www.linkedin.com/in/daniel-king-597197197"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    Connect on LinkedIn
                  </a>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">For Customers</h2>
            <div className="grid gap-3">
              <div className="glass rounded-lg p-4">
                <p className="font-medium text-foreground mb-1">Find trucks near you</p>
                <p className="text-sm text-muted-foreground">
                  See food trucks operating in your area on a live map with real-time locations.
                </p>
              </div>
              <div className="glass rounded-lg p-4">
                <p className="font-medium text-foreground mb-1">Browse menus and details</p>
                <p className="text-sm text-muted-foreground">
                  Check out menus, photos, hours, and cuisine types before you go.
                </p>
              </div>
              <div className="glass rounded-lg p-4">
                <p className="font-medium text-foreground mb-1">Save your favorites</p>
                <p className="text-sm text-muted-foreground">
                  Create a free account to save your favorite trucks and find them again fast.
                  Alerts when they&apos;re nearby are coming soon.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">For Food Truck Owners</h2>
            <div className="grid gap-3">
              <div className="glass rounded-lg p-4">
                <p className="font-medium text-foreground mb-1">Find events worth vending at</p>
                <p className="text-sm text-muted-foreground">{eventDiscoveryFeature.short}</p>
              </div>
              <div className="glass rounded-lg p-4">
                <p className="font-medium text-foreground mb-1">Go live with one tap</p>
                <p className="text-sm text-muted-foreground">{liveGpsFeature.short}</p>
              </div>
              <div className="glass rounded-lg p-4">
                <p className="font-medium text-foreground mb-1">Pick profitable locations</p>
                <p className="text-sm text-muted-foreground">{trafficIntelligenceFeature.short}</p>
              </div>
              <div className="glass rounded-lg p-4">
                <p className="font-medium text-foreground mb-1">Manage your menu and schedule</p>
                <p className="text-sm text-muted-foreground">{menuManagementFeature.short}</p>
              </div>
              <div className="glass rounded-lg p-4">
                <p className="font-medium text-foreground mb-1">Claim your listing for free</p>
                <p className="text-sm text-muted-foreground">{claimYourTruckFeature.short}</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">
              How Many Food Trucks Are in the CSRA?
            </h2>
            <p className="text-muted-foreground mb-4">
              The Central Savannah River Area (CSRA), covering Augusta, Evans, Martinez, Grovetown,
              North Augusta, Aiken, and surrounding communities, is one of the most active food
              truck regions in Georgia. TruckFull tracks over {metrics.csraTrucks} food trucks
              operating in the CSRA, from BBQ and tacos to desserts and coffee.
            </p>
            <p className="text-sm text-muted-foreground">
              Browse trucks by city:{' '}
              <Link href="/city/augusta-ga" className="text-primary hover:underline">
                Augusta
              </Link>
              {' · '}
              <Link href="/city/evans-ga" className="text-primary hover:underline">
                Evans
              </Link>
              {' · '}
              <Link href="/city/grovetown-ga" className="text-primary hover:underline">
                Grovetown
              </Link>
              {' · '}
              <Link href="/city/aiken-sc" className="text-primary hover:underline">
                Aiken
              </Link>
              {' · '}
              <Link href="/city/north-augusta-sc" className="text-primary hover:underline">
                North Augusta
              </Link>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Data We Collect &amp; Why
            </h2>
            <p className="text-muted-foreground mb-4">
              Transparency is important to us. Here&apos;s a summary of the data TruckFull collects
              and how it&apos;s used:
            </p>
            <div className="space-y-3">
              <div className="glass rounded-lg p-4">
                <p className="font-medium text-foreground mb-1">Location</p>
                <p className="text-sm text-muted-foreground">
                  Used to show food trucks near you. Only foreground location is collected, and we
                  never track you in the background. Location data is anonymized and not stored with
                  personally identifiable information.
                </p>
              </div>
              <div className="glass rounded-lg p-4">
                <p className="font-medium text-foreground mb-1">Account info</p>
                <p className="text-sm text-muted-foreground">
                  Your name and email (via Google, Facebook, or email/password) to create an account
                  and save favorites. You can delete your account at any time, and all personal data
                  is removed.
                </p>
              </div>
              <div className="glass rounded-lg p-4">
                <p className="font-medium text-foreground mb-1">Facebook data</p>
                <p className="text-sm text-muted-foreground">
                  Only for food truck owners who opt in. If you connect a Facebook business page and
                  authorize access, we read public post text and timestamps to automatically update
                  your truck&apos;s status. We do not collect engagement metrics or repost on your
                  behalf.
                </p>
              </div>
              <div className="glass rounded-lg p-4">
                <p className="font-medium text-foreground mb-1">Usage data</p>
                <p className="text-sm text-muted-foreground">
                  We use analytics to understand how the app is used so we can improve the
                  experience. All analytics data is anonymized.
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              For the full details, see our{' '}
              <Link href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Our Values</h2>
            <div className="space-y-3">
              <div className="glass rounded-lg p-4">
                <p className="font-medium text-foreground">Support local</p>
                <p className="text-sm text-muted-foreground">
                  We&apos;re built to help small food businesses reach more customers and thrive.
                </p>
              </div>
              <div className="glass rounded-lg p-4">
                <p className="font-medium text-foreground">Transparency</p>
                <p className="text-sm text-muted-foreground">
                  We&apos;re upfront about what data we collect, why we collect it, and how you can
                  control it.
                </p>
              </div>
              <div className="glass rounded-lg p-4">
                <p className="font-medium text-foreground">Privacy first</p>
                <p className="text-sm text-muted-foreground">
                  No background location tracking. No selling your personal information. You can
                  delete your account at any time.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">Get in Touch</h2>
            <p className="text-muted-foreground mb-4">
              Questions, feedback, or want to list your food truck? We&apos;d love to hear from you.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="mailto:support@truckfull.food"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
              >
                support@truckfull.food
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
              </a>
              <Link
                href="/for-owners"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                Owner tools overview
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
