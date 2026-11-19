import { Metadata } from 'next';
import Link from '@/components/navigation/IntentLink';
import { SeoPageShell } from '@/components/ui/organisms/SeoPageShell';

export const metadata: Metadata = {
  title: 'Contact Us | TruckFull',
  description: 'Get in touch with the TruckFull team for support, questions, or feedback.',
};

export default function ContactPage() {
  return (
    <SeoPageShell>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Contact Us</h1>
          <p className="text-muted-foreground">We&apos;re here to help</p>
        </div>

        {/* Content */}
        <div className="space-y-8 text-foreground/90">
          {/* Primary Contact */}
          <section className="glass rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Get in Touch</h2>
            <div className="space-y-4">
              <a
                href="mailto:support@truckfull.food"
                className="flex items-center gap-4 p-4 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">Email Us</p>
                  <p className="text-muted-foreground">support@truckfull.food</p>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="ml-auto text-muted-foreground"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </a>
            </div>
          </section>

          {/* Response Time */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Response Time</h2>
            <div className="grid gap-3">
              <div className="glass rounded-lg p-4 flex justify-between items-center">
                <p className="text-foreground">General inquiries</p>
                <p className="text-sm text-muted-foreground">Within 7 business days</p>
              </div>
              <div className="glass rounded-lg p-4 flex justify-between items-center">
                <p className="text-foreground">Takedown requests</p>
                <p className="text-sm text-muted-foreground">Within 48 hours</p>
              </div>
              <div className="glass rounded-lg p-4 flex justify-between items-center">
                <p className="text-foreground">Technical support</p>
                <p className="text-sm text-muted-foreground">Within 48 hours</p>
              </div>
            </div>
          </section>

          {/* Quick Links */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Quick Links</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <Link
                href="/takedown"
                className="glass rounded-lg p-4 hover:bg-white/10 transition-colors flex items-center justify-between"
              >
                <span className="text-foreground">Request a takedown</span>
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
                  className="text-muted-foreground"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </Link>
              <Link
                href="/terms"
                className="glass rounded-lg p-4 hover:bg-white/10 transition-colors flex items-center justify-between"
              >
                <span className="text-foreground">Terms of Service</span>
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
                  className="text-muted-foreground"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </Link>
              <Link
                href="/privacy"
                className="glass rounded-lg p-4 hover:bg-white/10 transition-colors flex items-center justify-between"
              >
                <span className="text-foreground">Privacy Policy</span>
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
                  className="text-muted-foreground"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </Link>
              <Link
                href="/"
                className="glass rounded-lg p-4 hover:bg-white/10 transition-colors flex items-center justify-between"
              >
                <span className="text-foreground">Find food trucks</span>
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
                  className="text-muted-foreground"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </Link>
              <Link
                href="/about"
                className="glass rounded-lg p-4 hover:bg-white/10 transition-colors flex items-center justify-between"
              >
                <span className="text-foreground">About TruckFull</span>
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
                  className="text-muted-foreground"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </Link>
            </div>
          </section>

          {/* For Truck Owners */}
          <section className="glass rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-3">Food Truck Owners</h2>
            <p className="text-muted-foreground mb-4">
              Want to claim your truck listing or upgrade to a paid plan? Email us and we&apos;ll
              get you set up.
            </p>
            <a
              href="mailto:support@truckfull.food?subject=Truck%20Owner%20Inquiry"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
            >
              Contact for Owners
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
          </section>

         </div>

        {/* Bottom padding for scroll */}
        <div className="h-12" />
      </div>
    </SeoPageShell>
  );
}
