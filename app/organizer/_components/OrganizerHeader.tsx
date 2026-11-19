'use client';

import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { OrganizerSidebar, type DashboardView } from './OrganizerSidebar';
import { useState } from 'react';
import { AvatarMenu } from '@/components/auth/AvatarMenu';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface OrganizerHeaderProps {
  readonly user: {
    email?: string;
    contact_email?: string;
    business_name?: string;
    id: string;
  } | null;
  readonly authUser: SupabaseUser | null;
  readonly onSignOut: () => void;
  // Optional for now to avoid breaking other calls, but ideally required
  readonly currentView?: DashboardView;
  readonly onViewChange?: (view: DashboardView) => void;
  readonly onVerifyClick?: () => void;
}

export function OrganizerHeader({
  user: _user,
  authUser,
  onSignOut,
  currentView,
  onViewChange,
  onVerifyClick,
}: OrganizerHeaderProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/95 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-4">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 border-r bg-card/95 backdrop-blur-sm">
            <OrganizerSidebar
              className="border-none bg-transparent"
              onNavigate={() => setSheetOpen(false)}
              currentView={currentView ?? 'overview'}
              onViewChange={onViewChange ?? (() => {})}
            />
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2 font-semibold md:hidden">
          <span className="text-lg">Organizer Dashboard</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* User Menu */}
        <AvatarMenu
          user={authUser}
          onSignOut={onSignOut}
          variant="organizer"
          onVerifyClick={onVerifyClick}
        />
      </div>
    </header>
  );
}
