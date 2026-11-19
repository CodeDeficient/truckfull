import React from 'react';
import { MobileNavLink } from '../components/MobileNavLink';

export default function Subscription_management_owner() {
  return (
    <>
      <meta charSet="utf-8" />
      <meta content="width=device-width, initial-scale=1.0" name="viewport" />
      <title>TruckFull - Subscription</title>
      <style type="text/tailwindcss">{`
    :root {
      --primary-color: #ea2a2a;
      --background-color: #181111;
      --glass-color: rgba(255, 255, 255, 0.05);
      --glass-border-color: rgba(255, 255, 255, 0.1);
      --text-color: #FFFFFF;
      --text-muted-color: #b89d9d;
    }
    body {
      background-color: var(--background-color);
    }
    .glassmorphism {
      background: var(--glass-color);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid var(--glass-border-color);
    }
  `}</style>
      <style>{`
    body {
      min-height: max(884px, 100dvh);
    }
  `}</style>

      <div className="relative flex size-full min-h-screen flex-col justify-between overflow-x-hidden p-6">
        <header className="flex items-center justify-between mb-8">
          <button className="p-2 -ml-2">
            <span className="material-symbols-outlined text-3xl">arrow_back_ios_new</span>
          </button>
          <h1 className="text-xl font-bold">Subscription</h1>
          <div className="w-8" />
        </header>
        <main className="flex-grow">
          <section className="mb-8">
            <h2 className="text-lg font-bold mb-4">Current Plan</h2>
            <div className="glassmorphism rounded-2xl p-5 flex items-center gap-5">
              <div className="bg-[var(--primary-color)] rounded-full p-3 flex items-center justify-center">
                <span className="material-symbols-outlined text-4xl">workspace_premium</span>
              </div>
              <div>
                <h3 className="text-xl font-bold">TruckFull Pro</h3>
                <p className="text-[var(--text-muted-color)]">Premium</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-2xl font-bold">$29</p>
                <p className="text-[var(--text-muted-color)]">/month</p>
              </div>
            </div>
          </section>
          <section className="mb-8">
            <h2 className="text-lg font-bold mb-4">Billing</h2>
            <div className="glassmorphism rounded-2xl overflow-hidden">
              <MobileNavLink
                className="flex items-center gap-4 px-5 py-4 hover:bg-[rgba(255,0.05)] transition-colors duration-200"
                href="/@mobile/subscription_management_(owner)/billing_history"
              >
                <div className="bg-white/10 rounded-lg p-2">
                  <span className="material-symbols-outlined text-2xl">receipt_long</span>
                </div>
                <p className="flex-1">Billing History</p>
                <span className="material-symbols-outlined text-[var(--text-muted-color)]">
                  chevron_right
                </span>
              </MobileNavLink>
              <div className="border-t border-[var(--glass-border-color)]" />
              <MobileNavLink
                className="flex items-center gap-4 px-5 py-4 hover:bg-[rgba(255,255,0.05)] transition-colors duration-200"
                href="/@mobile/payment_methods"
              >
                <div className="bg-white/10 rounded-lg p-2">
                  <span className="material-symbols-outlined text-2xl">credit_card</span>
                </div>
                <p className="flex-1">Payment Methods</p>
                <span className="material-symbols-outlined text-[var(--text-muted-color)]">
                  chevron_right
                </span>
              </MobileNavLink>
            </div>
          </section>
          <section>
            <p className="text-[var(--text-muted-color)] text-center text-sm">
              Your plan renews on <span className="text-white font-medium">December 12, 2024</span>.
            </p>
          </section>
        </main>
        <footer className="mt-8">
          <div className="flex flex-col gap-4">
            <button className="w-full h-14 rounded-xl bg-[var(--primary-color)] text-white text-lg font-bold">
              Upgrade Plan
            </button>
            <button className="w-full h-14 rounded-xl glassmorphism text-white/80 font-medium">
              Cancel Subscription
            </button>
          </div>
        </footer>
      </div>
    </>
  );
}
