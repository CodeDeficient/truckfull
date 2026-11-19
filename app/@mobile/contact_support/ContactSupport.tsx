'use client';

import React from 'react';
import { MobileLegalPageLayout } from '@/components/mobile/MobileLegalPageLayout';
import { Mail, ChevronRight } from 'lucide-react';

export default function ContactSupport() {
  return (
    <MobileLegalPageLayout title="Contact Support" lastUpdated="December 16, 2025">
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-gray-100">Contact Options</h2>
        <div className="space-y-3">
          {/* Email */}
          <a
            href="mailto:support@truckfull.food"
            className="flex items-center gap-4 rounded-xl p-4 bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/15 transition-colors"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500 text-white">
              <Mail className="size-6" />
            </div>
            <div className="flex-1">
              <p className="text-base font-semibold text-gray-100">Email</p>
              <p className="text-sm text-gray-400">support@truckfull.food</p>
            </div>
            <ChevronRight className="size-5 text-gray-400" />
          </a>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-gray-100">Need More Help?</h2>
        <p className="text-sm leading-relaxed text-gray-300">
          Our support team is available to assist you with any questions or issues. The fastest way
          to reach us is via email at{' '}
          <a
            className="text-red-500 font-medium hover:underline"
            href="mailto:support@truckfull.food"
          >
            support@truckfull.food
          </a>
          . We typically respond within 24 hours.
        </p>
      </section>
    </MobileLegalPageLayout>
  );
}
