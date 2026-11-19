'use client';

import { type FormEvent, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from '@/components/navigation/IntentLink';
import { ClaimTruckModal } from '@/components/owner/ClaimTruckModal';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { captureOwnerFunnelEvent } from '@/lib/analytics/trackClient';
import { buildClaimStarted } from '@/lib/analytics/funnel';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SocialFooter, SocialFooterSpacer } from '@/components/SocialFooter';
import {
  CLAIM_SEARCH_DEFAULT_LIMIT,
  CLAIM_SEARCH_MIN_QUERY_LENGTH,
  type PublicTruckSearchResult,
} from '@/lib/claim/publicClaimSearch';
import {
  SUBMISSION_MAX_FILE_SIZE,
  SUBMISSION_MAX_TOTAL_UPLOAD_SIZE,
} from '@/lib/claim/truckListingSubmission';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Loader2,
  Search,
  Send,
  Truck,
} from 'lucide-react';

interface ClaimTruckSearchResponse {
  trucks?: PublicTruckSearchResult[];
  message?: string;
  error?: string;
}

const HOW_IT_WORKS = [
  {
    title: 'Search your truck',
    description:
      'Search the list by business name and start the claim flow.',
  },
  {
    title: 'Choose the right listing',
    description:
      'Open the matching result, confirm the location and cuisine details, then start the claim flow.',
  },
  {
    title: 'Verify or contact support',
    description:
      'We will send a verification code to the email we have on file, or you can ask support to verify ownership manually.',
  },
];

