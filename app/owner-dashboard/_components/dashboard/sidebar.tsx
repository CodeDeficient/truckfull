'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from '@/components/navigation/IntentLink';
import Image from 'next/image';
import { useAdminAuth } from '@/lib/hooks/useAdminAuth';
import {
  Truck,
  Utensils,
  Calendar,
  BarChart3,
  Settings,
  MapPin,
  TrendingUp,
  CreditCard,
  X,
  HelpCircle,
  CalendarDays,
  Crown,
  Map,
  RefreshCw,
  FileSearch,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

const adminItems: NavItem[] = [
  { href: '/owner-dashboard/relevance-review', icon: FileSearch, label: 'Relevance Review' },
];

/* ───────────────────── module helpers ─────────────────────── */

function isItemActive(item: NavItem, pathname: string | null): boolean {
  if (pathname === item.href) return true;
  if (item.href === '/owner-dashboard/trucks' && pathname?.startsWith('/owner-dashboard/edit/')) {
    return true;
  }
  return false;
}

const tierColors: Record<string, string> = {
  pro: 'bg-amber-500/15 text-amber-400',
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
          'flex items-center gap-3 px-3 py-2 rounded-md transition-colors w-full text-left justify-between group',
          isActive
            ? 'bg-primary/10 text-primary font-semibold'
            : 'hover:bg-primary/5 hover:text-primary text-foreground',
        )}
      >
        <div className="flex items-center gap-3">
          <Icon className={cn('h-4 w-4', isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-primary')} />
          <span className="text-sm">{item.label}</span>
        </div>
        <span
          className={cn(
            'flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium',
            tierColors[item.tier] ?? 'bg-gray-500/10 text-gray-600',
          )}
        >
          <Crown className="h-3 w-3" />
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
          'flex items-center gap-3 px-3 py-2 rounded-md transition-colors w-full text-left group text-foreground',
          'hover:bg-primary/5 hover:text-primary',
        )}
        rel="noopener noreferrer"
      >
        <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
        <span className="text-sm">{item.label}</span>
      </a>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-md transition-colors w-full text-left group',
        isActive
          ? 'bg-primary/10 text-primary font-semibold'
          : 'hover:bg-primary/5 hover:text-primary text-foreground',
      )}
    >
      <Icon className={cn('h-4 w-4', isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-primary')} />
      <span className="text-sm">{item.label}</span>
    </button>
  );
}

/* ────────────────── DashboardSidebar component ──────────────── */

interface DashboardSidebarProps {
  readonly className?: string;
  readonly onNavigate?: () => void;
}

export function DashboardSidebar({ className, onNavigate }: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAdmin } = useAdminAuth();

  const handleItemClick = (href: string) => {
    router.push(href);
    onNavigate?.();
  };

  return (
    <aside
      className={cn('w-64 px-4 pb-4 pt-0 md:p-4 bg-card', className)}
    >
      <div className="flex items-center justify-between mb-2 px-2 pt-1">
        <div className="flex items-center gap-2">
          <Link href="/" className="block shrink-0 hover:opacity-80 transition-opacity">
            <Image
              src="/truckfull-icon-transparent.webp"
              alt="TruckFull Logo"
              width={92}
              height={64}
              className="h-16 object-contain w-auto"
              sizes="92px"
              priority
            />
          </Link>
          <Link
            href="/"
            className="font-lobster text-white text-2xl font-bold neon-glow-reduced hover:opacity-80 transition-opacity"
          >
            TruckFull
          </Link>
        </div>
        <button
          onClick={onNavigate}
          className="md:hidden p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close sidebar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="space-y-1">
        {/* MY BUSINESS */}
        <SectionHeader title="My Business" />
        {myBusinessItems.map((item) => (
          <NavButton
            key={item.href}
            item={item}
            isActive={isItemActive(item, pathname)}
            onItemClick={handleItemClick}
          />
        ))}

        {/* TRUCK MANAGEMENT */}
        <SectionHeader title="Truck Management" />
        {truckManagementItems.map((item) => (
          <NavButton
            key={item.href}
            item={item}
            isActive={isItemActive(item, pathname)}
            onItemClick={handleItemClick}
          />
        ))}

        {/* GROWTH */}
        <SectionHeader title="Growth" />
        {growthItems.map((item) => (
          <NavButton
            key={item.href}
            item={item}
            isActive={isItemActive(item, pathname)}
            onItemClick={handleItemClick}
          />
        ))}

        {/* ACCOUNT */}
        <SectionHeader title="Account" />
        {accountItems.map((item) => (
          <NavButton
            key={item.href}
            item={item}
            isActive={isItemActive(item, pathname)}
            onItemClick={handleItemClick}
          />
        ))}

        {/* ADMIN — only shown to admin/superadmin users */}
        {isAdmin && (
          <>
            <SectionHeader title="Admin" />
            {adminItems.map((item) => (
              <NavButton
                key={item.href}
                item={item}
                isActive={isItemActive(item, pathname)}
                onItemClick={handleItemClick}
              />
            ))}
          </>
        )}
      </nav>
    </aside>
  );
}
