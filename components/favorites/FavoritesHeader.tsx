import { Button } from '@/components/ui/button';
import { Heart, ArrowLeft } from 'lucide-react';
import React from 'react';

interface FavoritesHeaderProps {
  readonly count: number;
  readonly onBack: () => void;
  readonly onProfile: () => void;
}

export const FavoritesHeader: React.FC<FavoritesHeaderProps> = ({ count, onBack, onProfile }) => {
  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="size-4 mr-2" />
            Back
          </Button>
          <Heart className="size-6 text-red-500 fill-current" />
          <h1 className="text-3xl font-bold">My Favorites</h1>
        </div>
        <p className="text-muted-foreground">Your saved food trucks - {count} total</p>
      </div>
      <Button variant="outline" onClick={onProfile}>
        View Profile
      </Button>
    </div>
  );
};
