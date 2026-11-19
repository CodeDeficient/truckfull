import React from 'react';

export const ScrollArea = ({ children, className }: any) => (
  <div data-testid="ScrollArea" className={className}>
    {children}
  </div>
);

export const ScrollBar = ({ className }: any) => (
  <div data-testid="ScrollBar" className={className} />
);
