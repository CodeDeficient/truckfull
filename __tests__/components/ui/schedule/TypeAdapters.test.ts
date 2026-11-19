import { adaptRecurringSchedule, adaptSpecialEvent } from '@/components/ui/schedule/TypeAdapters';

describe('TypeAdapters', () => {
  describe('adaptRecurringSchedule', () => {
    it('adapts schedule with location property (ScheduleTab format)', () => {
      const input = {
        id: '1',
        title: 'Morning Shift',
        description: 'Morning schedule',
        startTime: '09:00',
        endTime: '17:00',
        location: 'Food Truck Park',
        isActive: true,
      };

      const result = adaptRecurringSchedule(input);

      expect(result.id).toBe('1');
      expect(result.name).toBe('Morning Shift');
      expect(result.description).toBe('Morning schedule');
      expect(result.start_time).toBe('09:00');
      expect(result.end_time).toBe('17:00');
      expect(result.location_address).toBe('Food Truck Park');
      expect(result.is_active).toBe(true);
    });

    it('adapts schedule with underscore format (lib/types format)', () => {
      const input = {
        id: '2',
        name: 'Evening Shift',
        description: 'Evening schedule',
        start_time: '18:00',
        end_time: '22:00',
        location_address: 'Downtown',
        is_active: false,
      };

      const result = adaptRecurringSchedule(input);

      expect(result.id).toBe('2');
      expect(result.name).toBe('Evening Shift');
      expect(result.start_time).toBe('18:00');
      expect(result.end_time).toBe('22:00');
      expect(result.location_address).toBe('Downtown');
      expect(result.is_active).toBe(false);
    });

    it('handles missing fields with defaults', () => {
      const input = {};

      const result = adaptRecurringSchedule(input);

      expect(result.id).toBe('');
      expect(result.name).toBe('');
      expect(result.is_active).toBe(true);
    });

    it('handles recurrence pattern', () => {
      const input = {
        id: '1',
        location: 'Food Truck Park',
        recurrencePattern: {
          frequency: 'weekly',
          interval: 2,
          daysOfWeek: ['mon', 'wed', 'fri'],
        },
      };

      const result = adaptRecurringSchedule(input);

      expect(result.recurrence_pattern).toEqual({
        frequency: 'weekly',
        interval: 2,
        daysOfWeek: ['mon', 'wed', 'fri'],
      });
    });
  });

  describe('adaptSpecialEvent', () => {
    it('adapts event with date property (ScheduleTab format)', () => {
      const input = {
        id: '1',
        name: 'Food Festival',
        description: 'Annual event',
        date: '2024-07-15',
        startTime: '10:00',
        endTime: '20:00',
        location: 'City Park',
      };

      const result = adaptSpecialEvent(input);

      expect(result.id).toBe('1');
      expect(result.title).toBe('Food Festival');
      expect(result.description).toBe('Annual event');
      expect(result.event_date).toBe('2024-07-15');
      expect(result.start_time).toBe('10:00');
      expect(result.end_time).toBe('20:00');
      expect(result.location_address).toBe('City Park');
    });

    it('adapts event with underscore format (lib/types format)', () => {
      const input = {
        id: '2',
        title: 'Music Festival',
        description: 'Live music',
        event_date: '2024-08-20',
        start_time: '12:00',
        end_time: '23:00',
        location_address: 'Beach',
      };

      const result = adaptSpecialEvent(input);

      expect(result.id).toBe('2');
      expect(result.title).toBe('Music Festival');
      expect(result.event_date).toBe('2024-08-20');
    });

    it('handles missing fields with defaults', () => {
      const input = {};

      const result = adaptSpecialEvent(input);

      expect(result.id).toBe('');
      expect(result.title).toBe('');
    });
  });
});
