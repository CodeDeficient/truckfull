import React from 'react';

export const Alert = ({ children, ...props }: any) => (
  <div data-testid="Alert" {...props}>
    {children}
  </div>
);
export const AlertDescription = ({ children, ...props }: any) => (
  <div data-testid="AlertDescription" {...props}>
    {children}
  </div>
);
