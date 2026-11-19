'use client';

import Link from '@/components/navigation/IntentLink';
import {
  ArrowLeft,
  Crown,
  Facebook,
  HelpCircle,
  LogOut,
  MessageSquare,
  Menu,
  Settings,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { DashboardSidebar } from './sidebar';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { UserProfileDomain } from '@/lib/types';
import { useTierAccess } from '@/hooks/useTierAccess';
import { useIsClient } from '@/hooks/useIsClient';
import { useProfileModalStore } from '@/lib/stores/useProfileModalStore';
import { useSettingsModalStore } from '@/lib/stores/useSettingsModalStore';

interface DashboardHeaderProps {
  readonly user: UserProfileDomain | undefined;
  readonly onSignOut: () => void;
  readonly backLink?: { href: string; label: string };
  readonly onUpgradeClick?: () => void;
}

// Extract avatar from user metadata or email
// NOTE: UserProfileDomain doesn't currently include avatar fields, so this returns undefined
function getAvatarUrl(_user: UserProfileDomain | undefined): string | undefined {
  // UserProfileDomain doesn't have avatar fields currently implemented
  return undefined; // No avatar field exists in UserProfileDomain
}

export function DashboardHeader({
  user,
  onSignOut,
  backLink,
  onUpgradeClick,
}: DashboardHeaderProps) {
  const { tierDisplay, isLoading, tier } = useTierAccess();
  const isClient = useIsClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const profileModalStore = useProfileModalStore();
  const settingsModalStore = useSettingsModalStore();

  const handleProfileClick = () => {
    profileModalStore.openModal();
  };

  const handleSettingsClick = () => {
    settingsModalStore.openModal('general');
  };

  const handleSignOut = () => {
    void onSignOut();
  };

  return (
    <header className="flex h-14 items-center justify-between px-6 bg-card">
      <div className="flex items-center gap-4">
        {/* Mobile Sidebar Trigger */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 [&>button]:hidden">
            <DashboardSidebar
              className="border-none bg-transparent"
              onNavigate={() => setSheetOpen(false)}
            />
          </SheetContent>
        </Sheet>

        {backLink && (
          <Link
            href={backLink.href}
            className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {backLink.label}
          </Link>
        )}
        {!backLink && <h1 className="text-xl font-semibold">Dashboard</h1>}
      </div>

      <div className="flex items-center gap-4">
        {/* Subscription Tier Badge */}
        {!isLoading && (
          <button
            onClick={tier === 'free' ? onUpgradeClick : undefined}
            className={`flex items-center gap-2 px-3 py-1 rounded-full ${tierDisplay.color} bg-opacity-10 ${
              tier === 'free'
                ? 'cursor-pointer hover:opacity-80 transition-opacity'
                : 'cursor-default'
            }`}
          >
            {tierDisplay.name !== 'free' && <Crown className="w-4 h-4 text-amber-500" />}
            <span className="text-sm font-medium">{tierDisplay.displayName}</span>
          </button>
        )}
        {/* Upgrade Button for Free Tier */}
        {!isLoading && tier === 'free' && onUpgradeClick && (
          <Button onClick={onUpgradeClick} size="sm" className="gap-2">
            <Crown className="w-4 h-4 text-amber-500" />
            Upgrade
          </Button>
        )}
        {isClient ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={getAvatarUrl(user)}
                    alt={user?.full_name ?? user?.email?.slice(0, 2).toUpperCase() ?? 'U'}
                  />
                  <AvatarFallback>
                    {user?.full_name
                      ? user.full_name.slice(0, 2).toUpperCase()
                      : (user?.email?.slice(0, 2).toUpperCase() ?? 'U')}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" forceMount className="w-56">
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium text-sm">{user?.full_name ?? user?.email ?? 'User'}</p>
                  {user?.email != undefined && user.email.length > 0 && (
                    <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                      {user?.email}
                    </p>
                  )}
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleProfileClick} className="cursor-pointer">
                <User className="mr-2 size-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSettingsClick} className="cursor-pointer">
                <Settings className="mr-2 size-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer">
                <a href="mailto:support@truckfull.food?subject=Feedback">
                  <MessageSquare className="mr-2 size-4" />
                  <span>Send Feedback</span>
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer">
                <a href="mailto:support@truckfull.food?subject=Support Request">
                  <HelpCircle className="mr-2 size-4" />
                  <span>Get Support</span>
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer">
                <a
                  href="https://www.facebook.com/TruckFull.food/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Facebook className="mr-2 size-4 text-blue-600 dark:text-blue-500 fill-current" />
                  <span>Follow us on Facebook</span>
                </a>
              </DropdownMenuItem>
              <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground px-2 py-1.5">
                <Link href="/privacy" className="hover:text-foreground hover:underline">
                  Privacy
                </Link>
                <span>•</span>
                <Link href="/terms" className="hover:text-foreground hover:underline">
                  Terms
                </Link>
                <span>•</span>
                <Link href="/takedown" className="hover:text-foreground hover:underline">
                  Takedown
                </Link>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="cursor-pointer text-red-600 focus:text-red-600"
              >
                <LogOut className="mr-2 size-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          // Server fallback - render just avatar button without dropdown functionality
          <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-full" disabled>
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={getAvatarUrl(user)}
                alt={user?.full_name ?? user?.email?.slice(0, 2).toUpperCase() ?? 'U'}
              />
              <AvatarFallback>
                {user?.full_name
                  ? user.full_name.slice(0, 2).toUpperCase()
                  : (user?.email?.slice(0, 2).toUpperCase() ?? 'U')}
              </AvatarFallback>
            </Avatar>
          </Button>
        )}
      </div>
    </header>
  );
}
