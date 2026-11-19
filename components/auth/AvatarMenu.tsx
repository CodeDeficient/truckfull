'use client';

import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/DropdownMenu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { getSupabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from '@/components/navigation/IntentLink';
import {
  User,
  Settings,
  LogOut,
  Loader2,
  Download,
  MessageSquare,
  Truck,
  HelpCircle,
  Facebook,
  CheckCircle,
} from 'lucide-react';
import type { User as SupabaseUser, SupabaseClient } from '@supabase/supabase-js';
import { getUserInitials, getUserDisplayName } from './AvatarMenu.utils';
import { useSettingsModalStore } from '@/lib/stores/useSettingsModalStore';
import { useProfileModalStore } from '@/lib/stores/useProfileModalStore';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { logError } from '@/lib/logging';
import { ClaimYourTruckModal } from '@/components/owner/ClaimYourTruckModal';

interface SettingsModalStore {
  openModal?: (tab?: string, showSidebar?: boolean) => void;
}

interface ProfileModalStore {
  openModal?: (viaRoute?: boolean) => void;
}

interface AvatarMenuProps {
  readonly mounted?: boolean;
  readonly user: SupabaseUser | null | undefined;
  readonly onSignOut?: () => void;
  readonly onProfileClick?: () => void;
  readonly variant?: 'default' | 'organizer';
  readonly onVerifyClick?: () => void;
}

const AvatarMenuContent: React.FC<
  Omit<AvatarMenuProps, 'mounted'> & { onOpenClaimModal: () => void }
> = ({ user, onSignOut, onProfileClick, onOpenClaimModal, variant = 'default', onVerifyClick }) => {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const router = useRouter();
  const settingsModalStore = useSettingsModalStore() as SettingsModalStore;
  const profileModalStore = useProfileModalStore() as ProfileModalStore;
  const supabase: SupabaseClient = getSupabase() as SupabaseClient;
  const { canInstall, install } = usePWAInstall();

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        logError('Sign out error:', error);
        return;
      }
      if (onSignOut) {
        onSignOut();
      }
      router.push('/');
      router.refresh();
    } catch (error) {
      logError('Unexpected sign out error:', error);
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleProfileClick = () => {
    if (onProfileClick) {
      onProfileClick();
    } else if (
      profileModalStore != undefined &&
      typeof profileModalStore.openModal === 'function'
    ) {
      profileModalStore.openModal();
    }
  };

  const handleSettingsClick = () => {
    if (settingsModalStore != undefined && typeof settingsModalStore.openModal === 'function') {
      settingsModalStore.openModal('general', true);
    }
  };

  const displayName = getUserDisplayName(user ?? null);

  return (
    <DropdownMenuContent className="w-56" align="end">
      <div className="flex items-center justify-start gap-2 p-2">
        <div className="flex flex-col space-y-1 leading-none">
          <p className="font-medium text-sm">{displayName}</p>
          {user?.email != undefined && user.email.length > 0 && (
            <p className="text-xs text-muted-foreground truncate max-w-[180px]">{user.email}</p>
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
      {canInstall && (
        <DropdownMenuItem
          onClick={() => {
            void install();
          }}
          className="cursor-pointer"
        >
          <Download className="mr-2 size-4" />
          <span>Install App</span>
        </DropdownMenuItem>
      )}
      <DropdownMenuSeparator />

      {/* Variant specific items */}
      {variant === 'default' ? (
        <DropdownMenuItem onClick={onOpenClaimModal} className="cursor-pointer">
          <Truck className="mr-2 size-4" />
          <span>Claim Your Truck</span>
        </DropdownMenuItem>
      ) : onVerifyClick ? (
        <DropdownMenuItem onClick={() => onVerifyClick()} className="cursor-pointer">
          <CheckCircle className="mr-2 size-4" />
          <span>Get Verified</span>
        </DropdownMenuItem>
      ) : null}

      {/* Send Feedback */}
      <DropdownMenuItem asChild className="cursor-pointer">
        <a href="mailto:support@truckfull.food?subject=Feedback">
          <MessageSquare className="mr-2 size-4" />
          <span>Send Feedback</span>
        </a>
      </DropdownMenuItem>
      {/* Support */}
      <DropdownMenuItem asChild className="cursor-pointer">
        <a href="mailto:support@truckfull.food?subject=Support Request">
          <HelpCircle className="mr-2 size-4" />
          <span>Get Support</span>
        </a>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild className="cursor-pointer">
        <a
          href="https://www.facebook.com/TruckFull.food/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center w-full"
        >
          <Facebook className="mr-2 size-4 text-[#1877F2] fill-current" />
          <span>Follow us on Facebook</span>
        </a>
      </DropdownMenuItem>
      {/* Legal Links */}
      <div className="px-2 py-1.5">
        <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground">
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
      </div>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={() => {
          void handleSignOut();
        }}
        disabled={isSigningOut}
        className="cursor-pointer text-red-400 focus:text-red-400"
      >
        {isSigningOut ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <LogOut className="mr-2 size-4" />
        )}
        <span>Sign out</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
};

export const AvatarMenu: React.FC<AvatarMenuProps> = ({
  mounted = true,
  user,
  onSignOut,
  onProfileClick,
  variant = 'default',
  onVerifyClick,
}) => {
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);

  if (!mounted || !user) {
    return <></>;
  }

  const userInitials = getUserInitials(user);
  const displayName = getUserDisplayName(user);
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const avatarUrlRaw = metadata.avatar_url ?? metadata.picture;
  const avatarUrl = typeof avatarUrlRaw === 'string' ? avatarUrlRaw : undefined;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full hover:bg-accent">
            <Avatar className="h-8 w-8">
              {avatarUrl != undefined && avatarUrl.length > 0 ? (
                <AvatarImage src={avatarUrl} alt={displayName} className="object-cover" />
              ) : undefined}
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                {userInitials ?? '?'}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <AvatarMenuContent
          user={user}
          onSignOut={onSignOut}
          onProfileClick={onProfileClick}
          onOpenClaimModal={() => setIsClaimModalOpen(true)}
          variant={variant}
          onVerifyClick={onVerifyClick}
        />
      </DropdownMenu>

      <ClaimYourTruckModal isOpen={isClaimModalOpen} onClose={() => setIsClaimModalOpen(false)} />
    </>
  );
};
