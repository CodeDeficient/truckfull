'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Mail, Calendar, LogOut, ArrowLeft, Settings, Heart, Phone, Globe } from 'lucide-react';
import { getUserDisplayName, getUserInitials } from '@/components/auth/AvatarMenu.utils';
import { useIsClient } from '@/hooks/useIsClient';
import { MobileErrorBoundary } from '@/components/mobile/MobileErrorBoundary';
import { MobilePageLoader } from '@/components/mobile/MobileLoadingSpinner';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { logError } from '@/lib/logging';

interface UserProfileProps {
  readonly user?: SupabaseUser | null;
  readonly onSignOut?: () => Promise<void>;
  readonly onBack?: () => void;
}

const ProfileAvatar = ({
  avatarUrl,
  displayName,
  initials,
}: Readonly<{
  avatarUrl: string | undefined;
  displayName: string;
  initials: string;
}>) => {
  return (
    <div className="relative">
      {avatarUrl != undefined && avatarUrl.length > 0 ? (
        <Image
          src={avatarUrl}
          alt={displayName}
          width={96}
          height={96}
          className="rounded-full object-cover mx-auto"
        />
      ) : (
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto">
          <span className="text-2xl font-bold text-white">{initials}</span>
        </div>
      )}
    </div>
  );
};

const ProfileHeader = ({
  displayName,
  email,
  formattedCreatedAt,
  avatarUrl,
  initials,
}: Readonly<{
  displayName: string;
  email: string | undefined;
  formattedCreatedAt: string | undefined;
  avatarUrl: string | undefined;
  initials: string;
}>) => {
  return (
    <div className="text-center space-y-4">
      <ProfileAvatar avatarUrl={avatarUrl} displayName={displayName} initials={initials} />
      <div>
        <h1 className="text-2xl font-bold text-white">{displayName}</h1>
        {email != undefined && email.length > 0 && (
          <p className="text-gray-400 flex items-center justify-center gap-2 mt-1">
            <Mail className="w-4 h-4" />
            {email}
          </p>
        )}
        <p className="text-gray-500 flex items-center justify-center gap-2 mt-1 text-sm">
          <Calendar className="w-3 h-3" />
          Member since {formattedCreatedAt}
        </p>
      </div>
    </div>
  );
};

const handleSettingsClick = () => {
  globalThis.location.href = '/@mobile/app_settings';
};

const handleFavoritesClick = () => {
  globalThis.location.href = '/@mobile/favorites';
};

const ProfileActions = () => {
  return (
    <div className="space-y-3">
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-4">
          <Button
            variant="outline"
            size="mobile"
            className="w-full justify-start text-white border-white/20 hover:bg-white/10"
            onClick={handleSettingsClick}
          >
            <Settings className="w-4 h-4 mr-3" />
            Account Settings
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-4">
          <Button
            variant="outline"
            size="mobile"
            className="w-full justify-start text-white border-white/20 hover:bg-white/10"
            onClick={handleFavoritesClick}
          >
            <Heart className="w-4 h-4 mr-3" />
            My Favorites
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

const ContactSection = ({
  phone,
  website,
}: Readonly<{
  phone: string | undefined;
  website: string | undefined;
}>) => {
  if (!phone && !website) return null;

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white text-lg">Contact Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {phone && (
          <div className="flex items-center gap-3 text-gray-300">
            <Phone className="w-4 h-4" />
            <span>{phone}</span>
          </div>
        )}
        {website && (
          <div className="flex items-center gap-3 text-gray-300">
            <Globe className="w-4 h-4" />
            <a
              href={website}
              className="text-blue-400 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {website}
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default function UserProfile({ user: propUser, onSignOut, onBack }: UserProfileProps) {
  const [user, setUser] = useState<SupabaseUser | null>(propUser ?? null);
  const [signingOut, setSigningOut] = useState(false);
  const isClient = useIsClient();

  useEffect(() => {
    // For now, use mock user data since we need to implement auth
    // This will be replaced with actual auth integration
    const mockUser = {
      id: 'mock-user-id',
      email: 'user@example.com',
      created_at: isClient ? new Date().toISOString() : '2024-01-01T00:00:00.000Z',
      user_metadata: {
        full_name: 'John Doe',
        phone: '+1 (555) 123-4567',
        website: 'https://johndoe.com',
      },
      app_metadata: {},
      aud: 'authenticated',
    } as SupabaseUser;

    setUser(mockUser);
  }, [propUser, isClient]);

  const handleSignOut = async (): Promise<void> => {
    if (!onSignOut) return;

    try {
      setSigningOut(true);
      await onSignOut();
    } catch (error_) {
      logError('Sign out failed:', error_);
    } finally {
      setSigningOut(false);
    }
  };

  const handleBack = (): void => {
    if (onBack) {
      onBack();
    } else {
      globalThis.history.back();
    }
  };

  if (!user) {
    return (
      <div
        className="relative flex size-full min-h-screen flex-col bg-black dark justify-between group/design-root overflow-x-hidden"
       
      >
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="text-white text-lg mb-4">Please sign in to view your profile</div>
            <Button
              size="mobile"
              onClick={handleBack}
              className="bg-[var(--primary-color)] text-white"
            >
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const displayName = getUserDisplayName(user);
  const initials = getUserInitials(user);
  const metadata = user.user_metadata as Record<string, unknown> | null | undefined;
  const avatarUrl = typeof metadata?.avatar_url === 'string' ? metadata.avatar_url : undefined;
  const phone = typeof metadata?.phone === 'string' ? metadata.phone : undefined;
  const website = typeof metadata?.website === 'string' ? metadata.website : undefined;

  const createdAt = user.created_at;
  const formattedCreatedAt = createdAt
    ? new Date(createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : undefined;

  return (
    <MobileErrorBoundary>
      <Suspense fallback={<MobilePageLoader message="Loading profile..." />}>
        <div
          className="relative flex size-full min-h-screen flex-col bg-black dark justify-between group/design-root overflow-x-hidden"
         
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <Button
              variant="ghost"
              size="mobile-icon"
              onClick={handleBack}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-xl font-bold text-white">Profile</h1>
            <div className="w-16" /> {/* Spacer for centering */}
          </div>

          {/* Content */}
          <div className="flex-grow p-4 space-y-6">
            <ProfileHeader
              displayName={displayName}
              email={user.email ?? undefined}
              formattedCreatedAt={formattedCreatedAt}
              avatarUrl={avatarUrl}
              initials={initials}
            />

            <Separator className="bg-white/10" />

            <ProfileActions />

            <ContactSection phone={phone} website={website} />

            <Separator className="bg-white/10" />

            {/* Sign Out Button */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4">
                <Button
                  variant="destructive"
                  size="mobile"
                  className="w-full"
                  onClick={() => {
                    void handleSignOut();
                  }}
                  disabled={signingOut}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {signingOut ? 'Signing Out...' : 'Sign Out'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </Suspense>
    </MobileErrorBoundary>
  );
}
