import React, { useCallback } from 'react';
import Link from '@/components/navigation/IntentLink';

interface BottomNavItem {
  readonly id: string;
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly href?: string;
  readonly isActive?: boolean;
  readonly onClick?: () => void;
}

interface BottomNavigationProps {
  readonly items: BottomNavItem[];
  readonly className?: string;
}

const GenericBottomNavigation: React.FC<BottomNavigationProps> = ({ items, className = '' }) => {
  const handleClick = useCallback((item: BottomNavItem, e: React.MouseEvent) => {
    if (item.onClick) {
      e.preventDefault();
      item.onClick();
    }
  }, []);

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 ${className}`}
      role="navigation"
      aria-label="Bottom navigation"
      style={{ touchAction: 'none', zIndex: 40 }}
    >
      <div className="flex justify-between items-center max-w-md mx-auto px-4 py-3">
        {items.map((item) => {
          const linkProps = item.href
            ? { href: item.href }
            : { href: '#', onClick: (e: React.MouseEvent) => handleClick(item, e) };

          return (
            <Link
              key={item.id}
              {...linkProps}
              className={`flex flex-col items-center justify-center flex-1 py-3 px-2 transition-colors ${
                item.isActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
              aria-current={item.isActive ? 'page' : undefined}
            >
              <span className="flex items-center justify-center">{item.icon}</span>
              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default React.memo(GenericBottomNavigation);
