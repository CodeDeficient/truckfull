'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mail, HelpCircle, Copy, Check } from 'lucide-react';

interface SupportModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly subject?: string;
}

export function SupportModal({ isOpen, onClose, subject = 'Support Request' }: SupportModalProps) {
  const [copied, setCopied] = useState(false);
  const email = 'support@truckfull.food';
  const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}`;

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = email;
      document.body.append(textArea);
      textArea.select();
      document.execCommand('copy');
      textArea.remove();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="size-5 text-primary" />
            Need Help?
          </DialogTitle>
          <DialogDescription>
            Have a question or running into an issue? Send us an email and we'll get right back to
            you!
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="text-sm text-muted-foreground">
              Our support team typically responds within 24-48 hours. For urgent matters, please
              include "URGENT" in your subject line.
            </p>
          </div>

          {/* Primary: Open email client */}
          <a
            href={mailtoLink}
            onClick={(e) => {
              e.stopPropagation();
              window.open(mailtoLink, '_self');
            }}
            className="flex items-center justify-center w-full px-4 py-2 rounded-md text-white font-medium bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 transition-colors"
          >
            <Mail className="mr-2 size-4" />
            Open Email Client
          </a>

          {/* Fallback: Copy email */}
          <Button
            variant="outline"
            onClick={() => {
              void handleCopyEmail();
            }}
            className="w-full"
          >
            {copied ? (
              <>
                <Check className="mr-2 size-4 text-green-500" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="mr-2 size-4" />
                Copy Email Address
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">{email}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook for easy modal management
export function useSupportModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [subject, setSubject] = useState('Support Request');

  const open = (customSubject?: string) => {
    if (customSubject) setSubject(customSubject);
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setSubject('Support Request');
  };

  return { isOpen, subject, open, close };
}
