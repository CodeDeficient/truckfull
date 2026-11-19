import { Metadata } from 'next';
import { SeoPageShell } from '@/components/ui/organisms/SeoPageShell';
import { getFoundingMemberData, getTruckMetrics } from '@/lib/content/metrics';
import { getTrialEligibility } from '@/lib/subscription/trialEligibilityServer';
import { PricingClientWrapper } from './_components/PricingClientWrapper';
import { PricingFAQ } from './_components/PricingFAQ';
import { LineRippleBackground } from '@/components/ui/LineRippleBackground';

export const metadata: Metadata = {
  title: 'Pricing — Free & Pro Plans | TruckFull',
  description:
    'Free listing and live event map. Pro tier includes event research, traffic insights, and phone verification. 30-day free trial, no credit card required.',
};

// Eligibility depends on the caller's auth cookies, so this page must render
// per-request rather than at build time.
export const dynamic = 'force-dynamic';

export default async function PricingPage() {
  let foundingData: Awaited<ReturnType<typeof getFoundingMemberData>> | undefined;
  let truckMetrics = { totalTrucks: 255, claimedTrucks: 15, displayTotal: '255+' };
  let trialEligibility: Awaited<ReturnType<typeof getTrialEligibility>> = 'error';
  try {
    [foundingData, truckMetrics, trialEligibility] = await Promise.all([
      getFoundingMemberData(),
      getTruckMetrics(),
      getTrialEligibility(),
    ]);
  } catch (error) {
    console.error('Failed to fetch pricing data:', error);
  }

  return (
    <SeoPageShell hidePricing transparentBg>
      <div className="relative min-h-full">
        <div className="absolute inset-0 overflow-hidden">
          <LineRippleBackground />
        </div>
        <div className="relative container mx-auto px-4 py-8 max-w-4xl">
          <div className="glass-strong rounded-xl px-4 py-3 mb-6 text-center max-w-lg mx-auto">
            <h1 className="text-2xl font-bold text-foreground mb-1">Simple pricing</h1>
            <p className="text-muted-foreground max-w-lg mx-auto mb-1">
              Find better events. Avoid wasted time.
            </p>
            <p className="text-muted-foreground max-w-lg mx-auto mb-1">Pro pays for itself.</p>
            <p className="text-xs text-muted-foreground">
              {truckMetrics.displayTotal} food trucks tracked · {truckMetrics.claimedTrucks} claimed
              listings
            </p>
          </div>

          <PricingClientWrapper foundingData={foundingData} trialEligibility={trialEligibility} />

          <PricingFAQ className="mt-12" />

          <div className="h-12" />
        </div>
      </div>
    </SeoPageShell>
  );
}
