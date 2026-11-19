'use client';

/**
 * Create Event Form
 * WBS: 6.3.2
 *
 * Form for organizers to create new events.
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle } from 'lucide-react';

export interface EventData {
  id?: string;
  name: string;
  description: string;
  location_data: {
    lat?: number;
    lng?: number;
    address?: string;
    city?: string;
    state?: string;
    show_fuzzy?: boolean;
  };
  start_date: string;
  end_date: string;
  vendor_fee: number | null;
  max_vendors: number | null;
  requirements?: string | null;
}

interface CreateEventFormProps {
  onSuccess: () => void;
  initialData?: EventData;
}

export function CreateEventForm({ onSuccess, initialData }: CreateEventFormProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    address: initialData?.location_data?.address || '',
    city: initialData?.location_data?.city || '',
    state: initialData?.location_data?.state || '',
    showFuzzyLocation: initialData?.location_data?.show_fuzzy || false,
    startDate: initialData?.start_date
      ? new Date(initialData.start_date).toISOString().slice(0, 16)
      : '',
    endDate: initialData?.end_date ? new Date(initialData.end_date).toISOString().slice(0, 16) : '',
    vendorFee: initialData?.vendor_fee?.toString() || '',
    maxVendors: initialData?.max_vendors?.toString() || '',
    requirements: initialData?.requirements || '',
  });

  const updateField = (
    field: string,
    value:
      | string
      | number
      | boolean
      | Date
      | {
          lat?: number;
          lng?: number;
          address?: string;
          city?: string;
          state?: string;
          show_fuzzy?: boolean;
        },
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // Placeholder geocoding
      const locationData = {
        lat: 33.47,
        lng: -82.01,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        show_fuzzy: formData.showFuzzyLocation,
      };

      const payload = {
        name: formData.name,
        description: formData.description,
        location_data: locationData,
        start_date: new Date(formData.startDate).toISOString(),
        end_date: new Date(formData.endDate).toISOString(),
        vendor_fee: formData.vendorFee ? Number.parseFloat(formData.vendorFee) : null,
        max_vendors: formData.maxVendors ? Number.parseInt(formData.maxVendors) : null,
        requirements: formData.requirements || null,
      };

      const url = initialData?.id
        ? `/api/organizer/events/${initialData.id}`
        : '/api/organizer/events';

      const method = initialData?.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save event');
      }

      onSuccess();
    } catch (error_) {
      const errorMessage = error_ instanceof Error ? error_.message : 'Failed to save event';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => setStep((s) => s + 1);
  const prevStep = () => setStep((s) => s - 1);

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle>{initialData ? 'Edit Event' : 'Create New Event'}</CardTitle>
        <CardDescription>Step {step} of 3</CardDescription>
        {/* Progress Bar */}
        <div className="w-full bg-secondary h-2 rounded-full mt-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-lg font-semibold">Event Details</h3>
            <div className="space-y-2">
              <Label>Event Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Augusta Food Truck Festival"
              />
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Describe your event..."
                rows={4}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-lg font-semibold">Time & Place</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Input
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={(e) => updateField('startDate', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date *</Label>
                <Input
                  type="datetime-local"
                  value={formData.endDate}
                  onChange={(e) => updateField('endDate', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Street Address</Label>
              <Input
                value={formData.address}
                onChange={(e) => updateField('address', e.target.value)}
                placeholder="123 Main St"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>City *</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => updateField('city', e.target.value)}
                  placeholder="Augusta"
                />
              </div>
              <div className="space-y-2">
                <Label>State *</Label>
                <Input
                  value={formData.state}
                  onChange={(e) => updateField('state', e.target.value)}
                  placeholder="GA"
                  maxLength={2}
                />
              </div>
            </div>
            <div className="flex items-center justify-between border p-3 rounded-lg">
              <div className="space-y-0.5">
                <Label>Fuzzy Location?</Label>
                <p className="text-xs text-muted-foreground">Hide exact address publicly</p>
              </div>
              <Switch
                checked={formData.showFuzzyLocation}
                onCheckedChange={(checked) => updateField('showFuzzyLocation', checked)}
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-lg font-semibold">Rules & Vendors</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vendor Fee ($)</Label>
                <Input
                  type="number"
                  value={formData.vendorFee}
                  onChange={(e) => updateField('vendorFee', e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Max Vendors</Label>
                <Input
                  type="number"
                  value={formData.maxVendors}
                  onChange={(e) => updateField('maxVendors', e.target.value)}
                  placeholder="Unlimited"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Requirements / Rules</Label>
              <Textarea
                value={formData.requirements}
                onChange={(e) => updateField('requirements', e.target.value)}
                placeholder="e.g. Must have general liability insurance, No generators allowed..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                These will be displayed to vendors before they apply.
              </p>
            </div>
            {formData.vendorFee && Number(formData.vendorFee) > 0 && (
              <Alert className="bg-amber-50 border-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <AlertDescription className="text-amber-800 text-xs">
                  Paid events require identity verification.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={step === 1 || loading}
            type="button"
          >
            Back
          </Button>
          {step < 3 ? (
            <Button onClick={nextStep} type="button">
              Next
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />{' '}
                  {initialData ? 'Saving...' : 'Creating...'}
                </>
              ) : initialData ? (
                'Save Changes'
              ) : (
                'Create Event'
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
