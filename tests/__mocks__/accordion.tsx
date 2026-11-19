import React from 'react';

export const Accordion = ({ children, ...props }: any) => (
  <div data-testid="Accordion" {...props}>
    {children}
  </div>
);
export const AccordionItem = ({ children, ...props }: any) => (
  <div data-testid="AccordionItem" {...props}>
    {children}
  </div>
);
export const AccordionTrigger = ({ children, ...props }: any) => (
  <button data-testid="AccordionTrigger" {...props}>
    {children}
  </button>
);
export const AccordionContent = ({ children, ...props }: any) => (
  <div data-testid="AccordionContent" {...props}>
    {children}
  </div>
);
