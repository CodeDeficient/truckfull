import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Clock, MapPin, Trash2, Calendar, Recycle, AlertTriangle } from 'lucide-react';
import React from 'react';

interface ScheduleEventCardProps {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly location: string;
  readonly isActive?: boolean;
  readonly isRecurring?: boolean;
  readonly date?: string; // For events
  readonly recurrencePattern?: {
    frequency?: string;
    interval?: number;
    daysOfWeek?: string[];
    endDate?: string;
  };
  readonly exceptions?: string[];
  readonly timezone: string;
  readonly onDelete?: (id: string) => void;
  readonly onToggleActive?: (id: string) => void; // Only for schedules, not events
  readonly cardType: 'schedule' | 'event';
}

// Helper function to format time
const formatTime = (time: string, timezone: string): string => {
  // Convert "HH:MM" time string to a datetime in the specified timezone
  const [hours, minutes] = time.split(':').map(Number);
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);

  // Format the time according to the specified timezone
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: timezone,
  });
};

export function ScheduleEventCard({
  id,
  title,
  description,
  startTime,
  endTime,
  location,
  isActive = true,
  isRecurring = false,
  date,
  recurrencePattern,
  exceptions,
  timezone,
  onDelete,
  onToggleActive,
  cardType,
}: ScheduleEventCardProps) {
  const isSchedule = cardType === 'schedule';

  return (
    <div className="bg-card rounded-lg p-4" role="listitem" aria-labelledby={`card-title-${id}`}>
      <div className="flex justify-between items-start">
        <div>
          <div id={`card-title-${id}`} className="flex items-center gap-2 font-semibold">
            {isSchedule ? (
              <Badge variant="secondary" className="capitalize">
                {title}
              </Badge>
            ) : (
              <>
                {title}
                {isRecurring && (
                  <Badge variant="outline" className="ml-2">
                    <Recycle className="h-3 w-3 mr-1" aria-hidden="true" />
                    Recurring
                  </Badge>
                )}
              </>
            )}
          </div>
          <div className="flex items-center mt-1 text-sm text-muted-foreground">
            {isSchedule ? (
              <Clock className="h-4 w-4 mr-1" aria-hidden="true" />
            ) : (
              <Calendar className="h-4 w-4 mr-1" aria-hidden="true" />
            )}
            <span>
              {date ? `${new Date(date).toLocaleDateString('en-US', { timeZone: 'UTC' })} • ` : ''}
              {formatTime(startTime, timezone)} - {formatTime(endTime, timezone)}
            </span>
          </div>
        </div>
        {onDelete && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(id)}
          aria-label={`Delete ${isSchedule ? 'schedule' : 'event'}: ${title}`}
        >
          <Trash2 className="h-4 w-4 text-red-500" aria-hidden="true" />
        </Button>
        )}
      </div>

      <div className="flex items-start text-sm mt-2">
        <MapPin className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" aria-hidden="true" />
        <span>{location}</span>
      </div>

      {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}

      {isSchedule && onToggleActive && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/20">
          <Label htmlFor={`active-${id}`} className="text-sm cursor-pointer">
            {isActive ? 'Active' : 'Inactive'}
          </Label>
          <Switch
            id={`active-${id}`}
            checked={isActive}
            onCheckedChange={() => onToggleActive(id)}
            aria-label={`Toggle ${isActive ? 'inactive' : 'active'} ${isSchedule ? 'schedule' : 'event'} for ${title}`}
          />
        </div>
      )}

      {exceptions && exceptions.length > 0 && (
        <Badge variant="secondary" className="mt-2">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Exception
        </Badge>
      )}

      {recurrencePattern?.frequency && (
        <div className="mt-3 text-xs text-muted-foreground">
          <div>
            Recurs: {recurrencePattern.frequency} every {recurrencePattern.interval ?? 1}
          </div>
          {recurrencePattern.daysOfWeek && recurrencePattern.daysOfWeek.length > 0 && (
            <div>On: {recurrencePattern.daysOfWeek.join(', ')}</div>
          )}
          {recurrencePattern.endDate && (
            <div>Ends: {new Date(recurrencePattern.endDate).toLocaleDateString('en-US', { timeZone: 'UTC' })}</div>
          )}
        </div>
      )}
    </div>
  );
}

export default ScheduleEventCard;
