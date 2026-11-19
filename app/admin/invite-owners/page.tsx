'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, Send, Truck, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface TruckResult {
  id: string;
  name: string;
  cuisine_type: string | null;
  city: string | null;
  state: string | null;
  contact_info: { email?: string } | null;
  pending_invite?: { email: string; expires_at: string } | null;
}

// Email preview component that matches the actual Resend template
function EmailPreview({
  truckName,
  cuisineType,
  location,
}: {
  truckName?: string;
  cuisineType?: string;
  location?: string;
}) {
  return (
    <div className="border rounded-lg overflow-hidden bg-[#f4f4f5]">
      {/* Header - Pure black */}
      <div className="bg-black p-6 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/truckfull-icon.png"
          alt="TruckFull"
          className="w-24 h-24 mx-auto mb-4 rounded-lg object-contain"
        />
        <h2 className="text-lg font-bold text-white">
          {truckName ? `${truckName} is on TruckFull!` : "You're Invited to TruckFull!"}
        </h2>
      </div>

      {/* Body */}
      <div className="bg-white p-6 space-y-4">
        <p className="text-[#52525b]">Hi there,</p>

        {truckName ? (
          <>
            <p className="text-[#52525b]">
              We found <strong>{truckName}</strong>
              {cuisineType && (
                <>
                  {' '}
                  serving up amazing <strong>{cuisineType}</strong> food
                </>
              )}
              {location && (
                <>
                  {' '}
                  in the <strong>{location}</strong> area
                </>
              )}
              , and we&apos;ve added you to TruckFull.
            </p>
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded">
              <p className="text-amber-800 text-sm">
                <strong>Is this information correct?</strong> Claim your listing to verify and
                update your details.
              </p>
            </div>
          </>
        ) : (
          <p className="text-[#52525b]">
            We&apos;re building the ultimate platform for food truck owners to connect with hungry
            customers. Claim your spot on TruckFull today!
          </p>
        )}

        <div className="bg-slate-50 border-l-4 border-red-600 p-4 rounded">
          <p className="font-semibold text-[#18181b] mb-2">
            {truckName ? 'Once you claim your listing, you can:' : 'With TruckFull, you can:'}
          </p>
          <ul className="text-sm text-[#52525b] space-y-1 ml-4 list-disc">
            <li>Update your location and operating hours</li>
            <li>Showcase your menu and specialties</li>
            <li>Connect with local food lovers</li>
            <li>Get discovered by new customers</li>
          </ul>
        </div>

        <div className="text-center">
          <span className="inline-block px-8 py-3 bg-red-600 text-white font-bold rounded-lg">
            {truckName ? 'Claim Your Truck for Free' : 'Join TruckFull'}
          </span>
        </div>

        <p className="text-center text-sm text-[#71717a]">
          This invitation is valid for 7 days. Questions? Reply to this email.
        </p>
      </div>

      {/* Footer */}
      <div className="bg-[#18181b] p-4 text-center">
        <p className="text-xs text-[#a1a1aa]">
          <a href="https://www.truckfull.food/privacy" className="text-red-500 hover:underline">
            Privacy
          </a>{' '}
          ·
          <a href="https://www.truckfull.food/terms" className="text-red-500 hover:underline">
            Terms
          </a>
        </p>
        <p className="text-xs text-[#a1a1aa] mt-1">
          TruckFull - Connecting food lovers with amazing trucks
        </p>
      </div>
    </div>
  );
}

