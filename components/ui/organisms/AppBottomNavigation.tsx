import React, { useCallback } from 'react';
import { MapPin, Search, Star, Heart, Key } from 'lucide-react';
import { useTierAccess } from '@/hooks/useTierAccess';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  route: string;
}

import { useRouter } from 'next/navigation';

interface MobileBottomNavigationProps {
  activeItem?: string;
  className?: string;
  onItemClick?: (id: string) => void;
}

const AppBottomNavigation: React.FC<MobileBottomNavigationProps> = ({
  activeItem = 'near-me',
  className,
  onItemClick,
}) => {
  const { isOwner } = useTierAccess();
  const router = useRouter();

  const baseNavItems: NavItem[] = [
    {
      id: 'near-me',
      label: 'Near Me',
      icon: MapPin as React.ComponentType<React.SVGProps<SVGSVGElement>>,
      route: '@mobile',
    },
    {
      id: 'discover',
      label: 'Discover',
      icon: Search as React.ComponentType<React.SVGProps<SVGSVGElement>>,
      route: 'discover',
    },
    {
      id: 'featured',
      label: 'Featured',
      icon: Star as React.ComponentType<React.SVGProps<SVGSVGElement>>,
      route: 'featured',
    },
    {
      id: 'favorites',
      label: 'Favorites',
      icon: Heart as React.ComponentType<React.SVGProps<SVGSVGElement>>,
      route: 'favorites',
    },
  ];

  const navItems = isOwner
    ? [
        ...baseNavItems,
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: Key as React.ComponentType<React.SVGProps<SVGSVGElement>>,
          route: 'owner-dashboard',
        },
      ]
    : baseNavItems;

  const handleItemClick = useCallback(
    (id: string) => {
      if (id === 'dashboard') {
        // Owner dashboard is responsive - works on both mobile and desktop
        router.push('/owner-dashboard');
        return;
      }

      if (onItemClick) {
        onItemClick(id);
      }
      // The parent component handles the actual route navigation
    },
    [onItemClick, router],
  );

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-lg border-t border-white/10 shadow-2xl ${className ?? ''}`}
      role="navigation"
      aria-label="Main navigation"
      style={{ touchAction: 'none' }}
    >
      <div
        className={`grid ${isOwner ? 'grid-cols-5' : 'grid-cols-4'} justify-items-center max-w-md mx-auto px-2 py-3 gap-0`}
      >
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleItemClick(item.id)}
            className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-200 min-h-[48px] ${
              item.id === activeItem
                ? 'text-white bg-[#ef4444]/30 shadow-[0_0_3px_1px_#ef4444]'
                : 'text-[#ef4444] hover:text-white hover:bg-[#ef4444]/20 active:scale-95'
            }`}
            aria-current={item.id === activeItem ? 'page' : undefined}
            aria-label={item.label}
          >
            <item.icon className="w-6 h-6 mb-1" aria-hidden="true" />
            <span className="text-xs font-medium leading-tight">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default React.memo(AppBottomNavigation);