export default function ClaimYourTruckPage() {
  const claimStartedTrackedRef = useRef(false);
  const [formData, setFormData] = useState({
    truckName: '',
    city: '',
    state: '',
    email: '',
    website: '',
    contactName: '',
    phone: '',
    instagram: '',
    facebook: '',
    menuText: '',
    notes: '',
    website_hp: '',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [menuFile, setMenuFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PublicTruckSearchResult[]>([]);
  const [searchMessage, setSearchMessage] = useState('');
  const [searchError, setSearchError] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedTruck, setSelectedTruck] = useState<PublicTruckSearchResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitWarnings, setSubmitWarnings] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState('');
  const [activeTab, setActiveTab] = useState('find');

  useEffect(() => {
    const normalizedQuery = searchQuery.trim();
    setSearchError('');
    setSearchMessage('');

    if (!normalizedQuery) {
      setHasSearched(false);
      setSearchResults([]);
      return;
    }

    setHasSearched(true);

    if (normalizedQuery.length < CLAIM_SEARCH_MIN_QUERY_LENGTH) {
      setIsSearching(false);
      setSearchResults([]);
      setSearchMessage(`Enter at least ${CLAIM_SEARCH_MIN_QUERY_LENGTH} characters to search.`);
      return;
    }

    const abortController = new AbortController();
    const timeoutId = globalThis.setTimeout(async () => {
      setIsSearching(true);

      try {
        const response = await fetch(
          `/api/claim-your-truck/search?q=${encodeURIComponent(normalizedQuery)}&limit=${CLAIM_SEARCH_DEFAULT_LIMIT}`,
          { signal: abortController.signal },
        );
        const data = (await response.json()) as ClaimTruckSearchResponse;

        if (!response.ok) {
          throw new Error(data.error || 'Unable to search trucks right now.');
        }

        setSearchResults(data.trucks ?? []);
        setSearchMessage(data.message ?? '');
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }

        const message =
          error instanceof Error ? error.message : 'Unable to search trucks right now.';
        setSearchResults([]);
        setSearchError(message);
      } finally {
        if (!abortController.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 250);

    return () => {
      abortController.abort();
      globalThis.clearTimeout(timeoutId);
    };
  }, [searchQuery]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!claimStartedTrackedRef.current) {
      claimStartedTrackedRef.current = true;
      const { event: funnelEvent, properties } = buildClaimStarted('listing_submission');
      captureOwnerFunnelEvent(funnelEvent, properties);
    }
    setSubmitError('');
    setIsSubmitting(true);

    try {
      const files = [logoFile, menuFile].filter((file): file is File => file !== null);
      const totalSize = files.reduce((total, file) => total + file.size, 0);
      if (totalSize > SUBMISSION_MAX_TOTAL_UPLOAD_SIZE) {
        throw new Error(
          `Files together must be ${SUBMISSION_MAX_TOTAL_UPLOAD_SIZE / (1024 * 1024)}MB or less.`,
        );
      }
      for (const file of files) {
        if (file.size > SUBMISSION_MAX_FILE_SIZE) {
          throw new Error(`Each file must be ${SUBMISSION_MAX_FILE_SIZE / (1024 * 1024)}MB or less.`);
        }
      }

      const body = new FormData();
      body.set('truckName', formData.truckName);
      body.set('email', formData.email);
      body.set('contactName', formData.contactName);
      body.set('phone', formData.phone);
      body.set('city', formData.city);
      body.set('state', formData.state);
      body.set('website', formData.website);
      body.set('instagram', formData.instagram);
      body.set('facebook', formData.facebook);
      body.set('menuText', formData.menuText);
      body.set('notes', formData.notes);
      body.set('website_hp', formData.website_hp);
      if (logoFile) {
        body.set('logo', logoFile);
      }
      if (menuFile) {
        body.set('menu', menuFile);
      }

      const response = await fetch('/api/claim-your-truck/submit', {
        method: 'POST',
        body,
      });

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        warnings?: string[];
      };

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong. Please try again.');
      }

      setSubmitWarnings(data.warnings ?? []);
      setSubmitted(true);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Something went wrong. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field: keyof typeof formData) => (value: string) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
  };

  const isFormValid = Boolean(formData.truckName.trim() && formData.email.trim());

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95 flex flex-col">
      <header className="bg-gradient-to-r from-red-600 to-orange-600 px-4 py-3 shadow-lg">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <Link
            href="/"
            className="flex items-center justify-center rounded-full bg-white/20 p-1.5 text-white transition-colors hover:bg-white/30"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <h1 className="text-lg font-bold text-white">Claim Your Truck</h1>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 pt-4">
        <div className="bg-green-600/10 border border-green-600/20 rounded-lg p-3 text-center">
          <p className="text-sm text-green-700 dark:text-green-300">
            Claim your truck to start your free 30-day Pro trial — no credit card required.
          </p>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 py-6 flex-1">
        <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="find" className="w-full">
          <div className="flex justify-center">
            <TabsList className="inline-flex p-0.5">
              <TabsTrigger value="find" className="gap-1.5 px-4 text-sm">
                <Search className="size-3.5" />
                Find
              </TabsTrigger>
              <TabsTrigger value="list" className="gap-1.5 px-4 text-sm">
                <Truck className="size-3.5" />
                List
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="find" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)]">
              <Card className="border-border bg-card shadow-sm">
                <CardHeader>
                  <CardTitle className="text-foreground">Find Your Truck</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Search by name.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="truck-search" className="sr-only">
                      Search by truck name
                    </Label>
                    <div className="relative">
                      <Input
                        id="truck-search"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search by truck name"
                        className="border-input pr-10 text-foreground placeholder:text-muted-foreground"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          aria-label="Clear search"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {searchError ? (
                    <Alert variant="destructive">
                      <AlertCircle className="size-4" />
                      <AlertDescription>{searchError}</AlertDescription>
                    </Alert>
                  ) : null}

                  {isSearching ? (
                    <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      Searching trucks…
                    </div>
                  ) : null}

                  {searchMessage ? (
                    <Alert className="border-border bg-card text-muted-foreground">
                      <AlertDescription>{searchMessage}</AlertDescription>
                    </Alert>
                  ) : null}

                  <div className="space-y-3">
                    {searchResults.map((truck) => (
                      <div
                        key={truck.id}
                        className="flex items-start gap-4 rounded-xl border border-border bg-card p-4 h-[88px]"
                      >
                        <div className="relative size-14 shrink-0 overflow-hidden rounded-full bg-muted">
                          <Image
                            src={truck.photoUrl ?? '/truckfull-fallback-512.webp'}
                            alt={truck.name}
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        </div>

                        <div className="min-w-0 flex-1 self-center space-y-0.5">
                          <h3 className="truncate text-base font-semibold text-foreground">
                            {truck.name}
                          </h3>
                          <p className="text-xs text-muted-foreground">{truck.locationLabel}</p>
                          {truck.cuisineTypes.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {truck.cuisineTypes.map((cuisine) => (
                                <span
                                  key={cuisine}
                                  className="inline-block rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground"
                                >
                                  {cuisine}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div className="h-4" />
                          )}
                        </div>

                        <Button
                          type="button"
                          size="sm"
                          className="self-center shrink-0"
                          onClick={() => setSelectedTruck(truck)}
                          aria-label={`Claim ${truck.name}`}
                        >
                          Claim Now
                        </Button>
                      </div>
                    ))}

                    {hasSearched && !isSearching && !searchError && searchResults.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
                        No matching unclaimed trucks yet. Use the List tab below if your
                        truck is missing.
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card h-fit shadow-sm">
                <CardHeader>
                  <CardTitle className="text-foreground">How It Works</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Three steps to take ownership of your listing.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {HOW_IT_WORKS.map((step, index) => (
                    <div key={step.title} className="flex gap-4">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/20 font-bold text-primary">
                        {index + 1}
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-semibold text-foreground">{step.title}</h3>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                  ))}

                  <p className="text-xs text-muted-foreground text-center pt-2 border-t border-border">
                    Can&apos;t find your truck? Use the List tab.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="list" className="mt-6">
            <div className="mx-auto max-w-lg">
              <Card className="border-border bg-card shadow-sm">
                <CardHeader>
                  <CardTitle className="text-foreground">Don&apos;t See Your Truck Listed?</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Fill out this form and we&apos;ll add your food truck to TruckFull.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {submitted ? (
                    <div className="space-y-4 text-center py-4">
                      <CheckCircle className="mx-auto size-12 text-green-500" />
                      <div>
                        <p className="font-semibold text-foreground">
                          Your truck information was submitted successfully.
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          We&apos;ll review it and add your truck to TruckFull within 24-48
                          hours. We may reach out to {formData.email} if we need more
                          information.
                        </p>
                        {submitWarnings.length > 0 ? (
                          <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-left">
                            <p className="text-sm font-medium text-amber-800">
                              Your submission was saved, but some files could not be
                              processed:
                            </p>
                            <ul className="mt-1 list-disc pl-5 text-sm text-amber-800">
                              {submitWarnings.map((warning) => (
                                <li key={warning}>{warning}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      {submitError ? (
                        <Alert variant="destructive">
                          <AlertCircle className="size-4" />
                          <AlertDescription>{submitError}</AlertDescription>
                        </Alert>
                      ) : null}

                      <div className="space-y-2">
                        <Label htmlFor="truckName" className="text-foreground">
                          Truck Name <span className="text-primary">*</span>
                        </Label>
                        <Input
                          id="truckName"
                          placeholder="e.g., Sample BBQ Co"
                          value={formData.truckName}
                          onChange={(event) => updateField('truckName')(event.target.value)}
                          required
                          className="border-input"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-foreground">
                          Your Email <span className="text-primary">*</span>
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="you@example.com"
                          value={formData.email}
                          onChange={(event) => updateField('email')(event.target.value)}
                          required
                          className="border-input"
                        />
                      </div>

                      <div className="grid gap-4 sm:grid-cols-[1fr_90px]">
                        <div className="space-y-2">
                          <Label htmlFor="city" className="text-muted-foreground">
                            City
                          </Label>
                          <Input
                            id="city"
                            placeholder="e.g., Augusta"
                            value={formData.city}
                            onChange={(event) => updateField('city')(event.target.value)}
                            className="border-input"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="state" className="text-muted-foreground">
                            State
                          </Label>
                          <Input
                            id="state"
                            placeholder="e.g., GA"
                            value={formData.state}
                            onChange={(event) =>
                              updateField('state')(event.target.value.toUpperCase())
                            }
                            className="border-input"
                          />
                        </div>
                      </div>

                      <details className="group rounded-lg border border-border p-3">
                        <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                          Add more details (optional)
                        </summary>
                        <div className="mt-4 space-y-4">
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="contactName" className="text-muted-foreground">
                                Contact Name
                              </Label>
                              <Input
                                id="contactName"
                                placeholder="e.g., Joe Smith"
                                value={formData.contactName}
                                onChange={(event) => updateField('contactName')(event.target.value)}
                                className="border-input"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="phone" className="text-muted-foreground">
                                Phone
                              </Label>
                              <Input
                                id="phone"
                                placeholder="e.g., (706) 555-0123"
                                value={formData.phone}
                                onChange={(event) => updateField('phone')(event.target.value)}
                                className="border-input"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="website" className="text-muted-foreground">
                                Website
                              </Label>
                              <Input
                                id="website"
                                placeholder="e.g., samplebbq.example.com"
                                value={formData.website}
                                onChange={(event) => updateField('website')(event.target.value)}
                                className="border-input"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="instagram" className="text-muted-foreground">
                                Instagram
                              </Label>
                              <Input
                                id="instagram"
                                placeholder="e.g., instagram.com/samplebbqtruck"
                                value={formData.instagram}
                                onChange={(event) => updateField('instagram')(event.target.value)}
                                className="border-input"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="facebook" className="text-muted-foreground">
                                Facebook
                              </Label>
                              <Input
                                id="facebook"
                                placeholder="e.g., facebook.com/samplebbqtruck"
                                value={formData.facebook}
                                onChange={(event) => updateField('facebook')(event.target.value)}
                                className="border-input"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="logo" className="text-muted-foreground">
                              Logo (image, optional)
                            </Label>
                            <Input
                              id="logo"
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              onChange={(event) =>
                                setLogoFile(event.target.files?.[0] ?? null)
                              }
                              className="border-input"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="menu" className="text-muted-foreground">
                              Menu (image, optional)
                            </Label>
                            <Input
                              id="menu"
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              onChange={(event) =>
                                setMenuFile(event.target.files?.[0] ?? null)
                              }
                              className="border-input"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="menuText" className="text-muted-foreground">
                              Menu Items (text, optional)
                            </Label>
                            <Textarea
                              id="menuText"
                              placeholder="e.g., Brisket Platter - $14&#10;Smoked Wings (6) - $9"
                              value={formData.menuText}
                              onChange={(event) => updateField('menuText')(event.target.value)}
                              className="border-input"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="notes" className="text-muted-foreground">
                              Notes (optional)
                            </Label>
                            <Textarea
                              id="notes"
                              placeholder="Anything else we should know?"
                              value={formData.notes}
                              onChange={(event) => updateField('notes')(event.target.value)}
                              className="border-input"
                            />
                          </div>
                        </div>
                      </details>

                      <div className="hidden" aria-hidden="true">
                        <Label htmlFor="website_hp">Website</Label>
                        <Input
                          id="website_hp"
                          name="website_hp"
                          tabIndex={-1}
                          autoComplete="off"
                          value={formData.website_hp}
                          onChange={(event) => updateField('website_hp')(event.target.value)}
                        />
                      </div>

                      <Button
                        type="submit"
                        variant="default"
                        className="w-full"
                        disabled={!isFormValid || isSubmitting}
                      >
                        <Send className="mr-2 size-4" />
                        {isSubmitting ? 'Submitting...' : 'Submit Truck Listing Request'}
                      </Button>

                      <p className="text-center text-xs text-muted-foreground">
                        We&apos;ll review your submission and add your truck within 24-48 hours.
                      </p>
                    </form>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {selectedTruck ? (
        <ClaimTruckModal
          isOpen
          onClose={() => setSelectedTruck(null)}
          truckId={selectedTruck.id}
          truckName={selectedTruck.name}
        />
      ) : null}
      <SocialFooterSpacer />
      <SocialFooter />
    </div>
  );
}
