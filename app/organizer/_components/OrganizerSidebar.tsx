'use client';

import Link from '@/components/navigation/IntentLink';
import Image from 'next/image';
import { type ComponentType } from 'react';
import { BarChart3, Calendar, HelpCircle, X, Users, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DashboardView = 'overview' | 'events' | 'applications' | 'verify';

interface OrganizerSidebarProps {
  readonly className?: string;
  readonly onNavigate?: () => void;
  readonly currentView: DashboardView;
  readonly onViewChange: (view: DashboardView) => void;
}

const navItems: {
  view?: DashboardView;
  icon: ComponentType<{ className?: string }>;
  label: string;
  href?: string;
  isExternal?: boolean;
}[] = [
  { view: 'overview', icon: BarChart3, label: 'Overview' },
  { view: 'events', icon: Calendar, label: 'My Events' },
  { view: 'applications', icon: Users, label: 'Applications' },
  { view: 'verify', icon: CheckCircle, label: 'Get Verified' },
  {
    href: 'mailto:support@truckfull.food?subject=Organizer Support Request',
    icon: HelpCircle,
    label: 'Get Support',
    isExternal: true,
  },
];

export function OrganizerSidebar({
  className,
  onNavigate,
  currentView,
  onViewChange,
}: OrganizerSidebarProps) {
  return (
    <aside
      className={cn('w-64 border-r border-border/40 px-4 pb-4 pt-0 md:p-4 bg-card/30', className)}
    >
      <div className="flex items-center justify-between mb-6 px-2 pt-1 border-b border-border/10 pb-4">
        <div className="flex items-center gap-2">
          <Link href="/" className="block shrink-0 hover:opacity-80 transition-opacity">
            <Image
              src="/truckfull-icon-transparent.webp"
              alt="TruckFull Logo"
              width={92}
              height={64}
              className="h-10 object-contain w-auto"
              sizes="92px"
              priority
            />
          </Link>
          <Link
            href="/"
            className="font-lobster text-2xl font-bold bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent hover:opacity-80 transition-opacity"
          >
            Organizer
          </Link>
        </div>
        <button
          onClick={() => onNavigate?.()}
          className="md:hidden p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close sidebar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;

          if (item.isExternal && item.href) {
            return (
              <a
                key={item.label}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 w-full text-left group',
                  'hover:bg-primary/10 hover:text-primary',
                )}
              >
                <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="font-medium text-sm">{item.label}</span>
              </a>
            );
          }

          const isActive = item.view === currentView;

          return (
            <button
              key={item.label}
              onClick={() => {
                if (item.view) {
                  onViewChange(item.view);
                  onNavigate?.();
                }
              }}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 w-full text-left group',
                isActive
                  ? 'bg-primary/10 text-primary font-semibold shadow-sm border border-primary/20'
                  : 'hover:bg-primary/5 hover:text-foreground text-muted-foreground',
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4 transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-primary',
                )}
              />
              <span className="text-sm">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
