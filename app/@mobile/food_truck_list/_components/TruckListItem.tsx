import React from 'react';
import { Card } from '@/components/ui/card';
import ListItem from '@/components/ui/molecules/ListItem';

interface TruckListItemProps {
  readonly truck: {
    readonly name: string;
    readonly cuisine: string;
    readonly image: string;
    readonly distance: string;
    readonly status: string;
    readonly statusColor: string;
  };
}

export default function TruckListItem({ truck }: TruckListItemProps) {
  return (
    <Card className="mb-4 last:mb-0">
      <ListItem
        title={truck.name}
        subtitle={truck.cuisine}
        image={truck.image}
        imageClassName="rounded-xl size-16"
        rightContent={
          <div className="text-right">
            <p className="text-white text-base font-semibold">{truck.distance}</p>
            <span className={`text-${truck.statusColor} text-sm font-medium`}>{truck.status}</span>
          </div>
        }
      />
    </Card>
  );
}
