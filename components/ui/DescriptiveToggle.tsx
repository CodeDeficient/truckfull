'use client';

import * as React from 'react';
import { Toggle } from '@/components/ui/toggle';

interface DescriptiveToggleProps {
  readonly label: string;
  readonly description: string;
  readonly checked: boolean;
  readonly onCheckedChange: (checked: boolean) => void;
}

export function DescriptiveToggle({
  label,
  description,
  checked,
  onCheckedChange,
}: DescriptiveToggleProps) {
  const [pressed, setPressed] = React.useState(checked);

  React.useEffect(() => {
    setPressed(checked);
  }, [checked]);

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-col">
        <p className="font-medium text-white">{label}</p>
        <p className="text-sm text-white/50">{description}</p>
      </div>
      <Toggle
        pressed={pressed}
        onPressedChange={(pressed) => {
          setPressed(pressed);
          onCheckedChange(pressed);
        }}
      />
    </div>
  );
}
