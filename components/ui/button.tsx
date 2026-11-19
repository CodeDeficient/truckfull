import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { tv, type VariantProps } from 'tailwind-variants';

import { cn } from '@/lib/utils';

const buttonVariants = tv({
  base: 'inline-flex items-center justify-center rounded-modern text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  variants: {
    variant: {
      default:
        'bg-primary text-primary-foreground hover:bg-primary/90',
      destructive:
        'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      outline:
        'border border-input bg-background/50 hover:bg-accent hover:text-accent-foreground',
      secondary: 'glass text-secondary-foreground hover:bg-accent',
      ghost: 'hover:bg-accent hover:text-accent-foreground',
      link: 'text-primary underline-offset-4 hover:underline',
      neon: 'neon-border bg-background/20 text-primary hover:bg-primary/10',
    },
    size: {
      default: 'h-10 px-4 py-2', // 40px height - for desktop
      sm: 'h-9 rounded-md px-3', // 36px height - for desktop
      lg: 'h-11 rounded-md px-8', // 44px height - for desktop
      icon: 'h-10 w-10', // 40px x 40px - for desktop
      // Mobile accessibility compliant sizes (48px minimum touch target)
      mobile: 'h-12 px-4 py-2', // 48px height - minimum accessibility size for mobile
      'mobile-lg': 'h-14 rounded-md px-6', // 56px height - larger mobile button
      'mobile-icon': 'h-12 w-12', // 48px x 48px - minimum accessibility size for mobile icons
      'mobile-icon-lg': 'h-14 w-14', // 56px x 56px - larger mobile icon button
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    let Component: React.ElementType = 'button';
    if (asChild) {
      Component = Slot as React.ElementType;
    }

    return (
      <Component
        className={cn(buttonVariants({ variant, size, className }), className)}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button };
