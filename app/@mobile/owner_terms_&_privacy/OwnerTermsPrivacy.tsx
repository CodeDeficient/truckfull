'use client';

import React from 'react';
import AccordionItem from '@/components/mobile/AccordionItem';

export default function Owner_terms_privacy() {
  return (
    <>
      <meta charSet="utf-8" />
      <meta content="width=device-width, initial-scale=1.0" name="viewport" />
      <title>TruckFull - Terms & Privacy</title>
      <style type="text/tailwindcss">{`
      :root {
        --background-color: #1a1a1a;
        --card-color: rgba(255, 255, 255, 0.05);
        --border-color: rgba(255, 255, 255, 0.1);
        --primary-color: #ea2a2a;
        --text-color: #ffffff;
        --subtle-text-color: #a0a0a0;
      }
      body {
        background-color: var(--background-color);
      }
      .glassmorphism {
        background: var(--card-color);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid var(--border-color);
      }
    `}</style>
      <style>{`
    body {
      min-height: max(884px, 100dvh);
    }
  `}</style>

      <div className="relative flex size-full min-h-screen flex-col justify-between overflow-x-hidden">
        <div className="flex-grow">
          <header className="sticky top-0 z-10 flex items-center justify-between p-4 bg-black/50 backdrop-blur-sm">
            <button className="text-white">
              <svg
                fill="currentColor"
                height="24"
                viewBox="0 0 256 256"
                width="24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M165.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L91.31,128Z" />
              </svg>
            </button>
            <h1 className="text-lg font-bold text-white absolute left-1/2 -translate-x-1/2">
              Terms &amp; Privacy
            </h1>
            <div />
          </header>
          <main className="p-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white">Review Our Policies</h2>
              <p className="text-base text-[var(--subtle-text-color)] mt-2">
                By using TruckFull, you agree to these terms. Please read them carefully.
              </p>
            </div>
            <div className="space-y-3">
              <AccordionItem title="Terms of Service">
                Welcome to TruckFull! Our platform connects food lovers with the best mobile
                culinary experiences. As a food truck owner, you are responsible for maintaining
                accurate information about your truck, including your menu, location, and operating
                hours. You must comply with all local health and safety regulations. We reserve the
                right to remove any content that violates our community guidelines.
              </AccordionItem>
              <AccordionItem title="Privacy Policy">
                Your privacy is important to us. We collect information you provide, such as your
                business name, contact details, and location data, to operate and improve our
                services. We do not sell or license personal data, payment information, private
                usage or behavior data, precise personal location information, information you enter
                into TruckFull, or information from connected Facebook/Meta accounts. We may use
                aggregated, anonymized data for analytics and marketing purposes. Independently
                sourced public business information from public and business-owned sources is
                separate and may be used in business-data products and partnerships. You have the
                right to access and delete your data at any time.
              </AccordionItem>
              <AccordionItem title="User Responsibilities">
                As a user of the TruckFull platform, you agree to provide accurate and up-to-date
                information for your food truck. You are responsible for all content posted under
                your account and must ensure it complies with all applicable laws and regulations.
                Prohibited activities include posting false information, engaging in harassment, and
                infringing on intellectual property rights. Violation of these responsibilities may
                result in suspension or termination of your account.
              </AccordionItem>
            </div>
          </main>
        </div>
        <footer
          className="sticky bottom-0 p-4 bg-black/50 backdrop-blur-sm"
          style={{ touchAction: 'none' }}
        >
          <button className="w-full h-14 rounded-xl bg-[var(--primary-color)] text-white text-lg font-bold tracking-wide transition-transform active:scale-95">
            I Understand &amp; Agree
          </button>
        </footer>
      </div>
    </>
  );
}
