import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import Link from '@/components/navigation/IntentLink';
import React from 'react';

export const FavoritesEmpty: React.FC = () => (
  <Card className="text-center py-12">
    <CardContent>
      <Heart className="size-12 text-muted-foreground mx-auto mb-4" />
      <CardTitle className="mb-2">No favorites yet</CardTitle>
      <CardDescription className="mb-4">
        Start exploring food trucks and save your favorites here!
      </CardDescription>
      <Button asChild>
        <Link href="/">Discover Food Trucks</Link>
      </Button>
    </CardContent>
  </Card>
);
