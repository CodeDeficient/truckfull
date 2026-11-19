import React from 'react';

export const Switch = ({ checked, onCheckedChange, className }: any) => (
  <input
    type="checkbox"
    checked={checked}
    onChange={(e) => onCheckedChange?.(e.target.checked)}
    className={className}
    data-testid="Switch"
  />
);
