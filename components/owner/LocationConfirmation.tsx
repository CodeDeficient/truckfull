'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Facebook, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import type { ExtractedLocation } from './LocationHistory';

interface Location {
  lat?: number;
  lng?: number;
  address?: string;
  fuzzy?: boolean;
}

interface LocationConfirmationProps {
  readonly truckId: string;
  readonly extractedLocation: ExtractedLocation;
  readonly onConfirm: (location: Location) => void;
  readonly onReject: () => void;
  readonly isOpen?: boolean;
  readonly onClose?: () => void;
}

export function LocationConfirmation({
  truckId: _truckId,
  extractedLocation,
  onConfirm,
  onReject,
  isOpen = true,
  onClose,
}: LocationConfirmationProps) {
  const [address, setAddress] = useState(extractedLocation.address || '');
  const [city, setCity] = useState(extractedLocation.city || '');
  const [state, setState] = useState(extractedLocation.state || '');
  const [fuzzy, setFuzzy] = useState(extractedLocation.fuzzy || false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const confidenceLevel =
    extractedLocation.confidence >= 0.9
      ? 'high'
      : extractedLocation.confidence >= 0.7
        ? 'medium'
        : 'low';

  function handleConfirm() {
    if (!address && !city && !state) {
      return;
    }

    setIsSubmitting(true);

    const fullAddress = [address, city, state].filter(Boolean).join(', ');
    const confirmedLocation: Location = {
      address: fullAddress,
      fuzzy,
    };

    onConfirm(confirmedLocation);
  }

  function handleReject() {
    setIsSubmitting(true);
    onReject();
  }

  function handleDialogClose(open: boolean) {
    if (!open && onClose) {
      onClose();
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Confirm Location</DialogTitle>
          <DialogDescription>
            Review and edit the AI-extracted location from your Facebook post
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {confidenceLevel === 'low' && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Low confidence location. Please verify and edit before confirming.
              </AlertDescription>
            </Alert>
          )}

          <div className="rounded-lg border bg-muted/50 p-4">
            <p className="text-sm font-medium">Extracted from Facebook post:</p>
            <p className="mt-1 text-sm text-muted-foreground">{extractedLocation.raw_text}</p>
            <div className="mt-2 flex items-center gap-2">
              <Facebook className="h-4 w-4 text-blue-600" />
              <Badge variant="outline" className="text-xs">
                Post ID: {extractedLocation.sourcePostId}
              </Badge>
              <Badge
                variant={
                  confidenceLevel === 'high'
                    ? 'default'
                    : confidenceLevel === 'medium'
                      ? 'secondary'
                      : 'destructive'
                }
              >
                {Math.round(extractedLocation.confidence * 100)}% confidence
              </Badge>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                placeholder="123 Main St"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="Augusta"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  placeholder="GA"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="fuzzy" className="text-sm font-medium">
                  Fuzzy Location
                </Label>
                <p className="text-xs text-muted-foreground">
                  Mark as approximate location (e.g., "near downtown")
                </p>
              </div>
              <Switch id="fuzzy" checked={fuzzy} onCheckedChange={setFuzzy} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleReject} disabled={isSubmitting}>
            <XCircle className="mr-2 h-4 w-4" />
            Reject
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={isSubmitting || !address}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