export default function InviteOwnersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TruckResult[]>([]);
  const [selectedTruck, setSelectedTruck] = useState<TruckResult | null>(null);
  const [email, setEmail] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setStatus(null);

    try {
      // Use admin endpoint that only returns UNCLAIMED trucks
      const response = await fetch(
        `/api/admin/search-unclaimed-trucks?search=${encodeURIComponent(searchQuery)}&limit=10`,
      );
      const data = await response.json();

      if (data.trucks) {
        setSearchResults(data.trucks);
        if (data.trucks.length === 0) {
          setStatus({ type: 'error', message: 'No unclaimed trucks found matching your search' });
        }
      }
    } catch {
      setStatus({ type: 'error', message: 'Failed to search trucks' });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectTruck = (truck: TruckResult) => {
    setSelectedTruck(truck);
    // Pre-fill email if truck has one
    if (truck.contact_info?.email) {
      setEmail(truck.contact_info.email);
    }
  };

  const handleSendInvite = async () => {
    if (!email || !email.includes('@')) {
      setStatus({ type: 'error', message: 'Please enter a valid email address' });
      return;
    }

    setIsSending(true);
    setStatus(null);

    try {
      const response = await fetch('/api/admin/invite-owner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          truckId: selectedTruck?.id,
          truckName: selectedTruck?.name,
          cuisineType: selectedTruck?.cuisine_type,
          location: selectedTruck
            ? `${selectedTruck.city || ''}${selectedTruck.city && selectedTruck.state ? ', ' : ''}${selectedTruck.state || ''}`.trim()
            : undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus({ type: 'success', message: `Invite sent to ${email}!` });
        // Reset form
        setEmail('');
        setSelectedTruck(null);
        setSearchResults([]);
        setSearchQuery('');
      } else {
        setStatus({ type: 'error', message: data.error || 'Failed to send invite' });
      }
    } catch {
      setStatus({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setIsSending(false);
    }
  };

  const handleSendGenericInvite = async () => {
    if (!email || !email.includes('@')) {
      setStatus({ type: 'error', message: 'Please enter a valid email address' });
      return;
    }

    setIsSending(true);
    setStatus(null);

    try {
      const response = await fetch('/api/admin/invite-owner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus({ type: 'success', message: `Generic invite sent to ${email}!` });
        setEmail('');
      } else {
        setStatus({ type: 'error', message: data.error || 'Failed to send invite' });
      }
    } catch {
      setStatus({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Invite Food Truck Owners</h1>
      </div>

      {/* Status Alert */}
      {status && (
        <div
          className={`flex items-center gap-2 p-4 rounded-lg ${
            status.type === 'success'
              ? 'bg-green-500/10 text-green-500'
              : 'bg-red-500/10 text-red-500'
          }`}
        >
          {status.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{status.message}</span>
        </div>
      )}

      {/* Search for Truck */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Find a Food Truck
          </CardTitle>
          <CardDescription>
            Search for a truck to send a personalized invite with their info pre-filled
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Search by truck name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={isSearching}>
              <Search className="w-4 h-4 mr-2" />
              {isSearching ? 'Searching...' : 'Search'}
            </Button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              <Label>Select a truck:</Label>
              <div className="grid gap-2 max-h-60 overflow-y-auto">
                {searchResults.map((truck) => (
                  <button
                    key={truck.id}
                    onClick={() => handleSelectTruck(truck)}
                    className={`p-3 text-left rounded-lg border transition-colors ${
                      selectedTruck?.id === truck.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{truck.name}</div>
                      {truck.pending_invite && (
                        <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">
                          Invite sent to {truck.pending_invite.email}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {truck.cuisine_type && <span>{truck.cuisine_type} • </span>}
                      {truck.city && <span>{truck.city}</span>}
                      {truck.state && <span>, {truck.state}</span>}
                    </div>
                    {truck.contact_info?.email && (
                      <div className="text-xs text-muted-foreground mt-1">
                        📧 {truck.contact_info.email}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Send Invite */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Send Invite
          </CardTitle>
          <CardDescription>
            {selectedTruck
              ? `Sending personalized invite for ${selectedTruck.name}`
              : 'Send a generic invite or select a truck above for personalization'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedTruck && (
            <div className="p-3 rounded-lg bg-muted">
              <div className="text-sm text-muted-foreground">Selected truck:</div>
              <div className="font-medium">{selectedTruck.name}</div>
              {selectedTruck.cuisine_type && (
                <div className="text-sm">{selectedTruck.cuisine_type}</div>
              )}
              {(selectedTruck.city || selectedTruck.state) && (
                <div className="text-sm">
                  {selectedTruck.city}
                  {selectedTruck.city && selectedTruck.state && ', '}
                  {selectedTruck.state}
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => setSelectedTruck(null)}
              >
                Clear selection
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Owner&apos;s Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="owner@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            {selectedTruck ? (
              <Button onClick={handleSendInvite} disabled={isSending || !email}>
                <Send className="w-4 h-4 mr-2" />
                {isSending ? 'Sending...' : `Invite ${selectedTruck.name} Owner`}
              </Button>
            ) : (
              <Button
                onClick={handleSendGenericInvite}
                disabled={isSending || !email}
                variant="secondary"
              >
                <Send className="w-4 h-4 mr-2" />
                {isSending ? 'Sending...' : 'Send Generic Invite'}
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
              {showPreview ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {showPreview ? 'Hide Preview' : 'Preview Email'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Email Preview */}
      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Email Preview
            </CardTitle>
            <CardDescription>This is how the email will appear to the recipient</CardDescription>
          </CardHeader>
          <CardContent>
            <EmailPreview
              truckName={selectedTruck?.name}
              cuisineType={selectedTruck?.cuisine_type ?? undefined}
              location={
                selectedTruck
                  ? `${selectedTruck.city || ''}${selectedTruck.city && selectedTruck.state ? ', ' : ''}${selectedTruck.state || ''}`.trim() ||
                    undefined
                  : undefined
              }
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
