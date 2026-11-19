'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Truck,
  Utensils,
  Calendar,
  BarChart3,
  Settings,
  MapPin,
  Menu,
  CreditCard,
  TrendingUp,
  Map,
  CalendarDays,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

/* ────────────────────────── types ────────────────────────── */

interface NavItem {
  readonly href: string;
  readonly icon: React.ElementType;
  readonly label: string;
  readonly tier?: string;
  readonly isExternal?: boolean;
}

/* ──────────────────────── data arrays ─────────────────────── */

const myBusinessItems: NavItem[] = [
  { href: '/owner-dashboard', icon: BarChart3, label: 'Overview' },
  { href: '/owner-dashboard/trucks', icon: Truck, label: 'My Trucks' },
];

const truckManagementItems: NavItem[] = [
  { href: '/owner-dashboard/location', icon: MapPin, label: 'Update Location' },
  { href: '/owner-dashboard/menu', icon: Utensils, label: 'Menu' },
  { href: '/owner-dashboard/schedule', icon: Calendar, label: 'Schedule' },
  { href: '/owner-dashboard/events', icon: CalendarDays, label: 'Events' },
];

const growthItems: NavItem[] = [
  { href: '/owner-dashboard/field-guide', icon: Map, label: 'Field Guide', tier: 'pro' },
  { href: '/owner-dashboard/analytics', icon: TrendingUp, label: 'Analytics' },
  {
    href: '/owner-dashboard/facebook',
    icon: RefreshCw,
    label: 'Automatic Updates',
    tier: 'pro',
  },
];

const accountItems: NavItem[] = [
  { href: '/owner-dashboard/billing', icon: CreditCard, label: 'Billing' },
  { href: '/owner-dashboard/settings', icon: Settings, label: 'Settings' },
  {
    href: 'mailto:support@truckfull.food?subject=Owner Support Request',
    icon: HelpCircle,
    label: 'Get Support',
    isExternal: true,
  },
];

/* ───────────────────── module helpers ─────────────────────── */

function isItemActive(item: NavItem, pathname: string | null): boolean {
  if (pathname === item.href) return true;
  if (
    item.href === '/owner-dashboard/trucks' &&
    pathname?.startsWith('/owner-dashboard/edit/')
  ) {
    return true;
  }
  return false;
}

const tierColors: Record<string, string> = {
  pro: 'bg-amber-500 text-white',
};

function SectionHeader({ title }: { readonly title: string }) {
  return (
    <h2 className="px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
      {title}
    </h2>
  );
}

interface NavButtonProps {
  readonly item: NavItem;
  readonly isActive: boolean;
  readonly onItemClick: (href: string) => void;
}

function NavButton({ item, isActive, onItemClick }: NavButtonProps) {
  const Icon = item.icon;

  function handleClick(): void {
    onItemClick(item.href);
  }

  if (item.tier) {
    return (
      <button
        onClick={handleClick}
        className={cn(
          'flex items-center justify-between w-full px-5 py-2 rounded-md transition-colors text-left',
          isActive
            ? 'bg-accent text-accent-foreground font-medium'
            : 'hover:bg-accent/10 active:bg-accent/20',
          'mb-1',
        )}
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <span>{item.label}</span>
        </div>
        <span
          className={cn(
            'text-xs px-2 py-0.5 rounded-full font-medium uppercase tracking-wider',
            tierColors[item.tier] ?? 'bg-gray-500/10 text-gray-600',
          )}
        >
          {item.tier.charAt(0).toUpperCase() + item.tier.slice(1)}
        </span>
      </button>
    );
  }

  if (item.isExternal) {
    return (
      <a
        href={item.href}
        className={cn(
          'flex items-center gap-2 px-5 py-2 rounded-md transition-colors w-full text-left',
          'hover:bg-accent/10 active:bg-accent/20 mb-1',
        )}
        rel="noopener noreferrer"
      >
        <Icon className="h-4 w-4" />
        <span>{item.label}</span>
      </a>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        'flex items-center gap-2 px-5 py-2 rounded-md transition-colors w-full text-left',
        isActive
          ? 'bg-accent text-accent-foreground font-medium'
          : 'hover:bg-accent/10 active:bg-accent/20',
        'mb-1',
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{item.label}</span>
    </button>
  );
}

/* ────────────────── MobileSidebar component ──────────────── */

interface MobileSidebarProps {
  readonly children: React.ReactNode;
}

export function MobileSidebar({ children }: MobileSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const handleItemClick = (href: string) => {
    router.push(href);
    setIsOpen(false);
  };

  return (
    <div className="flex flex-col md:hidden">
      <header className="flex h-16 items-center justify-between border-b px-4">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <nav className="mt-4 p-2">
              <SectionHeader title="My Business" />
              {myBusinessItems.map((item) => (
                <NavButton
                  key={item.href}
                  item={item}
                  isActive={isItemActive(item, pathname)}
                  onItemClick={handleItemClick}
                />
              ))}

              <SectionHeader title="Truck Management" />
              {truckManagementItems.map((item) => (
                <NavButton
                  key={item.href}
                  item={item}
                  isActive={isItemActive(item, pathname)}
                  onItemClick={handleItemClick}
                />
              ))}

              <SectionHeader title="Growth" />
              {growthItems.map((item) => (
                <NavButton
                  key={item.href}
                  item={item}
                  isActive={isItemActive(item, pathname)}
                  onItemClick={handleItemClick}
                />
              ))}

              <SectionHeader title="Account" />
              {accountItems.map((item) => (
                <NavButton
                  key={item.href}
                  item={item}
                  isActive={isItemActive(item, pathname)}
                  onItemClick={handleItemClick}
                />
              ))}
            </nav>
          </SheetContent>
        </Sheet>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <div className="w-10"></div> {/* Spacer for alignment */}
      </header>
      <main className="flex-1 overflow-y-auto p-4">{children}</main>
    </div>
  );
}
