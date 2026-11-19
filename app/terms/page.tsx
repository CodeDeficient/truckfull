import type { Metadata } from 'next';
import type { JSX } from 'react';
import { SeoPageShell } from '@/components/ui/organisms/SeoPageShell';

export const metadata: Metadata = {
  title: 'Terms of Service | TruckFull',
  description: 'TruckFull Terms of Service - Rules and guidelines for using our platform.',
};

export default function TermsPage(): JSX.Element {
  return (
    <SeoPageShell>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Terms of Service</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Last Updated: October 9, 2026
          </p>
        </div>

        {/* Content */}
        <div className="space-y-6 md:space-y-8 text-foreground/90 text-sm md:text-base">
          {/* Intro */}
          <div className="glass rounded-lg p-4 md:p-6">
            <p className="text-base md:text-lg">
              By using <strong className="text-foreground">TruckFull</strong>, you agree to these
              terms. If you don&apos;t agree, please don&apos;t use the service.
            </p>
          </div>

          {/* Section 1 */}
          <section>
            <h2 className="text-lg md:text-xl font-semibold text-foreground mb-3 md:mb-4 flex items-center gap-2">
              <span className="text-primary">1.</span> What TruckFull Does
            </h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-0 md:ml-6">
              <li>Helps users discover food trucks by location and cuisine</li>
              <li>Allows food truck owners to manage their listings</li>
              <li>Provides business tools for truck operators (paid tiers)</li>
            </ul>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-lg md:text-xl font-semibold text-foreground mb-3 md:mb-4 flex items-center gap-2">
              <span className="text-primary">2.</span> Your Account
            </h2>
            <div className="space-y-2 md:space-y-3 ml-0 md:ml-6 text-muted-foreground">
              <p>You can sign up with Google OAuth, Facebook OAuth, or email/password.</p>
              <p>
                You&apos;re responsible for keeping your account secure and all activity under it.
              </p>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-lg md:text-xl font-semibold text-foreground mb-3 md:mb-4 flex items-center gap-2">
              <span className="text-primary">3.</span> User Rules
            </h2>

            <div className="space-y-3 md:space-y-4 ml-0 md:ml-6">
              <div>
                <h3 className="font-medium text-foreground mb-2">Regular Users</h3>
                <p className="text-muted-foreground mb-2">
                  You may browse trucks and save favorites.
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Don&apos;t:</strong> Hack or abuse the system.
                </p>
              </div>

              <div>
                <h3 className="font-medium text-foreground mb-2">Food Truck Owners</h3>
                <p className="text-muted-foreground mb-2">
                  You may claim and manage your truck&apos;s listing.
                </p>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>You must be authorized to represent the business</li>
                  <li>All info you provide must be accurate and current</li>
                  <li>You must comply with food service regulations</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 3.5: Facebook/Meta Integration */}
          <section>
            <h2 className="text-lg md:text-xl font-semibold text-foreground mb-3 md:mb-4 flex items-center gap-2">
              <span className="text-primary">3.5.</span> Facebook/Meta Integration
            </h2>
            <div className="space-y-2 md:space-y-3 ml-0 md:ml-6 text-muted-foreground">
              <p className="font-medium text-foreground">For Food Truck Owners:</p>
              <p>
                You may connect your Facebook business page to TruckFull for automatic data
                synchronization.
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4 md:ml-6">
                <li>Connection requires your explicit authorization via Facebook OAuth</li>
                <li>
                  We monitor your page posts for location, hours, menu, pricing, and event updates
                </li>
                <li>
                  High-confidence updates are applied automatically; uncertain updates appear in
                  your dashboard for approval
                </li>
                <li>You can review and modify any update before it goes live</li>
                <li>You can disconnect your page at any time</li>
              </ul>
              <div className="p-3 md:p-4 rounded-lg bg-destructive/10 border border-destructive/20 mt-2 md:mt-3">
                <p className="text-xs md:text-sm font-medium text-foreground mb-1 md:mb-2">
                  Important Limitations:
                </p>
                <ul className="list-disc list-inside text-xs md:text-sm space-y-1">
                  <li>We do NOT repost or share your Facebook posts publicly</li>
                  <li>We do NOT display engagement metrics (likes, comments, shares)</li>
                  <li>
                    Public users see only extracted data (location, hours, menu) - never original
                    posts
                  </li>
                  <li>We do NOT use your page to post content to Facebook</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 4 - Subscriptions */}
          <section>
            <h2 className="text-lg md:text-xl font-semibold text-foreground mb-3 md:mb-4 flex items-center gap-2">
              <span className="text-primary">4.</span> Subscription Tiers
            </h2>
            <div className="grid gap-2 md:gap-3 ml-0 md:ml-6">
              {[
                { name: 'Free', price: '$0/mo', desc: 'Basic listing, manual updates' },
                {
                  name: 'Pro',
                  price: '$50/mo',
                  desc: 'Auto Facebook updates, field guide with historical traffic, live traffic data (coming soon), email support within 48 hours',
                },
              ].map((tier) => (
                <div
                  key={tier.name}
                  className="glass rounded-lg p-3 md:p-4 flex justify-between items-center gap-2"
                >
                  <div>
                    <p className="font-medium text-foreground text-sm md:text-base">{tier.name}</p>
                    <p className="text-xs md:text-sm text-muted-foreground">{tier.desc}</p>
                  </div>
                  <p className="text-primary font-semibold text-sm md:text-base whitespace-nowrap">
                    {tier.price}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-xs md:text-sm text-muted-foreground mt-2 md:mt-3 ml-0 md:ml-6">
              Cancel anytime. No refunds for partial months.
            </p>
          </section>

          {/* Section 5 - Disclaimers */}
          <section>
            <h2 className="text-lg md:text-xl font-semibold text-foreground mb-3 md:mb-4 flex items-center gap-2">
              <span className="text-primary">5.</span> Important Disclaimers
            </h2>
            <div className="p-3 md:p-4 rounded-lg bg-destructive/10 border border-destructive/20 ml-0 md:ml-6">
              <p className="font-medium text-foreground mb-1 md:mb-2">
                We are NOT responsible for:
              </p>
              <ul className="list-disc list-inside text-xs md:text-sm text-muted-foreground space-y-1">
                <li>Food quality, safety, or allergies</li>
                <li>Accuracy of menu/allergen info from owners</li>
                <li>Disputes between customers and trucks</li>
              </ul>
              <p className="mt-2 md:mt-3 text-xs md:text-sm text-muted-foreground">
                <strong className="text-foreground">TruckFull is a discovery platform.</strong> Food
                trucks are independent businesses. Eat at your own risk.
              </p>
            </div>
          </section>

          {/* Section 6 - Disputes */}
          <section>
            <h2 className="text-lg md:text-xl font-semibold text-foreground mb-3 md:mb-4 flex items-center gap-2">
              <span className="text-primary">6.</span> Disputes
            </h2>
            <div className="text-muted-foreground ml-0 md:ml-6 space-y-1 md:space-y-2">
              <p>
                These terms are governed by{' '}
                <strong className="text-foreground">South Carolina law</strong>.
              </p>
              <p>You agree to resolve disputes individually (no class actions).</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg md:text-xl font-semibold text-foreground mb-3 md:mb-4 flex items-center gap-2">
              <span className="text-primary">7.</span> Data Use and Automated Access
            </h2>
            <div className="space-y-2 md:space-y-3 ml-0 md:ml-6 text-muted-foreground">
              <p>
                The truck listings, locations, menus, schedules, and contact information on
                TruckFull are compiled, verified, and maintained by TruckFull. You may use TruckFull
                for your own personal, non-commercial purposes and share links to any page.
              </p>
              <p className="font-medium text-foreground">
                Without our written permission, you may not:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4 md:ml-6">
                <li>
                  Scrape, crawl, or use bots or other automated tools to collect data from TruckFull
                </li>
                <li>
                  Copy, republish, sell, or redistribute TruckFull listings or any dataset built
                  from them
                </li>
                <li>
                  Use TruckFull data to build or improve a competing directory, dataset, or data
                  product
                </li>
                <li>Use TruckFull data to train or improve machine learning or AI models</li>
              </ul>
              <p>
                Search engines may index TruckFull in line with our robots.txt file. Food truck
                owners may use and share information about their own business however they choose.
              </p>
              <p>
                Interested in using TruckFull data? We offer data partnerships. Contact{' '}
                <a href="mailto:newman@truckfull.food" className="text-primary hover:underline">
                  newman@truckfull.food
                </a>
                . Approved partners access listing data under a separate written agreement with
                TruckFull, and that agreement governs their use.
              </p>
              <p>
                Partnership data is limited to independently sourced public business information. It
                never includes information obtained through connected Facebook or Meta accounts,
                account or payment information, or information that users and owners enter into
                TruckFull.
              </p>
              <p>
                We may block, rate limit, or revoke access, and may pursue legal remedies, in
                response to unauthorized scraping or redistribution.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section className="glass rounded-lg p-4 md:p-6">
            <h2 className="text-lg md:text-xl font-semibold text-foreground mb-2 md:mb-3">
              Contact Us
            </h2>
            <p className="text-muted-foreground">
              <strong className="text-foreground">Email:</strong>{' '}
              <a href="mailto:support@truckfull.food" className="text-primary hover:underline">
                support@truckfull.food
              </a>
            </p>
          </section>
        </div>

        {/* Bottom padding for scroll */}
        <div className="h-12" />
      </div>
    </SeoPageShell>
  );
}
