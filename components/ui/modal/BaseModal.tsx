'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export interface BaseModalProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: React.ReactNode;
  readonly description?: React.ReactNode;
  readonly children: React.ReactNode;
  readonly contentProps?: React.HTMLAttributes<HTMLDivElement>;
}

/**
 * BaseModal: Small, typed wrapper over shadcn/ui Dialog.
 * - Provides consistent header (title/optional description)
 * - Forwards ref to DialogContent for focus management in callers
 * - Accepts contentProps for className/onKeyDown/aria-* passthroughs
 */
export const BaseModal = React.forwardRef<HTMLDivElement, BaseModalProps>((props, ref) => {
  const { open, onClose, title, description, children, contentProps, ...rest } = props;
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent ref={ref} {...contentProps} {...rest}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description != undefined && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
});
