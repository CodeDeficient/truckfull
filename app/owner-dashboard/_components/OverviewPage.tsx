'use client';

import Link from '@/components/navigation/IntentLink';
import { Truck, Utensils, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NoTrucksGuidance } from './NoTrucksGuidance';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { Pencil, XCircle, MoreHorizontal } from 'lucide-react';
import type { FoodTruckDomain, UserProfileDomain } from '@/lib/types';

interface OverviewPageProps {
  readonly profile: UserProfileDomain | undefined;
  readonly trucks: readonly FoodTruckDomain[];
  readonly liveTruckIds: Set<string>;
  readonly onGoLiveClick: (truckId: string) => void;
  readonly onCloseShopClick: (truckId: string) => void;
}

function getVerificationBadgeVariant(
  verificationStatus: string | null | undefined,
): 'default' | 'secondary' | 'destructive' {
  switch (verificationStatus) {
    case 'verified': {
      return 'default';
    }
    case 'pending': {
      return 'secondary';
    }
    default: {
      return 'destructive';
    }
  }
}

function computeStats(trucks: readonly FoodTruckDomain[], liveTruckIds: Set<string>) {
  const trucksCount = trucks.length;
  const liveCount = liveTruckIds.size;
  const totalMenuItems = trucks.reduce((sum, t) => sum + (t.menu_items?.length ?? 0), 0);
  return { trucksCount, liveCount, totalMenuItems };
}

function TrucksTableInline({
  trucks,
  liveTruckIds,
  onGoLiveClick,
  onCloseShopClick,
}: {
  readonly trucks: readonly FoodTruckDomain[];
  readonly liveTruckIds: Set<string>;
  readonly onGoLiveClick: (truckId: string) => void;
  readonly onCloseShopClick: (truckId: string) => void;
}) {
  return (
    <>
      <div className="hidden md:block overflow-hidden">
        <Table className="[&_tr]:!border-b-0 [&_td]:py-2 [&_th]:py-2">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Name</TableHead>
              <TableHead className="w-[140px]">Cuisine</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead className="w-auto">Location</TableHead>
              <TableHead className="w-[50px] text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trucks.map((truck) => {
              const isLive = liveTruckIds.has(truck.id);
              return (
                <TableRow key={truck.id}>
                  <TableCell className="font-medium truncate" title={truck.name}>
                    {truck.name}
                  </TableCell>
                  <TableCell className="truncate" title={truck.cuisine_type?.join(', ')}>
                    {truck.cuisine_type?.slice(0, 2).join(', ') ?? 'N/A'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 items-start">
                      <Badge
                        variant={getVerificationBadgeVariant(truck.verification_status)}
                        className="w-fit text-[10px] px-1.5 py-0"
                      >
                        {truck.verification_status ?? 'Unverified'}
                      </Badge>
                      <Badge
                        variant={isLive ? 'default' : 'outline'}
                        className={`w-fit whitespace-nowrap text-[10px] px-1.5 py-0 ${isLive ? 'bg-green-600' : ''}`}
                      >
                        {isLive ? 'Live' : 'Offline'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell
                    className="truncate text-sm text-muted-foreground"
                    title={truck.current_location?.address}
                  >
                    {truck.current_location?.address ?? 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/owner-dashboard/edit/${truck.id}`}
                            className="flex items-center cursor-pointer"
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {!isLive && onGoLiveClick && (
                          <DropdownMenuItem onClick={() => onGoLiveClick(truck.id)}>
                            <Radio className="mr-2 h-4 w-4" />
                            Go Live
                          </DropdownMenuItem>
                        )}
                        {isLive && onCloseShopClick && (
                          <DropdownMenuItem onClick={() => onCloseShopClick(truck.id)}>
                            <XCircle className="mr-2 h-4 w-4" />
                            Close Shop
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="block md:hidden divide-y divide-border">
        {trucks.map((truck) => {
          const isLive = liveTruckIds.has(truck.id);
          return (
            <div key={truck.id} className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">{truck.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {truck.cuisine_type?.slice(0, 2).join(', ') ?? 'N/A'}
                  </p>
                </div>
                <Badge
                  variant={isLive ? 'default' : 'outline'}
                  className={`whitespace-nowrap ${isLive ? 'bg-green-600' : ''}`}
                >
                  {isLive ? 'Live' : 'Offline'}
                </Badge>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={getVerificationBadgeVariant(truck.verification_status)}>
                  {truck.verification_status ?? 'Unverified'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {truck.current_location?.address ?? 'N/A'}
              </p>
              <div className="pt-2 flex flex-wrap gap-2">
                {!isLive && onGoLiveClick && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 bg-primary/10 text-primary font-semibold hover:bg-primary/15 no-hover-effects"
                    onClick={() => onGoLiveClick(truck.id)}
                  >
                    <Radio className="w-4 h-4 mr-2" />
                    Go Live
                  </Button>
                )}
                {isLive && onCloseShopClick && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 bg-destructive/10 text-destructive font-semibold hover:bg-destructive/15 no-hover-effects"
                    onClick={() => onCloseShopClick(truck.id)}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Close Shop
                  </Button>
                )}
                <Button asChild variant="ghost" size="sm" className="flex-1">
                  <Link href={`/owner-dashboard/edit/${truck.id}`}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit
                  </Link>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export function OverviewPage({
  profile,
  trucks,
  liveTruckIds,
  onGoLiveClick,
  onCloseShopClick,
}: OverviewPageProps) {
  const stats = computeStats(trucks, liveTruckIds);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Welcome back{profile?.full_name ? `, ${profile.full_name}` : ''}
          </h2>
          <p className="text-muted-foreground mt-1">
            Here&apos;s what&apos;s happening with your trucks today.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button asChild variant="ghost" size="sm" className="gap-2 bg-primary/10 text-primary font-semibold hover:bg-primary/15 no-hover-effects">
            <Link href="/owner-dashboard/location">
              <Radio className="w-4 h-4" />
              Go Live
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Truck className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.trucksCount}</p>
              <p className="text-xs text-muted-foreground">Active Trucks</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Radio className="h-4 w-4 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.liveCount}</p>
              <p className="text-xs text-muted-foreground">Live Now</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Utensils className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalMenuItems}</p>
              <p className="text-xs text-muted-foreground">Menu Items</p>
            </div>
          </div>
        </div>
      </div>

      {trucks.length > 0 && (
        <div className="bg-card rounded-lg overflow-hidden">
          <TrucksTableInline
            trucks={trucks}
            liveTruckIds={liveTruckIds}
            onGoLiveClick={onGoLiveClick}
            onCloseShopClick={onCloseShopClick}
          />
        </div>
      )}

      {trucks.length === 0 && <NoTrucksGuidance />}
    </div>
  );
}
