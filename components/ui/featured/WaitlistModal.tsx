'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { logError } from '@/lib/logging';

interface WaitlistModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  /** Waitlist audience; named to avoid the ARIA `role` attribute connotation. */
  readonly waitlistRole: 'foodie' | 'truck_owner' | 'event_manager';
  readonly title: string;
  readonly description: string;
  /** Called after a successful waitlist submission, after the modal closes. */
  readonly onSubmitted?: () => void;
}

export function WaitlistModal({
  isOpen,
  onClose,
  waitlistRole,
  title,
  description,
  onSubmitted,
}: WaitlistModalProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) return;

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/events/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role: waitlistRole }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join waitlist');
      }

      setEmail('');
      setIsSubmitting(false);
      onClose();
      toast.success('Successfully joined the waitlist!');
      // Outside the try: a throwing analytics callback must not turn a
      // successful submission into an error toast.
      try {
        onSubmitted?.();
      } catch (callbackError) {
        logError('WaitlistModal onSubmitted callback failed:', callbackError);
      }
      return;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] bg-[#1a1b1e] text-white border-white/20 p-3 gap-3">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="text-gray-400">{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-2 pt-0">
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-500"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : (
                'Join Waitlist'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="w-full border-white/10 hover:bg-white/10 text-gray-300 hover:text-white bg-transparent"
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
