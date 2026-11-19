import React, { useState, useEffect } from 'react';

const MOBILE_USER_AGENT = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

// Define platform type
type Platform = 'mobile' | 'desktop';

// Define the props interface for the UniversalModal component
interface UniversalModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  isDrawer?: boolean; // Determines if the component should render as a drawer or modal
  drawerPosition?: 'left' | 'right' | 'top' | 'bottom'; // Drawer position when isDrawer is true
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'; // Size options for the modal
  disableOutsideClickClose?: boolean; // Whether clicking outside should close the modal
  disableEscapeKeyDown?: boolean; // Whether pressing escape should close the modal
  className?: string; // Additional CSS classes for custom styling
  backdropClassName?: string; // Additional CSS classes for backdrop
  zIndex?: number; // Z-index for modal stacking
  platform?: Platform; // Optional prop to override automatic platform detection
}

// Function to detect platform (mobile/desktop) based on user agent or window properties
const detectPlatform = (): Platform => {
  if (globalThis.window === undefined) {
    // Server-side rendering fallback - default to desktop
    return 'desktop';
  }

  // Check for touch capabilities as a mobile indicator
  if (navigator?.maxTouchPoints > 0) {
    return 'mobile';
  }

  // Check screen size as additional indicator
  if (globalThis.window.innerWidth <= 768) {
    return 'mobile';
  }

  // Additional check using user agent for older browsers
  const userAgent = navigator?.userAgent ?? '';
  if (MOBILE_USER_AGENT.test(userAgent)) {
    return 'mobile';
  }

  return 'desktop';
};

const UniversalModal: React.FC<UniversalModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  isDrawer = false,
  drawerPosition = 'right',
  size = 'md',
  disableOutsideClickClose = false,
  disableEscapeKeyDown = false,
  className = '',
  backdropClassName = '',
  zIndex = 50,
  platform, // Optional prop to override platform detection
}) => {
  const [isClient, setIsClient] = useState(false);
  const [detectedPlatform, setDetectedPlatform] = useState<Platform>('desktop');

  useEffect(() => {
    setIsClient(true);
    // Use provided platform prop if available, otherwise detect automatically
    const platformToUse = platform ?? detectPlatform();
    setDetectedPlatform(platformToUse);
  }, [platform]);

  // Handle escape key to close modal
  useEffect(() => {
    if (!isOpen || disableEscapeKeyDown) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    globalThis.addEventListener?.('keydown', handleEsc);
    return () => globalThis.removeEventListener?.('keydown', handleEsc);
  }, [isOpen, onClose, disableEscapeKeyDown]);

  // Prevent scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Don't render on the server or if not client-side yet
  if (!isClient) {
    return null;
  }

  // Size mapping for modal
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full',
  };

  // Render nothing if not open
  if (!isOpen) {
    return null;
  }

  // Determine if it should be a drawer or modal based on isDrawer prop or platform detection
  // If isDrawer is explicitly set to true, always render as drawer
  // If isDrawer is explicitly set to false, never render as drawer (always modal)
  // If isDrawer is undefined, use platform detection (mobile = drawer, desktop = modal)
  const shouldRenderAsDrawer =
    isDrawer === true || (isDrawer == undefined && isClient && detectedPlatform === 'mobile');

  if (shouldRenderAsDrawer) {
    // Drawer positioning classes
    const drawerPositionClasses = {
      left: 'left-0 top-0 h-full transform-none',
      right: 'right-0 top-0 h-full transform-none',
      top: 'top-0 left-0 w-full transform-none',
      bottom: 'bottom-0 left-0 w-full transform-none',
    };

    return (
      <div
        role="button"
        tabIndex={-1}
        className={`fixed inset-0 bg-black bg-opacity-50 flex z-${zIndex} ${backdropClassName}`}
        onClick={disableOutsideClickClose ? undefined : onClose}
        onKeyDown={disableOutsideClickClose ? undefined : (e) => e.key === 'Enter' && onClose()}
      >
        <div
          role="dialog"
          aria-modal="true"
          className={`absolute bg-white shadow-xl transition-transform duration-300 ease-in-out ${drawerPositionClasses[drawerPosition]} ${
            sizeClasses[size]
          } ${className}`}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {title != undefined && title !== '' && (
            <div className="border-b p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">{title}</h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 text-2xl"
                aria-label="Close"
              >
                &times;
              </button>
            </div>
          )}
          <div className="p-4 overflow-auto">{children}</div>
        </div>
      </div>
    );
  }

  // Modal implementation
  return (
    <div
      role="button"
      tabIndex={-1}
      className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-${zIndex} p-4 ${backdropClassName}`}
      onClick={disableOutsideClickClose ? undefined : onClose}
      onKeyDown={disableOutsideClickClose ? undefined : (e) => e.key === 'Enter' && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`bg-white rounded-lg shadow-xl overflow-hidden transition-opacity duration-300 max-h-[90vh] overflow-auto ${sizeClasses[size]} ${className}`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {title != undefined && title !== '' && (
          <div className="border-b p-4 flex justify-between items-center">
            <h2 className="text-xl font-bold">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
              aria-label="Close"
            >
              &times;
            </button>
          </div>
        )}
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};

export default UniversalModal;
