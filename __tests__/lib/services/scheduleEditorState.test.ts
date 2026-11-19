import { describe, expect, it } from '@jest/globals';
import {
  createEmptyScheduleEditor,
  createOverrideScheduleEditor,
  createRecurrenceScheduleEditor,
  scheduleEditorSaveKind,
} from '@/lib/services/scheduleEditorState';

describe('schedule editor initialization', () => {
  it('opens every empty date as a clean one-off draft', () => {
    const first = createEmptyScheduleEditor('2026-09-03', 'thursday');
    const second = createEmptyScheduleEditor('2026-10-04', 'sunday');

    expect(first).toMatchObject({
      target: '2026-09-03',
      repeat: false,
      frequency: 'weekly',
      monthlyMode: 'same_date',
      endMode: 'never',
      occurrences: 4,
      seriesId: null,
      source: 'empty',
    });
    expect(second).toMatchObject({
      target: '2026-10-04',
      repeat: false,
      frequency: 'weekly',
      monthlyMode: 'same_date',
      endMode: 'never',
      occurrences: 4,
      seriesId: null,
      source: 'empty',
    });
  });

  it('normalizes persisted one-off times and opens with Repeat OFF', () => {
    expect(
      createOverrideScheduleEditor('2026-09-02', '17:00:00', '20:00:00', 'Broad Street'),
    ).toMatchObject({
      start: '17:00',
      end: '20:00',
      repeat: false,
      seriesId: null,
      source: 'override',
    });
  });

  it('opens a recurrence with its persisted identity and settings', () => {
    expect(
      createRecurrenceScheduleEditor('2026-09-09', {
        id: 'series-1',
        frequency: 'monthly',
        monthly_mode: 'ordinal_weekday',
        start_date: '2026-08-12',
        occurrences: 3,
        start_time: '17:00:00',
        end_time: '20:00:00',
        location_data: { address: 'Broad Street' },
      }),
    ).toMatchObject({
      target: '2026-09-09',
      seriesStartDate: '2026-08-12',
      start: '17:00',
      end: '20:00',
      location: 'Broad Street',
      repeat: true,
      frequency: 'monthly',
      monthlyMode: 'ordinal_weekday',
      endMode: 'after',
      occurrences: 3,
      seriesId: 'series-1',
      source: 'recurrence',
    });
  });

  it('opens an infinite recurrence with Ends OFF', () => {
    expect(
      createRecurrenceScheduleEditor('2026-09-09', {
        id: 'series-2',
        frequency: 'daily',
        monthly_mode: null,
        start_date: '2026-09-09',
        occurrences: null,
        start_time: '09:00',
        end_time: '17:00',
        location_data: null,
      }),
    ).toMatchObject({
      repeat: true,
      frequency: 'daily',
      endMode: 'never',
      occurrences: 4,
      seriesId: 'series-2',
    });
  });

  it('routes Repeat OFF on a recurrence to a selected-date override only', () => {
    const recurrence = createRecurrenceScheduleEditor('2026-09-09', {
      id: 'series-2',
      frequency: 'daily',
      monthly_mode: null,
      start_date: '2026-09-01',
      occurrences: null,
      start_time: '09:00',
      end_time: '17:00',
      location_data: null,
    });

    expect(scheduleEditorSaveKind(recurrence)).toBe('recurrence-update');
    expect(scheduleEditorSaveKind({ ...recurrence, repeat: false })).toBe('override');
  });
});
