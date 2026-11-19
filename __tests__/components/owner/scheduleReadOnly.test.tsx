import { describe, it, expect } from '@jest/globals';
import type { ComponentProps } from 'react';
import {
  RecurringSchedulesList,
  SpecialEventsList,
} from '@/components/ui/schedule/ScheduleEventLists';
import { mapOperatingHoursToSchedules } from '@/app/owner-dashboard/_components/scheduleDataMappers';
import type { FoodTruckOperatingHours } from '@/lib/types';

describe('Schedule evidence surface (read-only contract)', () => {
  describe('RecurringSchedulesList prop contract', () => {
    it('accepts schedules and timezone without mutation callbacks', () => {
      // Type-level proof: onDelete and onToggleActive are optional.
      const props: ComponentProps<typeof RecurringSchedulesList> = {
        schedules: [],
        timezone: 'UTC',
      };
      expect(props.schedules).toEqual([]);
      expect(props.timezone).toBe('UTC');
      expect(props.onDelete).toBeUndefined();
      expect(props.onToggleActive).toBeUndefined();
    });
  });

  describe('SpecialEventsList prop contract', () => {
    it('accepts events and timezone without mutation callbacks', () => {
      const props: ComponentProps<typeof SpecialEventsList> = {
        events: [],
        timezone: 'UTC',
      };
      expect(props.events).toEqual([]);
      expect(props.onDelete).toBeUndefined();
    });
  });

  describe('operating hours mapping (persisted evidence)', () => {
    it('maps persisted operating_hours to read-only schedules with blank location', () => {
      const hours: FoodTruckOperatingHours = {
        saturday: { open: '09:00', close: '14:00' },
        wednesday: { open: '08:00', close: '13:00' },
      };

      const schedules = mapOperatingHoursToSchedules(hours);

      expect(schedules).toHaveLength(2);
      const saturday = schedules.find((s) => s.dayOfWeek === 'saturday');
      expect(saturday).toMatchObject({
        startTime: '09:00',
        endTime: '14:00',
        location: '',
        baseLocation: '',
      });
      const wednesday = schedules.find((s) => s.dayOfWeek === 'wednesday');
      expect(wednesday).toMatchObject({
        startTime: '08:00',
        endTime: '13:00',
        location: '',
      });
    });

    it('returns empty array when no persisted hours', () => {
      expect(mapOperatingHoursToSchedules(null)).toEqual([]);
      expect(mapOperatingHoursToSchedules({})).toEqual([]);
    });
  });
});