import React from 'react';
import SettingsHeader from './_components/SettingsHeader';
import SettingsNavigationBar from './_components/SettingsNavigationBar';
import SettingsBottomNavigation from './_components/SettingsBottomNavigation';
import SettingsContent from './_components/SettingsContent';

export default function App_settings() {
  return (
    <>
      <meta charSet="utf-8" />
      <meta content="width=device-width, initial-scale=1.0" name="viewport" />
      <title>TruckFull - Settings</title>
      <style type="text/tailwindcss">{`
    :root {
      --primary-500: #ea2a2a;
      --background: #101010;
      --surface-1: #1C1C1E;
      --surface-2: rgba(255, 255, 255, 0.05);
      --text-primary: #FFFFFF;
      --text-secondary: #A0A0A0;
    }
    .glassmorphism {
      background: var(--surface-2);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
  `}</style>

      <div className="relative flex size-full min-h-screen flex-col bg-[var(--background)] dark justify-between group/design-root overflow-x-hidden">
        <SettingsHeader />
        <SettingsNavigationBar />

        <SettingsContent />

        <SettingsBottomNavigation />
      </div>
    </>
  );
}
