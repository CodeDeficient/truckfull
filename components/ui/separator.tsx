'use client';

import * as React from 'react';
import * as SeparatorPrimitive from '@radix-ui/react-separator';

// Minimal, type-safe Separator wrapper without utility deps

type PrimitiveProps = React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>;
type PrimitiveRef = React.ComponentRef<typeof SeparatorPrimitive.Root>;

type SeparatorProps = Omit<PrimitiveProps, 'className' | 'orientation' | 'decorative'> & {
  className?: string;
  orientation?: 'horizontal' | 'vertical';
  decorative?: boolean;
};

const Separator = React.forwardRef<PrimitiveRef, SeparatorProps>(
  ({ className, orientation = 'horizontal', decorative = true, ...props }, ref) => {
    const base = 'shrink-0 bg-border';
    const orient = orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]';
    const extra = typeof className === 'string' && className.length > 0 ? className : '';
    const parts: string[] = [base, orient];
    if (extra.length > 0) parts.push(extra);
    const computed = parts.join(' ');
    const rest = props as PrimitiveProps;

    return (
      <SeparatorPrimitive.Root
        ref={ref}
        decorative={Boolean(decorative)}
        orientation={orientation as 'horizontal' | 'vertical'}
        className={computed}
        {...rest}
      />
    );
  },
);
Separator.displayName = 'Separator';

export { Separator };
