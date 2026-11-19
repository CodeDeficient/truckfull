import React from 'react';

interface SettingsSectionProps {
  readonly title: string;
  readonly children: React.ReactNode;
}

const SettingsSection = ({ title, children }: SettingsSectionProps) => (
  <div className="mb-8">
    <h2 className="text-lg font-semibold text-white mb-4">{title}</h2>
    <div className="space-y-3">{children}</div>
  </div>
);

interface SettingsItemProps {
  readonly icon?: string;
  readonly label: string;
  readonly value?: string;
  readonly hasToggle?: boolean;
  readonly hasArrow?: boolean;
}

const SettingsItem = ({
  icon,
  label,
  value,
  hasToggle = false,
  hasArrow = false,
}: SettingsItemProps) => (
  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg backdrop-blur-sm">
    <div className="flex items-center gap-3">
      {icon && <span className="material-symbols-outlined text-white/70">{icon}</span>}
      <span className="text-white">{label}</span>
    </div>
    <div className="flex items-center gap-2">
      {value && <span className="text-white/60 text-sm">{value}</span>}
      {hasToggle && (
        <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-white/20">
          <div className="inline-block h-4 w-4 transform rounded-full bg-white transition translate-x-1" />
        </div>
      )}
      {hasArrow && <span className="material-symbols-outlined text-white/50">chevron_right</span>}
    </div>
  </div>
);

export default function SettingsContent() {
  return (
    <div className="p-4 pt-6">
      <SettingsSection title="Account">
        <SettingsItem icon="person" label="Profile Information" hasArrow />
        <SettingsItem icon="lock" label="Security" hasArrow />
      </SettingsSection>

      <SettingsSection title="Preferences">
        <SettingsItem icon="palette" label="Appearance" value="Dark" hasArrow />
        <SettingsItem icon="language" label="Language" value="English" hasArrow />
        <SettingsItem icon="location_on" label="Location" value="San Francisco" hasArrow />
      </SettingsSection>

      <SettingsSection title="Privacy">
        <SettingsItem label="Data Collection" hasToggle />
        <SettingsItem label="Location Tracking" hasToggle />
        <SettingsItem label="Personalized Ads" hasToggle />
      </SettingsSection>

      <SettingsSection title="Support">
        <SettingsItem icon="help" label="Help Center" hasArrow />
        <SettingsItem icon="feedback" label="Send Feedback" hasArrow />
        <SettingsItem icon="info" label="About" hasArrow />
      </SettingsSection>

      <div className="mt-8">
        <button className="w-full py-3 text-center text-red-500 font-medium bg-white/5 rounded-lg backdrop-blur-sm min-h-12">
          Sign Out
        </button>
      </div>
    </div>
  );
}
