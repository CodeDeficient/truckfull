'use client';

import React, { ReactNode } from 'react';
import useModal from '../hooks/useModal';
import { TruckDetailsModal } from './TruckDetailsModal';
import { AuthModal } from './auth/AuthModal';
import { ProfileModal } from './profile/ProfileModal';
import { SettingsModal } from './settings/SettingsModal';
import { BaseModal } from './ui/modal/BaseModal';
import type { FoodTruck } from '@/lib/types';
import { logWarning } from '@/lib/logging';

// Define expected modal prop types for type safety
interface TruckDetailsModalProps {
  truck?: FoodTruck;
}

interface GenericModalProps {
  title?: string;
  description?: string;
  children?: ReactNode;
}

// Props for the ModalManager component
interface ModalManagerProps {
  children: ReactNode;
}

// ModalManager component that uses the shared modal context
const ModalManager: React.FC<ModalManagerProps> = ({ children }) => {
  const { isOpen, type, props: modalProps, closeModal } = useModal();

  // Render the appropriate modal component based on the modal type
  const renderModal = () => {
    if (!isOpen || !type) {
      return null;
    }

    // Provide default empty props if modalProps is undefined
    const props = modalProps ?? {};

    switch (type) {
      case 'truck-details': {
        // Type-safe access for truck details modal props
        const truckDetailsProps = props as TruckDetailsModalProps;
        const truck = truckDetailsProps.truck;
        return <TruckDetailsModal truck={truck} isOpen={!!isOpen} onClose={() => closeModal()} />;
      }
      case 'settings': {
        // SettingsModal can accept external isOpen/onClose props but defaults to internal store
        return <SettingsModal isOpen={isOpen} onClose={() => closeModal()} {...props} />;
      }
      case 'profile': {
        // ProfileModal uses internal store and doesn't accept external isOpen/onClose
        // We'll render it conditionally based on the modal context
        return isOpen ? <ProfileModal /> : null;
      }
      case 'auth': {
        // AuthModal requires 'mounted' prop in addition to isOpen and onClose
        return <AuthModal {...props} mounted={true} isOpen={isOpen} onClose={() => closeModal()} />;
      }
      case 'filter-settings': {
        // FilterSettingsModal is designed as a self-contained dialog that controls its own state
        // This modal type might not be appropriate for the modal context system
        logWarning('filter-settings modal type may not be compatible with modal context system');
        return null;
      }
      case 'generic': {
        // Type-safe access for generic modal props
        const genericProps = props as GenericModalProps;
        const title = genericProps.title;
        const description = genericProps.description;
        const modalChildren = genericProps.children;
        return (
          <BaseModal
            open={!!isOpen}
            onClose={() => closeModal()}
            title={title ?? 'Modal'}
            description={description}
          >
            {modalChildren}
          </BaseModal>
        );
      }
      case 'confirmation':
      case 'alert':
      case 'menu':
      case 'image':
      case 'form':
      case 'loading':
      case 'error':
      case 'success': {
        // For other modal types, we can render a generic modal or a specific component
        // depending on what the app needs. For now, using BaseModal as default.
        // Type-safe access for generic modal props
        const genericProps = props as GenericModalProps;
        const title = genericProps.title;
        const description = genericProps.description;
        const modalChildren = genericProps.children;
        return (
          <BaseModal
            open={!!isOpen}
            onClose={() => closeModal()}
            title={title ?? (type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Modal')}
            description={description}
          >
            {modalChildren}
          </BaseModal>
        );
      }
      default: {
        logWarning(`Unknown modal type: ${String(type)}`);
        return null;
      }
    }
  };

  return (
    <>
      {children}
      {renderModal()}
    </>
  );
};

export { ModalManager };
