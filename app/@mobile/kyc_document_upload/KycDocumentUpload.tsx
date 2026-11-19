'use client';

import React from 'react';
import { useIsClient } from '@/hooks/useIsClient';
import DocumentUpload from '@/components/mobile/DocumentUpload';

export default function Kyc_document_upload() {
  const isClient = useIsClient();

  return (
    <>
      {isClient && (
        <>
          <meta charSet="utf-8" />
          <title>TruckFull - KYC</title>
          <link href="data:image/x-icon;base64," rel="icon" type="image/x-icon" />
        </>
      )}
      <style type="text/tailwindcss">{`
      :root {
        --primary-red: #ea2a2a;
        --background-black: #121212;
        --glass-bg: rgba(255, 255, 255, 0.05);
        --glass-border: rgba(255, 255, 255, 0.1);
      }
      .glassmorphism {
        background: var(--glass-bg);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid var(--glass-border);
      }
    `}</style>
      <style>{`
    body {
      min-height: max(884px, 100dvh);
    }
  `}</style>

      <div
        className="relative flex size-full min-h-screen flex-col bg-[var(--background-black)] text-white dark justify-between group/design-root overflow-x-hidden"
       
      >
        <div className="flex-grow">
          <header className="flex items-center p-4">
            <button className="text-white">
              <span className="material-symbols-outlined text-3xl">arrow_back_ios_new</span>
            </button>
            <h1 className="text-xl font-bold flex-1 text-center pr-8">Verify Your Identity</h1>
          </header>
          <main className="px-4 py-6">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold leading-tight tracking-tight">
                Securely Upload Documents
              </h2>
              <p className="text-gray-400 text-base font-normal leading-normal mt-2">
                To ensure community safety, we need to verify your identity. Please upload clear
                images.
              </p>
            </div>
            <div className="space-y-8">
              <DocumentUpload title="Driver's License" />
              <DocumentUpload title="Business License" />
            </div>
          </main>
        </div>
        <footer
          className="p-4 sticky bottom-0 bg-[var(--background-black)]/80 backdrop-blur-sm"
          style={{ touchAction: 'none' }}
        >
          <button className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 px-5 bg-[var(--primary-red)] text-white text-lg font-bold leading-normal tracking-[0.015em] hover:opacity-90 transition-opacity">
            <span className="truncate">Submit Documents</span>
          </button>
        </footer>
      </div>
    </>
  );
}
