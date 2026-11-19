import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Event } from '@/lib/types';

interface EventCardProps {
  event: Event;
}

const EventCard: React.FC<EventCardProps> = ({ event }) => {
  const start_time = new Date(`${event.date}T${event.time}`);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{event.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>{event.description}</p>
        <p>{start_time.toLocaleString()}</p>
        <p>{event.location?.address ?? 'No location specified'}</p>
      </CardContent>
    </Card>
  );
};

export default EventCard;
