'use client';

import { useEffect, useState } from 'react';
import { User as UserIcon, Mail, Calendar, Camera } from 'lucide-react';
import { BaseModal } from '@/components/ui/modal/BaseModal';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useProfileModalStore } from '@/lib/stores/useProfileModalStore';
import { useSafeAuth } from '@/lib/auth/useSafeAuth';
import { getUserDisplayName } from '@/components/auth/AvatarMenu.utils';
import type { UserMetadata } from '@/lib/types';
import { AvatarUploadModal } from '@/components/profile/AvatarUploadModal';
import { getSupabase } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useModalLifecycle } from '@/hooks/useModalLifecycle';
import { logDebug, logError } from '@/lib/logging';

function ProfileAvatar({
  avatarUrl,
  displayName,
  onEditClick,
}: Readonly<{
  avatarUrl: string | undefined;
  displayName: string;
  onEditClick: () => void;
}>) {
  return (
    <div
      role="button"
      tabIndex={0}
      className="relative group cursor-pointer"
      onClick={onEditClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onEditClick();
        }
      }}
    >
      {avatarUrl != undefined && avatarUrl.length > 0 ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={displayName}
          className="w-20 h-20 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700 transition-all group-hover:border-blue-500"
        />
      ) : (
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center border-2 border-slate-200 dark:border-slate-700 transition-all group-hover:border-blue-400">
          <UserIcon className="w-10 h-10 text-white" />
        </div>
      )}
      {/* Edit Icon Overlay */}
      <div className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-2 shadow-lg border-2 border-white dark:border-slate-900 transition-all group-hover:bg-blue-500 group-hover:scale-110">
        <Camera className="w-4 h-4 text-white" />
      </div>
    </div>
  );
}

function ProfileHeader({
  displayName,
  email,
  formattedCreatedAt,
  avatarUrl,
  onEditAvatar,
}: Readonly<{
  displayName: string;
  email: string | undefined;
  formattedCreatedAt: string | undefined;
  avatarUrl: string | undefined;
  onEditAvatar: () => void;
}>) {
  return (
    <div className="flex flex-col items-center space-y-4">
      <ProfileAvatar avatarUrl={avatarUrl} displayName={displayName} onEditClick={onEditAvatar} />
      <div className="text-center">
        <h3 className="text-lg font-semibold">{displayName}</h3>
        {email != undefined && email.length > 0 && (
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
            <Mail className="w-4 h-4" />
            {email}
          </p>
        )}
        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1">
          <Calendar className="w-3 h-3" />
          Member since {formattedCreatedAt}
        </p>
      </div>
    </div>
  );
}

function AccountActions() {
  return (
    <div className="space-y-3">
      <Button variant="outline" className="w-full justify-start" disabled>
        <UserIcon className="w-4 h-4 mr-2" />
        Edit Profile
      </Button>
    </div>
  );
}

/**
 * Profile modal component
 * Displays user profile information and account actions
 */
export function ProfileModal() {
  const { isOpen, closeModal } = useProfileModalStore();
  const { user } = useSafeAuth();
  const { dialogRef, onOpen, onClose } = useModalLifecycle(closeModal);
  const [isAvatarUploadOpen, setIsAvatarUploadOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      onOpen();
    } else {
      onClose();
    }
  }, [isOpen, onOpen, onClose]);

  const supabase: SupabaseClient = getSupabase() as SupabaseClient;

  const handleAvatarUploaded = async (url: string) => {
    try {
      // Update user's avatar in auth metadata
      await supabase.auth.updateUser({ data: { avatar_url: url } });

      if (user?.id) {
        const response = await fetch('/api/owner/trucks/avatar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });
        if (!response.ok) {
          logError('Error updating truck avatars:', response.status);
          return;
        }
        const { updated } = (await response.json()) as { updated: number };
        if (updated > 0) logDebug(`✓ Updated ${updated} truck(s) with new avatar`);
      }
    } catch (error) {
      logError('Error updating avatar:', error);
      // Don't throw - we want to show success even if truck updates fail
    }
  };

  const handleOpenAvatarUpload = () => {
    setIsAvatarUploadOpen(true);
  };

  const handleCloseAvatarUpload = () => {
    setIsAvatarUploadOpen(false);
  };

  if (!user) {
    // React components conventionally return null to render nothing.

    return;
  }

  const displayName = getUserDisplayName(user);
  const metadata = user.user_metadata as UserMetadata;
  const hasPrimaryAvatar =
    typeof metadata?.avatar_url === 'string' && metadata.avatar_url.length > 0;
  const fallbackAvatar = typeof metadata?.picture === 'string' ? metadata.picture : undefined;
  const avatarUrl: string | undefined = hasPrimaryAvatar
    ? (metadata.avatar_url as string)
    : fallbackAvatar;
  const createdAt = user.created_at;
  const formattedCreatedAt = createdAt
    ? new Date(createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : undefined;

  return (
    <>
      <BaseModal
        open={isOpen}
        onClose={closeModal}
        title={<span className="text-center w-full block">Your Profile</span>}
        ref={dialogRef}
        contentProps={{ className: 'sm:max-w-md' }}
      >
        <div className="space-y-6">
          <ProfileHeader
            displayName={displayName}
            email={user.email ?? undefined}
            formattedCreatedAt={formattedCreatedAt}
            avatarUrl={avatarUrl}
            onEditAvatar={handleOpenAvatarUpload}
          />

          <Separator />

          <AccountActions />
        </div>
      </BaseModal>

      <AvatarUploadModal
        isOpen={isAvatarUploadOpen}
        onClose={handleCloseAvatarUpload}
        userId={user.id}
        currentUrl={avatarUrl}
        onUploaded={(url) => {
          void handleAvatarUploaded(url);
        }}
      />
    </>
  );
}
