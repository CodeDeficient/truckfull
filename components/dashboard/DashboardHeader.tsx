'use client';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

interface DashboardHeaderProps {
  readonly icon: ReactNode;
  readonly title: string;
  readonly welcomeName: string | undefined;
  readonly onSignOut?: () => void | Promise<void>; // Make it optional to satisfy existing callers
}

export function DashboardHeader({ icon, title, welcomeName, onSignOut }: DashboardHeaderProps) {
  const router = useRouter();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

  const handleLogout = async () => {
    try {
      if (onSignOut) {
        await onSignOut();
      }
      await supabase.auth.signOut();
      router.push('/auth/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <header className="border-b bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <span className="inline-flex items-center justify-center h-8 w-8 text-primary">
              {icon}
            </span>
            <h1 className="text-xl font-semibold">{title}</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">Welcome, {welcomeName ?? 'User'}</span>
            <button
              className="inline-flex items-center rounded-md border px-3 py-1 text-sm"
              onClick={() => {
                void handleLogout();
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
