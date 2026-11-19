import Image from 'next/image';
import Link from '@/components/navigation/IntentLink';
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Key, HelpCircle, X, Calendar } from 'lucide-react';
import { AvatarMenu } from '@/components/auth';
import { RadiusFilter } from '@/components/filters/RadiusFilter';
import { useTierAccess } from '@/hooks/useTierAccess';
import { useOrganizerAccess } from '@/hooks/useOrganizerAccess';
import { SupportModal } from '@/components/shared/SupportModal';
import { useFiltersStore } from '@/lib/stores/useFiltersStore';
import type { User } from '@supabase/supabase-js';

interface AppHeaderProps {
  readonly userLocation?: { lat: number; lng: number };
  readonly isAuthenticated?: boolean;
  readonly loadingAuth?: boolean;
  readonly user?: User | null;
  readonly openModal?: () => void;
  readonly showSearchOverlay?: boolean;
  readonly setShowSearchOverlay?: (show: boolean) => void;
  readonly activePanel?: 'discover' | 'featured' | null;
  readonly onPanelChange?: (panel: 'discover' | 'featured' | null) => void;
  readonly onSearch?: () => void;
}

export function AppHeader({
  userLocation,
  isAuthenticated,
  loadingAuth,
  user,
  openModal,
  showSearchOverlay,
  setShowSearchOverlay,
  activePanel,
  onPanelChange,
  onSearch,
}: AppHeaderProps) {
  const { isOwner } = useTierAccess();
  const { isOrganizer, isLoading: isOrganizerLoading } = useOrganizerAccess();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { searchQuery, setSearchQuery } = useFiltersStore();
  const [showSupportModal, setShowSupportModal] = useState(false);

  return (
    <>
      <header className="bg-card shadow-md px-4 py-1.5 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="block">
              <Image
                src="/truckfull-icon-transparent.webp"
                alt="TruckFull Logo"
                width={92}
                height={64}
                className="h-12 object-contain w-auto"
                sizes="92px"
                priority
              />
            </Link>
            <div
              className="font-lobster text-white text-3xl font-bold neon-glow glow-red"
              aria-label="TruckFull page header"
            >
              <Link href="/">TruckFull</Link>
            </div>
          </div>

          {/* Inline search bar - shown when search button is clicked, hidden on mobile */}
          {showSearchOverlay && (
            <div className="hidden md:flex items-center flex-1 justify-end mr-4">
              <div className="relative w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <div className="relative">
                  <Input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search food trucks, cuisine, or menu items..."
                    value={searchQuery ?? ''}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        onSearch?.();
                        setShowSearchOverlay?.(false);
                      }
                    }}
                    className="pl-10 h-9 w-full bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-red-500 focus-visible:ring-0 focus-visible:ring-offset-0"
                    // eslint-disable-next-line jsx-a11y/no-autofocus -- Auto-focusing search input when overlay opens is intentional UX
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery(undefined)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <RadiusFilter className="ml-3 shrink-0" />
            </div>
          )}

          <div className="flex items-center gap-2 md:gap-4">
            {/* Search icon button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSearchOverlay?.(!showSearchOverlay)}
              className={`h-8 w-8 relative z-20 text-muted-foreground ${showSearchOverlay ? 'bg-muted text-foreground' : ''}`}
            >
              <Search className="size-4" />
            </Button>
            {/* Nav buttons - Discover, Featured */}
            <div className="hidden md:flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onPanelChange?.(activePanel === 'discover' ? null : 'discover')}
                className={`${
                  activePanel === 'discover'
                    ? 'text-foreground bg-muted font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Discover
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onPanelChange?.(activePanel === 'featured' ? null : 'featured')}
                className={`${
                  activePanel === 'featured'
                    ? 'text-foreground bg-muted font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Featured
              </Button>
              <Link
                href="/events"
                className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Events
              </Link>
              {isOwner && (
                <Link
                  href="/owner-dashboard"
                  className="inline-flex items-center justify-center p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  title="Owner Dashboard"
                >
                  <Key className="size-4" />
                </Link>
              )}
              {isOrganizer && !isOrganizerLoading && (
                <Link
                  href="/organizer"
                  className="inline-flex items-center justify-center p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  title="Organizer Dashboard"
                >
                  <Calendar className="size-4" />
                </Link>
              )}
            </div>
            {/* Auth section */}
            {loadingAuth === true ? (
              <Skeleton className="h-8 w-16 md:w-20" />
            ) : (
              <>
                {isAuthenticated === true ? (
                  <AvatarMenu user={user ?? undefined} />
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowSupportModal(true)}
                      className="inline-flex items-center justify-center p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      title="Get Support"
                    >
                      <HelpCircle className="size-4" />
                    </button>
                    <Button
                      variant="ghost"
                      onClick={openModal}
                      className="h-8 text-sm px-3 bg-primary/10 text-primary font-semibold hover:bg-primary/15 no-hover-effects"
                    >
                      Sign In
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        {/* Mobile search bar */}
        <div className="mt-3 sm:hidden">
          {/* Mobile radius filter */}
          {userLocation && <RadiusFilter className="flex justify-center" />}
        </div>
      </header>

      {/* Support Modal */}
      <SupportModal isOpen={showSupportModal} onClose={() => setShowSupportModal(false)} />
    </>
  );
}
