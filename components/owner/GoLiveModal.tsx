'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { FoodTruckDomain } from '@/lib/types';
import { logError } from '@/lib/logging';

interface GoLiveModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onConfirm: (truckId: string) => Promise<void>;
  readonly trucks: FoodTruckDomain[];
  readonly initialTruckId?: string; // Pre-select a specific truck (for multi-truck owners)
}

export default function GoLiveModal({
  isOpen,
  onClose,
  onConfirm,
  trucks,
  initialTruckId,
}: GoLiveModalProps) {
  const [selectedTruckId, setSelectedTruckId] = useState<string>(initialTruckId || '');
  const [isConfirming, setIsConfirming] = useState(false);

  const hasMultipleTrucks = trucks.length > 1;

  // Auto-select the only truck if there's just one, or use initialTruckId
  if (trucks.length === 1 && !selectedTruckId) {
    setSelectedTruckId(trucks[0].id);
  }

  const handleConfirm = async () => {
    if (!selectedTruckId) return;

    setIsConfirming(true);
    try {
      await onConfirm(selectedTruckId);
      onClose();
    } catch (error) {
      logError('Error confirming Go Live:', error);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleTruckChange = (value: string) => {
    setSelectedTruckId(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Go Live</DialogTitle>
          <DialogDescription>
            {hasMultipleTrucks
              ? 'Select which truck you want to take live.'
              : 'Are you sure you want to take your truck live?'}
          </DialogDescription>
        </DialogHeader>

        {hasMultipleTrucks && (
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="truck-select" className="text-right font-medium">
                Truck:
              </label>
              <div className="col-span-3">
                <Select value={selectedTruckId} onValueChange={handleTruckChange}>
                  <SelectTrigger id="truck-select">
                    <SelectValue placeholder="Select a truck" />
                  </SelectTrigger>
                  <SelectContent>
                    {trucks.map((truck) => (
                      <SelectItem key={truck.id} value={truck.id}>
                        {truck.name || `Truck ${truck.id.slice(0, 8)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isConfirming}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleConfirm()}
            disabled={isConfirming || (hasMultipleTrucks && !selectedTruckId)}
          >
            {isConfirming ? 'Confirming...' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
