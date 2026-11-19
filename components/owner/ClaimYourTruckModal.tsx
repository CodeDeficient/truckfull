'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, MapPin, CheckCircle, Truck, Send } from 'lucide-react';

interface ClaimYourTruckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToMap?: () => void;
}

export function ClaimYourTruckModal({ isOpen, onClose, onGoToMap }: ClaimYourTruckModalProps) {
  const [formData, setFormData] = useState({
    truckName: '',
    cityState: '',
    email: '',
    socialMedia: '',
    website: '',
    ownerName: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const subject = encodeURIComponent(`New Truck Listing Request - ${formData.truckName}`);
    const body = encodeURIComponent(
      `
Truck Name: ${formData.truckName}
City/State: ${formData.cityState}
Email: ${formData.email}
Social Media: ${formData.socialMedia}
Website: ${formData.website}
Owner Name: ${formData.ownerName || 'Not provided'}
    `.trim(),
    );

    globalThis.location.href = `mailto:support@truckfull.food?subject=${subject}&body=${body}`;

    setIsSubmitting(false);
    setSubmitted(true);
  };

  const handleGoToMap = () => {
    onClose();
    if (onGoToMap) {
      onGoToMap();
    } else {
      // Default: navigate to home/map
      globalThis.location.href = '/';
    }
  };

  const resetForm = () => {
    setFormData({
      truckName: '',
      cityState: '',
      email: '',
      socialMedia: '',
      website: '',
      ownerName: '',
    });
    setSubmitted(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const isFormValid =
    formData.truckName &&
    formData.cityState &&
    formData.email &&
    formData.socialMedia &&
    formData.website;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-gray-900 border-gray-700 w-[calc(100%-2rem)] rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Truck className="size-5 text-red-500" />
            Claim Your Truck
          </DialogTitle>
          <DialogDescription>
            Own a food truck? Claim it or add it to TruckFull for free.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="find" className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="find" className="gap-1 text-xs">
              <Search className="size-3" />
              Find My Truck
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-1 text-xs">
              <Truck className="size-3" />
              List My Truck
            </TabsTrigger>
          </TabsList>

          {/* Find My Truck Tab */}
          <TabsContent value="find" className="mt-4 space-y-4">
            <div className="space-y-4 text-sm">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 text-xs font-bold">
                  1
                </div>
                <div>
                  <p className="font-medium text-white">Search for your truck on the map</p>
                  <p className="text-gray-400 text-xs mt-1">
                    Use the search bar to find your food truck by name.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 text-xs font-bold">
                  2
                </div>
                <div>
                  <p className="font-medium text-white">Click on your truck</p>
                  <p className="text-gray-400 text-xs mt-1">Open the popup to see truck details.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 text-xs font-bold">
                  3
                </div>
                <div>
                    <p className="font-medium text-white">Click "Claim it now"</p>
                    <p className="text-gray-400 text-xs mt-1">
                      Log in or create an account, then verify ownership via email.
                    </p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleGoToMap}
              className="w-full bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600"
            >
              <MapPin className="mr-2 size-4" />
              Go to Map & Search
            </Button>
          </TabsContent>

          {/* List My Truck Tab */}
          <TabsContent value="list" className="mt-4 space-y-4">
            {submitted ? (
              <Alert className="bg-green-500/10 border-green-500/20">
                <CheckCircle className="size-4 text-green-500" />
                <AlertDescription className="text-green-400 text-sm">
                  Your email client should have opened. If not, email us at{' '}
                  <a href="mailto:support@truckfull.food" className="underline">
                    support@truckfull.food
                  </a>
                </AlertDescription>
              </Alert>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="modal-truckName" className="text-white text-sm">
                    Truck Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="modal-truckName"
                    placeholder="e.g., Sample BBQ Co"
                    value={formData.truckName}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, truckName: e.target.value }))
                    }
                    required
                    className="bg-gray-700/50 border-gray-600 h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="modal-cityState" className="text-white text-sm">
                    City / State <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="modal-cityState"
                    placeholder="e.g., Augusta, GA"
                    value={formData.cityState}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, cityState: e.target.value }))
                    }
                    required
                    className="bg-gray-700/50 border-gray-600 h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="modal-email" className="text-white text-sm">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="modal-email"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    required
                    className="bg-gray-700/50 border-gray-600 h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="modal-socialMedia" className="text-white text-sm">
                    Facebook or Instagram <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="modal-socialMedia"
                    placeholder="e.g., facebook.com/samplebbqtruck"
                    value={formData.socialMedia}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, socialMedia: e.target.value }))
                    }
                    required
                    className="bg-gray-700/50 border-gray-600 h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="modal-website" className="text-white text-sm">
                    Website <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="modal-website"
                    placeholder="e.g., samplebbq.example.com"
                    value={formData.website}
                    onChange={(e) => setFormData((prev) => ({ ...prev, website: e.target.value }))}
                    required
                    className="bg-gray-700/50 border-gray-600 h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="modal-ownerName" className="text-gray-400 text-sm">
                    Your Name (optional)
                  </Label>
                  <Input
                    id="modal-ownerName"
                    placeholder="e.g., Joe Smith"
                    value={formData.ownerName}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, ownerName: e.target.value }))
                    }
                    className="bg-gray-700/50 border-gray-600 h-9"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600"
                  disabled={!isFormValid || isSubmitting}
                >
                  <Send className="mr-2 size-4" />
                  {isSubmitting ? 'Sending...' : 'Submit Request'}
                </Button>

                <p className="text-xs text-gray-500 text-center">
                  We'll review and add your truck within 24-48 hours.
                </p>
              </form>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
