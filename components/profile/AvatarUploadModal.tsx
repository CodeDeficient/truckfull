'use client';

import React from 'react';
import { BaseModal } from '@/components/ui/modal/BaseModal';
import { SharedAvatarUpload } from './SharedAvatarUpload';

interface AvatarUploadModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly userId: string;
  readonly currentUrl?: string;
  readonly onUploaded?: (publicUrl: string) => void | Promise<void>;
}

// Helper function to handle preview removal
const handleRemovePreview = () => {
  // Reset preview state if needed
};

export function AvatarUploadModal({
  isOpen,
  onClose,
  userId,
  currentUrl,
  onUploaded,
}: AvatarUploadModalProps) {
  const handleCloseModal = () => {
    handleRemovePreview();
    onClose();
  };

  return (
    <BaseModal
      open={isOpen}
      onClose={handleCloseModal}
      title="Upload Avatar"
      contentProps={{ className: 'sm:max-w-md' }}
    >
      <div className="space-y-6">
        <SharedAvatarUpload
          userId={userId}
          currentUrl={currentUrl}
          onUploaded={async (publicUrl) => {
            if (onUploaded) {
              await onUploaded(publicUrl);
            }
            onClose(); // Close modal after successful upload
          }}
          storageBucket="user-avatars"
          showPreview={true}
          showFileName={true}
          containerClassName="space-y-6"
          inputId="avatar-upload-input"
          showInfoText={true}
          onRemovePreview={handleRemovePreview}
        />
      </div>
    </BaseModal>
  );
}
