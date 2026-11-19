import React from 'react';
import Link from '@/components/navigation/IntentLink';

interface BottomNavBarProps {
  activePage?: 'home' | 'analytics' | 'profile';
  className?: string;
}

const BottomNavBar: React.FC<BottomNavBarProps> = ({ activePage = 'home', className = '' }) => {
  const navItems = [
    { id: 'home', label: 'Home', icon: 'home', href: '/' },
    { id: 'analytics', label: 'Analytics', icon: 'bar_chart', href: '/analytics' },
    { id: 'profile', label: 'Profile', icon: 'person', href: '/profile' },
  ];

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 bg-[#181111]/80 backdrop-blur-sm border-t border-white/10 ${className}`}
    >
      <nav
        className="flex justify-between items-center max-w-md mx-auto px-4 py-3"
        role="navigation"
        aria-label="Main navigation"
      >
        {navItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`flex flex-col items-center justify-center flex-1 py-3 px-2 ${
              activePage === item.id ? 'text-white' : 'text-white/60'
            }`}
            aria-current={activePage === item.id ? 'page' : undefined}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <p className="text-xs font-medium leading-normal tracking-[0.015em] mt-1">
              {item.label}
            </p>
          </Link>
        ))}
      </nav>
    </div>
  );
};

export default React.memo(BottomNavBar);
