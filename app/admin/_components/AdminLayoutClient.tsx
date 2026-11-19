// app/admin/_components/AdminLayoutClient.tsx
'use client';

import { useState, ReactNode } from 'react';
import Link from '@/components/navigation/IntentLink';
import { Menu, Package2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { AdminNavLinks } from '@/components/admin/AdminNavLinks';
import { UserMenu } from '@/components/admin/UserMenu';

interface AdminLayoutClientProps {
  readonly children: ReactNode;
  readonly userEmail: string;
  readonly userRole: string;
}

export function AdminLayoutClient({ children, userEmail, userRole }: AdminLayoutClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-muted/10 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 lg:w-72 xl:w-80 flex-col border-r bg-background p-6 fixed inset-y-0 left-0 z-10">
        <div className="flex items-center gap-2 mb-8">
          <Link href="/admin" className="flex items-center gap-2 font-semibold">
            <Package2 className="h-6 w-6" />
            <span className="">Food Truck Finder</span>
          </Link>
        </div>
        <nav className="flex-1 space-y-2">
          <AdminNavLinks />
        </nav>
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="md:hidden fixed top-4 left-4 z-20">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 sm:max-w-xs">
          <div className="flex items-center gap-2 mb-6">
            <Link href="/admin" className="flex items-center gap-2 font-semibold">
              <Package2 className="h-6 w-6" />
              <span>Food Truck Finder</span>
            </Link>
          </div>
          <nav className="space-y-2">
            <AdminNavLinks isMobile />
          </nav>
        </SheetContent>
      </Sheet>

      <div className="flex flex-col flex-1 md:ml-64 lg:ml-72 xl:ml-80 h-screen overflow-hidden">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b bg-background px-4 md:px-6">
          <div className="flex items-center gap-2 ml-auto">
            <UserMenu email={userEmail} role={userRole} />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
