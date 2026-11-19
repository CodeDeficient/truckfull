import { Metadata } from 'next';
import { SeoPageShell } from '@/components/ui/organisms/SeoPageShell';

export const metadata: Metadata = {
  title: 'Takedown Policy | TruckFull',
  description:
    'TruckFull Takedown Policy - How to request removal or correction of business information.',
};

export default function TakedownPage() {
  return (
    <SeoPageShell>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Takedown Policy</h1>
          <p className="text-muted-foreground">Last Updated: May 27, 2026</p>
        </div>

        {/* Content */}
        <div className="space-y-8 text-foreground/90">
          {/* Intro */}
          <div className="glass rounded-lg p-6">
            <p className="text-lg">
              Need to remove or correct your business information on TruckFull? Here&apos;s how to
              request changes.
            </p>
          </div>

          {/* Contact */}
          <section className="glass rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-3">Contact Us</h2>
            <p className="text-muted-foreground">
              <strong className="text-foreground">Email:</strong>{' '}
              <a href="mailto:support@truckfull.food" className="text-primary hover:underline">
                support@truckfull.food
              </a>
            </p>
          </section>

          {/* What We Need */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="text-primary">1.</span> What We Need From You
            </h2>
            <div className="ml-6 space-y-2">
              {[
                { num: '1', text: 'Your business name and website/social profile' },
                { num: '2', text: 'Links to the TruckFull pages you want reviewed' },
                { num: '3', text: 'Requested action: Remove, correct, or limit usage' },
                {
                  num: '4',
                  text: 'Proof of ownership (email from business domain, admin screenshot)',
                },
              ].map((item) => (
                <div key={item.num} className="flex gap-3 items-start">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-sm flex items-center justify-center">
                    {item.num}
                  </span>
                  <p className="text-muted-foreground">{item.text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Our Process */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="text-primary">2.</span> Our Process
            </h2>
            <div className="ml-6 grid gap-3">
              {[
                { step: 'Acknowledge receipt', time: '2 business days' },
                { step: 'Evaluate and take action', time: '7 business days' },
                { step: 'Confirm completion', time: 'Same day' },
              ].map((item, i) => (
                <div key={i} className="glass rounded-lg p-4 flex justify-between items-center">
                  <p className="text-foreground">{item.step}</p>
                  <p className="text-sm text-muted-foreground">{item.time}</p>
                </div>
              ))}
            </div>
          </section>

          {/* What We Can Fix */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="text-primary">3.</span> What We Can Remove or Correct
            </h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-6">
              <li>Factual inaccuracies (name, schedule, location, contact)</li>
              <li>Content you own and don&apos;t want listed</li>
              <li>Personal data out of scope for our service</li>
              <li>Duplicate listings</li>
            </ul>
          </section>

          {/* Legal Basis */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="text-primary">4.</span> Legal Basis
            </h2>
            <div className="text-muted-foreground ml-6 space-y-2">
              <p>You may request removal under:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Your right to control business information</li>
                <li>California Consumer Privacy Act (CCPA)</li>
                <li>General data accuracy correction</li>
              </ul>
            </div>
          </section>

          {/* Appeals */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="text-primary">5.</span> Appeals
            </h2>
            <p className="text-muted-foreground ml-6">
              If you disagree with our response, reply to our confirmation email. We&apos;ll
              re-evaluate within 5 business days.
            </p>
          </section>
         </div>

        {/* Bottom padding for scroll */}
        <div className="h-12" />
      </div>
    </SeoPageShell>
  );
}
