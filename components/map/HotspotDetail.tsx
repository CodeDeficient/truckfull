'use client';

import { useEffect, useState } from 'react';
import { MapPin, Flame, Clock, Store, ExternalLink, Calendar, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TomTomTrafficService, TrafficScore } from '@/lib/traffic/tomtom';
import { FoursquareService, FoursquareVenue } from '@/lib/poi/foursquare';
import { cn } from '@/lib/utils';

interface Hotspot {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  description?: string;
}

interface HotspotDetailProps {
  readonly hotspot: Hotspot;
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly userTier?: 'free' | 'pro' | 'admin';
}

type DurationType = 'hours' | 'days';

interface DurationOption {
  value: number;
  label: string;
  type: DurationType;
}

function getTrafficColor(level: TrafficScore['level']): string {
  switch (level) {
    case 'light': {
      return 'bg-green-500';
    }
    case 'moderate': {
      return 'bg-yellow-500';
    }
    case 'heavy': {
      return 'bg-orange-500';
    }
    case 'severe': {
      return 'bg-red-500';
    }
    default: {
      return 'bg-gray-500';
    }
  }
}

function getTrafficScoreColor(score: number): string {
  if (score >= 85) return 'text-red-600';
  if (score >= 70) return 'text-orange-600';
  if (score >= 55) return 'text-yellow-600';
  return 'text-green-600';
}

function getDurationOptions(tier: string): DurationOption[] {
  if (tier === 'pro' || tier === 'admin') {
    return [
      { value: 1, label: '1 hour', type: 'hours' },
      { value: 2, label: '2 hours', type: 'hours' },
      { value: 4, label: '4 hours', type: 'hours' },
      { value: 8, label: '8 hours', type: 'hours' },
      { value: 1, label: '1 day', type: 'days' },
      { value: 3, label: '3 days', type: 'days' },
      { value: 7, label: '7 days', type: 'days' },
    ];
  }

  return [
    { value: 1, label: '1 hour', type: 'hours' },
    { value: 2, label: '2 hours', type: 'hours' },
  ];
}

function TrafficScoreDisplay({ score }: { readonly score: TrafficScore }) {
  const color = getTrafficColor(score.level);
  const scoreColor = getTrafficScoreColor(Math.round(score.score * 100));
  const scoreValue = Math.round(score.score * 100);

  return (
    <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
      <div className={cn('w-4 h-4 rounded-full', color)} />
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium">Traffic Score</span>
          <span className={cn('text-2xl font-bold', scoreColor)}>{scoreValue}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="capitalize">{score.level} traffic</span>
          <span>•</span>
          <span>{score.currentSpeed.toFixed(0)} mph</span>
        </div>
      </div>
    </div>
  );
}

function TrafficScoreSkeleton() {
  return (
    <div className="p-4 rounded-lg bg-muted/50">
      <div className="flex items-center gap-3">
        <Skeleton className="w-4 h-4 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-8 w-12" />
      </div>
    </div>
  );
}

function NearbyBusinessList({ businesses }: { readonly businesses: FoursquareVenue[] }) {
  if (businesses.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        <Store className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>No nearby businesses found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {businesses.map((business) => (
        <a
          key={business.fsq_id}
          href={business.website || `https://foursquare.com/v/${business.fsq_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm truncate">{business.name}</h4>
              <div className="flex items-center gap-2 mt-1">
                {business.categories && business.categories.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {business.categories[0].name}
                  </span>
                )}
                {business.rating && (
                  <>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs font-medium text-yellow-600">
                      ★ {business.rating.toFixed(1)}
                    </span>
                  </>
                )}
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          </div>
        </a>
      ))}
    </div>
  );
}

function NearbyBusinessesSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="p-3 rounded-lg border">
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

export function HotspotDetail({ hotspot, isOpen, onClose, userTier = 'free' }: HotspotDetailProps) {
  const [trafficScore, setTrafficScore] = useState<TrafficScore | null>(null);
  const [trafficLoading, setTrafficLoading] = useState(false);
  const [nearbyBusinesses, setNearbyBusinesses] = useState<FoursquareVenue[]>([]);
  const [businessesLoading, setBusinessesLoading] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<DurationOption | null>(null);

  const durationOptions = getDurationOptions(userTier);

  useEffect(() => {
    async function fetchTrafficData() {
      if (!isOpen) return;

      setTrafficLoading(true);
      try {
        const tomTomService = new TomTomTrafficService();
        const score = await tomTomService.getTrafficScore(hotspot.latitude, hotspot.longitude);
        if (score) {
          setTrafficScore(score);
        }
      } catch (error) {
        console.error('Failed to fetch traffic score:', error);
      } finally {
        setTrafficLoading(false);
      }
    }

    async function fetchNearbyBusinesses() {
      if (!isOpen) return;

      setBusinessesLoading(true);
      try {
        const foursquare = new FoursquareService();
        const result = await foursquare.searchVenues({
          latitude: hotspot.latitude,
          longitude: hotspot.longitude,
          radius: 500,
          limit: 5,
        });

        if (result.success) {
          setNearbyBusinesses(result.data.venues);
        }
      } catch (error) {
        console.error('Failed to fetch nearby businesses:', error);
      } finally {
        setBusinessesLoading(false);
      }
    }

    fetchTrafficData();
    fetchNearbyBusinesses();
  }, [isOpen, hotspot.latitude, hotspot.longitude]);

  const handleReserve = () => {
    if (selectedDuration) {
      onClose();
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  const handleDurationSelect = (option: DurationOption) => {
    setSelectedDuration(option);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <DialogTitle>{hotspot.name}</DialogTitle>
          </div>
          {hotspot.description && <DialogDescription>{hotspot.description}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-6 py-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">
                  {hotspot.address ||
                    `${hotspot.latitude.toFixed(4)}, ${hotspot.longitude.toFixed(4)}`}
                </span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">Updated just now</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Traffic Analysis</CardTitle>
              <CardDescription>Annualized traffic score based on real-time data</CardDescription>
            </CardHeader>
            <CardContent>
              {trafficLoading && <TrafficScoreSkeleton />}
              {!trafficLoading && trafficScore && <TrafficScoreDisplay score={trafficScore} />}
              {!trafficLoading && !trafficScore && (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  Traffic data unavailable
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Store className="w-4 h-4" />
                Nearby Businesses
              </CardTitle>
              <CardDescription>Top 5 nearby locations from Foursquare</CardDescription>
            </CardHeader>
            <CardContent>
              {businessesLoading ? (
                <NearbyBusinessesSkeleton />
              ) : (
                <NearbyBusinessList businesses={nearbyBusinesses} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Reservation
              </CardTitle>
              <CardDescription>
                <span className="capitalize">{userTier}</span> tier access
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {userTier === 'free' && (
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Upgrade to Pro tier to reserve this hotspot
                  </p>
                  <Button size="sm" variant="outline">
                    Upgrade Now
                  </Button>
                </div>
              )}

              {userTier !== 'free' && (
                <>
                  <div>
                    <p className="text-sm font-medium mb-3">Select duration:</p>
                    <div className="grid grid-cols-3 gap-2">
                      {durationOptions.map((option) => (
                        <Button
                          key={`${option.type}-${option.value}`}
                          variant={
                            selectedDuration?.value === option.value &&
                            selectedDuration?.type === option.type
                              ? 'default'
                              : 'outline'
                          }
                          size="sm"
                          onClick={() => handleDurationSelect(option)}
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Button className="w-full" onClick={handleReserve} disabled={!selectedDuration}>
                    Reserve Hotspot
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
