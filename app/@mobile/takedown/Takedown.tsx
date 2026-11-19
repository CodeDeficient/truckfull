'use client';

import React from 'react';
import Link from '@/components/navigation/IntentLink';
import { MobileLegalPageLayout } from '@/components/mobile/MobileLegalPageLayout';

export default function Takedown() {
  return (
    <MobileLegalPageLayout title="Takedown Policy" lastUpdated="May 27, 2026">
      <section className="space-y-3 p-4 rounded-lg bg-muted/50">
        <p className="text-sm leading-relaxed">
          Need to remove or correct your business information on TruckFull? Here&apos;s how to
          request changes.
        </p>
      </section>

      <section className="space-y-3 p-4 rounded-lg bg-muted/50">
        <h2 className="text-lg font-semibold">Contact Us</h2>
        <p className="text-sm">
          <span className="font-medium">Email:</span>{' '}
          <a href="mailto:support@truckfull.food" className="text-primary hover:underline">
            support@truckfull.food
          </a>
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-primary">1.</span> What We Need From You
        </h2>
        <ul className="space-y-2 ml-2">
          {[
            'Your business name and website/social profile',
            'Links to the TruckFull pages you want reviewed',
            'Requested action: Remove, correct, or limit usage',
            'Proof of ownership (email from business domain, admin screenshot)',
          ].map((item, i) => (
            <li key={i} className="flex gap-3 items-start text-sm">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center">
                {i + 1}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-primary">2.</span> Our Process
        </h2>
        <div className="space-y-2 ml-2">
          {[
            { step: 'Acknowledge receipt', time: '2 business days' },
            { step: 'Evaluate and take action', time: '7 business days' },
            { step: 'Confirm completion', time: 'Same day' },
          ].map((item, i) => (
            <div
              key={i}
              className="flex justify-between items-center p-3 rounded-lg bg-muted/50 text-sm"
            >
              <span>{item.step}</span>
              <span className="text-muted-foreground">{item.time}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-primary">3.</span> What We Can Remove or Correct
        </h2>
        <ul className="list-disc list-inside text-sm space-y-1 ml-2">
          <li>Factual inaccuracies (name, schedule, location, contact)</li>
          <li>Content you own and don&apos;t want listed</li>
          <li>Personal data out of scope for our service</li>
          <li>Duplicate listings</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-primary">4.</span> Legal Basis
        </h2>
        <p className="text-sm leading-relaxed ml-2">You may request removal under:</p>
        <ul className="list-disc list-inside text-sm space-y-1 ml-4">
          <li>Your right to control business information</li>
          <li>California Consumer Privacy Act (CCPA)</li>
          <li>General data accuracy correction</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-primary">5.</span> Appeals
        </h2>
        <p className="text-sm leading-relaxed ml-2">
          If you disagree with our response, reply to our confirmation email. We&apos;ll re-evaluate
          within 5 business days.
        </p>
      </section>

      <section className="pt-4 border-t border-border">
        <p className="text-sm text-muted-foreground">
          See also:{' '}
          <Link href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
          {' • '}
          <Link href="/terms" className="text-primary hover:underline">
            Terms of Service
          </Link>
        </p>
      </section>
    </MobileLegalPageLayout>
  );
}
