import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import type { FoodTruckDomain } from '@/lib/types';

let ScheduleTab: typeof import('@/app/owner-dashboard/_components/ScheduleTab').ScheduleTab;
let getDeleteDialogCopy: typeof import('@/app/owner-dashboard/_components/ScheduleTab').getDeleteDialogCopy;

beforeAll(async () => {
  const module = await import('@/app/owner-dashboard/_components/ScheduleTab');
  ScheduleTab = module.ScheduleTab;
  getDeleteDialogCopy = module.getDeleteDialogCopy;
});

function createTruck(overrides: Partial<FoodTruckDomain> = {}): FoodTruckDomain {
  return {
    id: 'truck-1',
    name: 'TruckFull Test Truck',
    street_address: '123 Main St',
    city: 'Augusta',
    state: 'GA',
    zip: '30901',
    operating_hours: {
      monday: { open: '11:00', close: '18:00' },
    },
    ...overrides,
  } as unknown as FoodTruckDomain;
}

describe('ScheduleTab', () => {
  it('preserves the current schedule shell and weekly calendar composition', async () => {
    render(React.createElement(ScheduleTab, { trucks: [createTruck()] }));

    expect(screen.getByRole('heading', { name: 'Schedule' })).toBeInTheDocument();
    expect(screen.getByText('Manage your operating hours and events')).toBeInTheDocument();
    expect(screen.getByTestId('schedule-calendar')).toBeInTheDocument();
    expect(await screen.findAllByTestId(/schedule-header-/)).toHaveLength(7);
  });

  it('does not expose an editable empty calendar while schedule data is unknown', () => {
    render(React.createElement(ScheduleTab, { trucks: [createTruck()] }));

    expect(screen.getByRole('status', { name: 'Loading schedule' })).toBeInTheDocument();
    expect(screen.queryByTestId(/schedule-date-/)).not.toBeInTheDocument();
  });

  it('opens directly into the recurring view with no mode switch', () => {
    render(React.createElement(ScheduleTab, { trucks: [createTruck()] }));

    expect(screen.getByTestId('schedule-calendar')).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Recurring' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /special events/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it('renders month controls on the shared header row above the calendar', () => {
    render(React.createElement(ScheduleTab, { trucks: [createTruck()] }));

    const calendar = screen.getByTestId('schedule-calendar');
    expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous month' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next month' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Schedule' })).toBeInTheDocument();
    expect(calendar).toBeInTheDocument();
    const within = calendar.firstChild as HTMLElement;
    expect(within.textContent).toContain('Schedule');
  });

  it('removes the add-recurring-schedule entry form in favor of the calendar modal', () => {
    render(React.createElement(ScheduleTab, { trucks: [createTruck()] }));

    expect(screen.queryByText('Add recurring schedule')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/repeats/i)).not.toBeInTheDocument();
  });

  it('exposes no coming-soon recurrence copy and no weekday-model copy', () => {
    render(React.createElement(ScheduleTab, { trucks: [createTruck()] }));

    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/recurring hours/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Set hours for Saturdays/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/this weekday every week/i)).not.toBeInTheDocument();
  });

  it('offers truck selection when multiple trucks are available', () => {
    render(
      React.createElement(ScheduleTab, {
        trucks: [createTruck(), createTruck({ id: 'truck-2', name: 'Second Truck' })],
      }),
    );

    expect(screen.getAllByRole('combobox')[0]).toBeInTheDocument();
    expect(screen.getByText('TruckFull Test Truck')).toBeInTheDocument();
  });

  it('does not display the truck address when a recurring day has no location', () => {
    render(React.createElement(ScheduleTab, { trucks: [createTruck()] }));

    expect(screen.queryByText(/123 Main St/)).not.toBeInTheDocument();
  });

  it('gives the series-delete dialog date-scoped secondary copy distinct from the series delete', () => {
    // The dialog must never offer two buttons that both delete the series.
    const copy = getDeleteDialogCopy({
      kind: 'series',
      day: 'thursday',
      serviceDate: '2026-08-06',
      seriesId: 'series-1',
    });
    expect(copy.title).toBe('Delete repeating schedule');
    expect(copy.primary).toBe('Delete repeating schedule');
    expect(copy.secondary).toBe('Close Thursday, August 6, 2026 only');
    expect(copy.primary).not.toEqual(copy.secondary);
  });
});
