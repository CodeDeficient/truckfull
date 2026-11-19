import React from 'react';

export const Dialog = ({ children, ...props }: any) => (
  <div data-testid="Dialog" {...props}>
    {children}
  </div>
);
export const DialogTrigger = ({ children, ...props }: any) => (
  <div data-testid="DialogTrigger" {...props}>
    {children}
  </div>
);
export const DialogContent = ({ children, ...props }: any) => (
  <div data-testid="DialogContent" {...props}>
    {children}
  </div>
);
export const DialogHeader = ({ children, ...props }: any) => (
  <div data-testid="DialogHeader" {...props}>
    {children}
  </div>
);
export const DialogTitle = ({ children, ...props }: any) => (
  <h2 data-testid="DialogTitle" {...props}>
    {children}
  </h2>
);
export const DialogDescription = ({ children, ...props }: any) => (
  <p data-testid="DialogDescription" {...props}>
    {children}
  </p>
);
export const DialogClose = ({ children, ...props }: any) => (
  <button data-testid="DialogClose" {...props}>
    {children || 'Close'}
  </button>
);
export const DialogFooter = ({ children, ...props }: any) => (
  <div data-testid="DialogFooter" {...props}>
    {children}
  </div>
);
