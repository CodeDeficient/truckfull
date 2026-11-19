'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';

export interface ResponsiveDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly title?: React.ReactNode;
  readonly description?: React.ReactNode;
  readonly children: React.ReactNode;
  readonly footer?: React.ReactNode;
  readonly className?: string;
  readonly contentClassName?: string;
  readonly headerClassName?: string;
  readonly footerClassName?: string;
}

export const ResponsiveDialog = React.forwardRef<HTMLDivElement, ResponsiveDialogProps>(
  (
    {
      open,
      onOpenChange,
      title,
      description,
      children,
      footer,
      className,
      contentClassName,
      headerClassName,
      footerClassName,
    },
    ref,
  ) => {
    const isMobile = useMediaQuery('(max-width: 768px)');

    if (isMobile) {
      return (
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent
            side="bottom"
            className={cn('flex flex-col h-[90vh]', contentClassName)}
            ref={ref}
          >
            {(title || description) && (
              <SheetHeader className={headerClassName}>
                {title && <SheetTitle>{title}</SheetTitle>}
                {description && <SheetDescription>{description}</SheetDescription>}
              </SheetHeader>
            )}
            <div className="flex-1 overflow-y-auto">{children}</div>
            {footer && <SheetFooter className={footerClassName}>{footer}</SheetFooter>}
          </SheetContent>
        </Sheet>
      );
    }

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={className} ref={ref}>
          {(title || description) && (
            <DialogHeader className={headerClassName}>
              {title && <DialogTitle>{title}</DialogTitle>}
              {description && <DialogDescription>{description}</DialogDescription>}
            </DialogHeader>
          )}
          <div className={cn('flex-1', !footer && 'mt-2')}>{children}</div>
          {footer && <DialogFooter className={footerClassName}>{footer}</DialogFooter>}
        </DialogContent>
      </Dialog>
    );
  },
);

ResponsiveDialog.displayName = 'ResponsiveDialog';
