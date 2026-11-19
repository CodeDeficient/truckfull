// components/auth/LogoutButton.tsx
'use client';

import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase/client';
import { logError } from '@/lib/logging';

export default function LogoutButton() {
  const router = useRouter();
  const supabase = getSupabase();

  const handleLogout = async () => {
    try {
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();

      if (error) {
        logError('Logout error:', error.message);
        return;
      }

      // Refresh the router to update the session
      router.refresh();

      // Redirect to home page
      router.push('/');
    } catch (error) {
      logError('Unexpected logout error:', error);
    }
  };

  return (
    <button
      onClick={() => void handleLogout()}
      className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
    >
      Sign Out
    </button>
  );
}
