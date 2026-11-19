'use client';

import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FavoritesToggleProps {
  /** Whether favorites filter is active */
  readonly isActive: boolean;
  /** Callback when toggle is clicked */
  readonly onToggle: () => void;
  /** Whether the user is authenticated */
  readonly isAuthenticated?: boolean;
  /** Optional CSS classes */
  readonly className?: string;
}

/**
 * Toggle button for filtering by favorite trucks.
 * Shows a heart icon that fills when active.
 */
export function FavoritesToggle({
  isActive,
  onToggle,
  isAuthenticated = true,
  className,
}: FavoritesToggleProps) {
  return (
    <Button
      variant={isActive ? 'default' : 'outline'}
      size="sm"
      onClick={onToggle}
      disabled={!isAuthenticated}
      className={cn('gap-2', className)}
      aria-pressed={isActive}
      aria-label={isActive ? 'Show all trucks' : 'Show favorites only'}
      title={(() => {
        if (!isAuthenticated) {
          return 'Sign in to use favorites';
        }
        return isActive ? 'Show all trucks' : 'Show favorites only';
      })()}
    >
      <Heart
        className={cn('h-4 w-4 transition-colors', isActive ? 'fill-current text-red-500' : '')}
        aria-hidden="true"
      />
      <span className="hidden sm:inline">Favorites</span>
    </Button>
  );
}
