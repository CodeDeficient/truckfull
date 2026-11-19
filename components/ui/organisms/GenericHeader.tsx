import React, { useCallback } from 'react';
import Link from '@/components/navigation/IntentLink';

interface HeaderProps {
  readonly title?: string;
  readonly onBack?: () => void;
  readonly backHref?: string;
  readonly showBackButton?: boolean;
  readonly actionButton?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  readonly className?: string;
}

const GenericHeader: React.FC<HeaderProps> = ({
  title,
  onBack,
  backHref = '/',
  showBackButton = true,
  actionButton,
  className = '',
}) => {
  const handleBackClick = useCallback(
    (e: React.MouseEvent) => {
      if (onBack) {
        e.preventDefault();
        onBack();
      }
    },
    [onBack],
  );

  return (
    <header
      className={`bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-40 h-[56px] flex items-center ${className}`}
      role="banner"
      style={{ touchAction: 'none' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between w-full">
          {showBackButton && (
            <Link
              href={backHref}
              onClick={handleBackClick}
              className="text-gray-600 hover:text-gray-800 dark:text-gray-400 flex items-center h-12 min-h-[48px] min-w-[48px] justify-center"
              aria-label="Go back"
            >
              ← Back
            </Link>
          )}

          {title && (
            <h1
              className="text-xl font-semibold text-gray-900 dark:text-white flex-grow text-center px-2"
              aria-label={`${title} page header`}
            >
              {title}
            </h1>
          )}

          {actionButton && (
            <button
              onClick={actionButton.onClick}
              className="text-gray-600 hover:text-gray-800 dark:text-gray-400 flex items-center h-12 min-h-[48px] min-w-[48px] justify-center"
              aria-label={actionButton.label}
            >
              {actionButton.icon && <span className="mr-1">{actionButton.icon}</span>}
              {actionButton.label}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default React.memo(GenericHeader);
