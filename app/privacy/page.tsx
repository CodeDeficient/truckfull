import type { Metadata } from 'next';
import type { JSX } from 'react';
import { SeoPageShell } from '@/components/ui/organisms/SeoPageShell';

export const metadata: Metadata = {
  title: 'Privacy Policy | TruckFull',
  description: 'TruckFull Privacy Policy - How we collect, use, and protect your data.',
};

export default function PrivacyPage(): JSX.Element {
  return (
    <SeoPageShell>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Privacy Policy</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Last Updated: October 27, 2026
          </p>
        </div>

        {/* Content */}
        <div className="space-y-6 md:space-y-8 text-foreground/90 text-sm md:text-base">
          {/* Intro */}
          <div className="glass rounded-lg p-4 md:p-6">
            <p className="text-base md:text-lg">
              <strong className="text-foreground">TruckFull</strong> (&quot;we,&quot;
              &quot;us,&quot; or &quot;our&quot;) operates the TruckFull food truck discovery
              platform at https://www.truckfull.food. This Privacy Policy explains how we collect,
              use, and protect your information.
            </p>
          </div>

          {/* Section 1 */}
          <section>
            <h2 className="text-lg md:text-xl font-semibold text-foreground mb-3 md:mb-4 flex items-center gap-2">
              <span className="text-primary">1.</span> Information We Collect
            </h2>

            <div className="space-y-3 md:space-y-4 ml-0 md:ml-6">
              <div>
                <h3 className="font-medium text-foreground mb-2">Account Information</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Email address</li>
                  <li>Name (from Google or Facebook OAuth, or manually provided)</li>
                  <li>Profile picture (if using Google or Facebook OAuth)</li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium text-foreground mb-2">Food Truck Owner Information</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Business name and contact information</li>
                  <li>Social media handles (Facebook, Instagram)</li>
                  <li>Menu items, pricing, and operating hours</li>
                  <li>GPS location when you update your truck&apos;s position</li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium text-foreground mb-2">Automatic Data</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>
                    IP address (used for approximate location and to protect the site from abuse)
                  </li>
                  <li>Browser type and device info</li>
                  <li>Pages visited and features used</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-lg md:text-xl font-semibold text-foreground mb-3 md:mb-4 flex items-center gap-2">
              <span className="text-primary">2.</span> Location Data
            </h2>
            <div className="glass rounded-lg p-3 md:p-4 space-y-2 md:space-y-3">
              <p>
                <strong className="text-foreground">For Users (Foodies):</strong>{' '}
                <span className="text-muted-foreground">
                  We use your approximate location (from your IP address) to show food trucks near
                  you. Your GPS coordinates are never stored, never shared, and never tracked. GPS
                  is only used when you explicitly tap &quot;Find Trucks Near Me&quot;: one request,
                  one response, then it&apos;s gone. We do not track your movement, we do not build
                  a history of where you&apos;ve been, and we do not share your precise location
                  with anyone. The map provider sees the map area on your screen, not your exact
                  coordinates. All we want is to show you the trucks around you. We don&apos;t care
                  who you are or where you go.
                </span>
              </p>
              <p>
                <strong className="text-foreground">For Owners:</strong>{' '}
                <span className="text-muted-foreground">
                  When you update your truck&apos;s location, we capture a single GPS snapshot to
                  show your position on the public map. We do not continuously track your location.
                  Your truck&apos;s position is stored until you update it or close up shop.
                </span>
              </p>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-lg md:text-xl font-semibold text-foreground mb-3 md:mb-4 flex items-center gap-2">
              <span className="text-primary">3.</span> How We Use Your Data
            </h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-0 md:ml-6">
              <li>Create and manage your account</li>
              <li>Show food trucks near your location</li>
              <li>Process subscription payments</li>
              <li>Send service emails (password reset, verification)</li>
              <li>Improve the service</li>
            </ul>
            <div className="mt-3 md:mt-4 p-3 md:p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-xs md:text-sm">
                <strong className="text-foreground">We do NOT:</strong>{' '}
                <span className="text-muted-foreground">
                  Store your GPS location* • Sell your personal information • Use targeted
                  advertising • Share your precise location with other users
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                * Except for food truck owners who voluntarily update their truck&apos;s position on
                the public map.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg md:text-xl font-semibold text-foreground mb-3 md:mb-4 flex items-center gap-2">
              <span className="text-primary">4.</span> Who We Share Data With
            </h2>
            <div className="space-y-3 md:space-y-4 ml-0 md:ml-6 text-muted-foreground">
              <p>
                We share your personal data only with companies that help us run TruckFull, and only
                what each one needs to do its job. Public business information is covered in Section
                6.
              </p>
              <div>
                <h3 className="font-medium text-foreground mb-2">Your personal data</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>
                    <strong className="text-foreground">Account details and favorites:</strong>{' '}
                    stored for us by our hosting and database providers. They store and process it
                    only to provide their service to us.
                  </li>
                  <li>
                    <strong className="text-foreground">Email address:</strong> used to send account
                    and service emails, and passed to our payment processor if you subscribe.
                  </li>
                  <li>
                    <strong className="text-foreground">Card details:</strong> entered directly with
                    our payment processor. We never receive your card number.
                  </li>
                  <li>
                    <strong className="text-foreground">IP address and browser details:</strong>{' '}
                    used to load pages and maps and to block bots, spam, and abuse.
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-foreground mb-2">Public business data only</h3>
                <p className="mb-2">
                  These services never receive your personal account data. They only work with
                  business and event information, like what appears on public listings, flyers, and
                  Facebook Pages:
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>
                    <strong className="text-foreground">AI services:</strong> read truck
                    owners&apos; public Facebook posts, menu photos, and event flyers to keep
                    schedules, menus, and events up to date for Pro users.
                  </li>
                  <li>
                    <strong className="text-foreground">Address lookup:</strong> turns truck and
                    event addresses into map locations.
                  </li>
                  <li>
                    <strong className="text-foreground">Web search:</strong> looks up business
                    names, phone numbers, and websites to check that trucks and events are real.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg md:text-xl font-semibold text-foreground mb-3 md:mb-4 flex items-center gap-2">
              <span className="text-primary">5.</span> Facebook/Meta Integration
            </h2>
            <div className="space-y-2 md:space-y-3 ml-0 md:ml-6 text-muted-foreground">
              <p>
                <strong className="text-foreground">For Food Truck Owners Only:</strong>{' '}
                <span className="text-muted-foreground">
                  When you connect your Facebook page to TruckFull, we collect:
                </span>
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4 md:ml-6">
                <li>Your Facebook page ID and name</li>
                <li>Public post text from your page</li>
                <li>Post timestamp</li>
              </ul>
              <div className="p-3 md:p-4 rounded-lg bg-destructive/10 border border-destructive/20 mt-2 md:mt-3">
                <p className="text-xs md:text-sm font-medium text-foreground mb-1 md:mb-2">
                  Important:
                </p>
                <ul className="list-disc list-inside text-xs md:text-sm space-y-1">
                  <li>
                    We do NOT collect or store post engagement metrics (likes, comments, shares)
                  </li>
                  <li>We do NOT repost or share your Facebook posts publicly</li>
                  <li>
                    Public users never see Facebook posts - only extracted data (location, hours,
                    menu) after your approval
                  </li>
                  <li>Only YOU (the truck owner) can see this data in your private dashboard</li>
                </ul>
              </div>
              <p className="mt-3">
                <strong className="text-foreground">How We Use It:</strong>{' '}
                <span className="text-muted-foreground">
                  We parse post text to extract location updates, hours changes, menu items,
                  pricing, and event announcements. Updates below our confidence threshold require
                  your explicit approval before appearing on TruckFull. This is done with automated
                  tools, including the AI services described in Section 4.
                </span>
              </p>
              <p className="mt-3">
                <strong className="text-foreground">Data Retention:</strong>{' '}
                <span className="text-muted-foreground">
                  Post content retained for 90 days. Webhook events retained for 30 days.
                </span>
              </p>
              <p className="mt-3">
                <strong className="text-foreground">Commercial Products:</strong>{' '}
                <span className="text-muted-foreground">
                  Information obtained through a connected Facebook/Meta account is not included in
                  our commercial business-data products. Independently sourced public business
                  information about the same business is separate from this connected-account data.
                </span>
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg md:text-xl font-semibold text-foreground mb-3 md:mb-4 flex items-center gap-2">
              <span className="text-primary">6.</span> Public Business Information
            </h2>
            <div className="space-y-2 md:space-y-3 ml-0 md:ml-6 text-muted-foreground">
              <p>
                Independently of what you provide to us, TruckFull may collect public business
                information from public and business-owned sources. This may include a
                business&apos;s name, public contact information, website, location, and business
                category. We may use, display, or provide this independently sourced public business
                information in business-data products and partnerships.
              </p>
              <p>
                This distinction is based on where information came from, not merely on whether the
                underlying fact happens to be public. For example, a business phone number that we
                obtain independently from the business&apos;s own public website may be used as
                public business information, but the same phone number entered directly into
                TruckFull by an owner is treated as information you provided to us and is not
                licensed on the basis of that submission.
              </p>
              <p>
                <strong className="text-foreground">We do not sell or license:</strong> private
                account information, payment information, private usage or behavior data, precise
                personal location information, information users provide directly to TruckFull, or
                information obtained through connected Facebook/Meta accounts. Independently sourced
                public business information about the same business is separate and is not covered
                by these exclusions.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg md:text-xl font-semibold text-foreground mb-3 md:mb-4 flex items-center gap-2">
              <span className="text-primary">7.</span> Your Rights
            </h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-0 md:ml-6">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Delete your account and data</li>
              <li>Withdraw consent</li>
            </ul>
            <p className="mt-2 md:mt-3 text-xs md:text-sm text-muted-foreground ml-0 md:ml-6">
              Contact us at{' '}
              <a href="mailto:support@truckfull.food" className="text-primary hover:underline">
                support@truckfull.food
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-lg md:text-xl font-semibold text-foreground mb-3 md:mb-4 flex items-center gap-2">
              <span className="text-primary">8.</span> California Residents (CCPA)
            </h2>
            <div className="space-y-2 md:space-y-3 text-muted-foreground ml-0 md:ml-6">
              <p>
                You have the right to know what personal information we collect, request deletion,
                and opt-out of the sale or sharing of personal information.{' '}
                <strong className="text-foreground">
                  We do not sell or license your personal information.
                </strong>
              </p>
              <p>
                This includes private account information, payment information, private usage or
                behavior data, precise personal location information, information you provide
                directly to TruckFull, and information obtained through connected Facebook/Meta
                accounts. Independently sourced public business information is described in Section
                6 and is not personal information you provided to us.
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
