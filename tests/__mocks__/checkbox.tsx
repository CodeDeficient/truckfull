import React from 'react';

export const Checkbox = (props: any) => (
  <input
    type="checkbox"
    data-testid="Checkbox"
    checked={props.checked}
    onChange={(e) => props.onCheckedChange?.(e.target.checked)}
    {...props}
  />
);