'use client';

import React from 'react';
import { SharedAvatarUpload } from './SharedAvatarUpload';

interface AvatarUploadProps {
  readonly userId: string;
  readonly currentUrl?: string;
  readonly onUploaded?: (publicUrl: string) => void | Promise<void>;
}

export default function AvatarUpload({ userId, currentUrl, onUploaded }: AvatarUploadProps) {
  return (
    <SharedAvatarUpload
      userId={userId}
      currentUrl={currentUrl}
      onUploaded={onUploaded}
      storageBucket="public"
    />
  );
}
