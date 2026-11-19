'use client';

import React from 'react';
import Link from '@/components/navigation/IntentLink';
import { MobileLegalPageLayout } from '@/components/mobile/MobileLegalPageLayout';
import { Mail, ChevronRight, ExternalLink, ShieldAlert, FileText, Search } from 'lucide-react';

export default function ContactUs() {
  return (
    <MobileLegalPageLayout title="Contact Us" lastUpdated="We're here to help">
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-gray-100">Get in Touch</h2>
        <div className="space-y-3">
          <a
            href="mailto:support@truckfull.food"
            className="flex items-center gap-4 rounded-xl p-4 bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/15 transition-colors"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500 text-white shrink-0">
              <Mail className="size-6" />
            </div>
            <div className="flex-1">
              <p className="text-base font-semibold text-gray-100">Email Us</p>
              <p className="text-sm text-gray-400">support@truckfull.food</p>
            </div>
            <ChevronRight className="size-5 text-gray-400 shrink-0" />
          </a>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-gray-100">Response Time</h2>
        <div className="space-y-2">
          <div className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/10 text-sm">
            <span className="text-gray-200">General inquiries</span>
            <span className="text-gray-400">Within 24 hours</span>
          </div>
          <div className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/10 text-sm">
            <span className="text-gray-200">Takedown requests</span>
            <span className="text-gray-400">Within 2 business days</span>
          </div>
          <div className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/10 text-sm">
            <span className="text-gray-200">Technical support</span>
            <span className="text-gray-400">Within 48 hours</span>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-gray-100">Quick Links</h2>
        <div className="grid gap-3">
          <Link
            href="/takedown"
            className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-3">
              <ShieldAlert className="size-4 text-gray-400" />
              <span className="text-gray-200 text-sm">Request a takedown</span>
            </div>
            <ExternalLink className="size-4 text-gray-500" />
          </Link>
          <Link
            href="/terms"
            className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-3">
              <FileText className="size-4 text-gray-400" />
              <span className="text-gray-200 text-sm">Terms of Service</span>
            </div>
            <ExternalLink className="size-4 text-gray-500" />
          </Link>
          <Link
            href="/privacy"
            className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-3">
              <FileText className="size-4 text-gray-400" />
              <span className="text-gray-200 text-sm">Privacy Policy</span>
            </div>
            <ExternalLink className="size-4 text-gray-500" />
          </Link>
          <Link
            href="/"
            className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Search className="size-4 text-gray-400" />
              <span className="text-gray-200 text-sm">Find food trucks</span>
            </div>
            <ExternalLink className="size-4 text-gray-500" />
          </Link>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-gray-100">Food Truck Owners</h2>
        <p className="text-sm leading-relaxed text-gray-300">
          Want to claim your truck listing or upgrade to a paid plan? Email us and we'll get you set
          up.
        </p>
        <a
          href="mailto:support@truckfull.food?subject=Truck%20Owner%20Inquiry"
          className="inline-flex items-center justify-center w-full gap-2 px-4 py-3 rounded-xl bg-red-600 text-white font-medium hover:bg-red-500 transition-colors"
        >
          Contact for Owners
        </a>
      </section>
    </MobileLegalPageLayout>
  );
}
