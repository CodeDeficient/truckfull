'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';

export interface EventData {
  id?: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  location_data: {
    address?: string;
    city?: string;
    state?: string;
  };
  vendor_fee?: number | null;
  max_vendors?: number | null;
}

interface CreateEventModalProps {
  open: boolean;
  onClose: () => void;
  onEventCreated: () => void;
  eventToEdit?: EventData | null; // Optional: If provided, mode is 'edit'
}

export function CreateEventModal({
  open,
  onClose,
  onEventCreated,
  eventToEdit,
}: CreateEventModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
    address: '',
    city: '',
    state: '',
    vendorFee: '',
    maxVendors: '',
  });

  const [initializedId, setInitializedId] = useState<string | null>(null);

  // Proper effect to handle form data initialization
  useEffect(() => {
    if (open && eventToEdit && eventToEdit.id !== initializedId) {
      setFormData({
        name: eventToEdit.name,
        description: eventToEdit.description || '',
        startDate: new Date(eventToEdit.start_date),
        endDate: new Date(eventToEdit.end_date),
        address: eventToEdit.location_data.address || '',
        city: eventToEdit.location_data.city || '',
        state: eventToEdit.location_data.state || '',
        vendorFee: eventToEdit.vendor_fee?.toString() || '',
        maxVendors: eventToEdit.max_vendors?.toString() || '',
      });
      setInitializedId(eventToEdit.id || 'new');
    } else if (open && !eventToEdit && initializedId !== null) {
      // Reset if switching to create mode
      setFormData({
        name: '',
        description: '',
        startDate: undefined,
        endDate: undefined,
        address: '',
        city: '',
        state: '',
        vendorFee: '',
        maxVendors: '',
      });
      setInitializedId(null);
    }
  }, [eventToEdit, open, initializedId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic validation
    if (
      !formData.name ||
      !formData.startDate ||
      !formData.endDate ||
      !formData.city ||
      !formData.state
    ) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.endDate < formData.startDate) {
      setError('End date cannot be before start date');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        name: formData.name,
        description: formData.description,
        start_date: formData.startDate.toISOString(),
        end_date: formData.endDate.toISOString(),
        location_data: {
          address: formData.address,
          city: formData.city,
          state: formData.state,
        },
        vendor_fee: formData.vendorFee ? Number.parseFloat(formData.vendorFee) : null,
        max_vendors: formData.maxVendors ? Number.parseInt(formData.maxVendors) : null,
      };

      const url = eventToEdit?.id ? `/api/events/${eventToEdit.id}` : '/api/events';
      const method = eventToEdit?.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        // Fallback for PUT if not implemented yet, but we will add it.
        const data = await response.json();
        throw new Error(data.error || 'Failed to save event');
      }

      onEventCreated();
      onClose();
      // Reset form handled by parent closing/reopening or state logic above
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : 'Failed to save event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{eventToEdit ? 'Edit Event' : 'Create New Event'}</DialogTitle>
          <DialogDescription>
            {eventToEdit
              ? 'Update your event details.'
              : 'Host your own event and invite other food trucks.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Event Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Downtown Food Truck Festival"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your event..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !formData.startDate && 'text-muted-foreground',
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.startDate ? (
                      format(formData.startDate, 'PPP')
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.startDate}
                    onSelect={(date) => setFormData({ ...formData, startDate: date })}
                    initialFocus
                    className="rounded-md border shadow pointer-events-auto"
                    classNames={{
                      day_selected:
                        'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
                      day_today: 'bg-accent text-accent-foreground',
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !formData.endDate && 'text-muted-foreground',
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.endDate ? format(formData.endDate, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.endDate}
                    onSelect={(date) => setFormData({ ...formData, endDate: date })}
                    initialFocus
                    disabled={(date) => !!formData.startDate && date < formData.startDate}
                    className="rounded-md border shadow pointer-events-auto"
                    classNames={{
                      day_selected:
                        'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
                      day_today: 'bg-accent text-accent-foreground',
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Location</Label>
            <Input
              placeholder="Address / Venue Name"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="mb-2"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="City *"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                required
              />
              <Input
                placeholder="State *"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vendorFee">Vendor Fee ($)</Label>
              <Input
                id="vendorFee"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={formData.vendorFee}
                onChange={(e) => setFormData({ ...formData, vendorFee: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxVendors">Max Vendors</Label>
              <Input
                id="maxVendors"
                type="number"
                min="1"
                placeholder="Unlimited"
                value={formData.maxVendors}
                onChange={(e) => setFormData({ ...formData, maxVendors: e.target.value })}
              />
            </div>
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">{error}</div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {eventToEdit ? 'Save Changes' : 'Create Event'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
