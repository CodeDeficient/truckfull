'use client';

/**
 * Payment Acknowledgment Component
 * WBS: 6.5.5
 *
 * Legal disclaimer about payment being handled directly.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, CreditCard } from 'lucide-react';

interface PaymentAcknowledgmentProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  vendorFee: number;
  variant?: 'card' | 'inline';
}

export function PaymentAcknowledgment({
  checked,
  onChange,
  vendorFee,
  variant = 'inline',
}: PaymentAcknowledgmentProps) {
  const content = (
    <div className="space-y-3">
      <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
        <div className="text-sm">
          <p className="font-medium text-amber-800">Payment Handled Directly</p>
          <p className="text-amber-700 mt-1">
            This event has a <strong>${vendorFee}</strong> vendor fee. Payment is handled directly
            between you and the event organizer. TruckFull does not process, hold, or guarantee any
            payments.
          </p>
        </div>
      </div>

      <div className="flex items-start space-x-3">
        <Checkbox
          id="payment-acknowledgment"
          checked={checked}
          onCheckedChange={(c) => onChange(c === true)}
          className="mt-0.5"
        />
        <label htmlFor="payment-acknowledgment" className="text-sm cursor-pointer leading-snug">
          I understand that payment for this event is handled directly between me and the organizer.
          TruckFull is not responsible for payment disputes, refunds, or non-payment.
        </label>
      </div>
    </div>
  );

  if (variant === 'card') {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Payment Disclaimer
          </CardTitle>
          <CardDescription>Please review and acknowledge the payment terms</CardDescription>
        </CardHeader>
        <CardContent>{content}</CardContent>
      </Card>
    );
  }

  return content;
}
