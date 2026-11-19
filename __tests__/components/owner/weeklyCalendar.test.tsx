import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import type { DayOfWeek } from '@/lib/types';
import type { WeeklyDayModel } from '@/lib/mappers/weeklyScheduleModel';

const { WeeklyCalendar } = await import('@/components/ui/schedule/WeeklyCalendar');

const allClosed: WeeklyDayModel[] = [
  { day: 'sunday', label: 'Sunday', isOpen: false },
  { day: 'monday', label: 'Monday', isOpen: false },
  { day: 'tuesday', label: 'Tuesday', isOpen: false },
  { day: 'wednesday', label: 'Wednesday', isOpen: false },
  { day: 'thursday', label: 'Thursday', isOpen: false },
  { day: 'friday', label: 'Friday', isOpen: false },
  { day: 'saturday', label: 'Saturday', isOpen: false },
];

const withOpenDays: WeeklyDayModel[] = allClosed.map((d) =>
  d.day === 'wednesday' ? { ...d, isOpen: true, open: '10:00', close: '16:00' } : d,
);

function createSaveRecorder() {
  const calls: Array<[DayOfWeek, string, string, string | undefined]> = [];
  const onSaveDay = async (day: DayOfWeek, open: string, close: string, location?: string) => {
    calls.push([day, open, close, location]);
  };
  return { calls, onSaveDay };
}

function createCloseRecorder() {
  const calls: DayOfWeek[] = [];
  const onCloseDay = async (day: DayOfWeek) => {
    calls.push(day);
  };
  return { calls, onCloseDay };
}

describe('WeeklyCalendar', () => {
  it('renders seven day headers in Sunday-Saturday calendar order', () => {
    render(
      React.createElement(WeeklyCalendar, {
        days: allClosed,
        onSaveDay: createSaveRecorder().onSaveDay,
        onCloseDay: createCloseRecorder().onCloseDay,
      }),
    );
    const headers = screen.getAllByTestId(/header-/);
    expect(headers).toHaveLength(7);
    expect(headers.map((h) => h.textContent)).toEqual(['S', 'M', 'T', 'W', 'T', 'F', 'S']);
  });

  it('shows Closed and an Add hours icon button for a closed day', () => {
    render(
      React.createElement(WeeklyCalendar, {
        days: allClosed,
        onSaveDay: createSaveRecorder().onSaveDay,
        onCloseDay: createCloseRecorder().onCloseDay,
      }),
    );
    const mondayColumn = screen.getByTestId('day-monday');
    expect(mondayColumn).toHaveTextContent('Closed');
    expect(screen.getByTestId('add-monday')).toBeInTheDocument();
    expect(screen.getByLabelText('Add Monday hours')).toBeInTheDocument();
  });

  it('shows formatted hours plus edit and close icon buttons for an open day', () => {
    render(
      React.createElement(WeeklyCalendar, {
        days: withOpenDays,
        onSaveDay: createSaveRecorder().onSaveDay,
        onCloseDay: createCloseRecorder().onCloseDay,
      }),
    );
    const wedColumn = screen.getByTestId('day-wednesday');
    expect(wedColumn).toHaveTextContent('10:00 AM');
    expect(wedColumn).toHaveTextContent('4:00 PM');
    expect(screen.getByTestId('edit-wednesday')).toBeInTheDocument();
    expect(screen.getByTestId('delete-wednesday')).toBeInTheDocument();
    expect(screen.getByLabelText('Edit Wednesday hours')).toBeInTheDocument();
    expect(screen.getByLabelText('Close Wednesday')).toBeInTheDocument();
  });

  it('opens an edit dialog when the edit button is clicked and calls onSaveDay on save', async () => {
    const { calls, onSaveDay } = createSaveRecorder();
    render(
      React.createElement(WeeklyCalendar, {
        days: withOpenDays,
        onSaveDay,
        onCloseDay: createCloseRecorder().onCloseDay,
      }),
    );
    fireEvent.click(screen.getByTestId('edit-wednesday'));
    expect(screen.getByTestId('edit-form-wednesday')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('save-wednesday'));
    await waitFor(() => {
      expect(calls).toEqual([['wednesday', '10:00', '16:00', '']]);
    });
  });

  it('requires confirmation before calling onCloseDay when the close button is clicked', async () => {
    const { calls, onCloseDay } = createCloseRecorder();
    render(
      React.createElement(WeeklyCalendar, {
        days: withOpenDays,
        onSaveDay: createSaveRecorder().onSaveDay,
        onCloseDay,
      }),
    );
    fireEvent.click(screen.getByTestId('delete-wednesday'));
    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });
    expect(calls).toEqual([]);
    fireEvent.click(screen.getByTestId('confirm-close-wednesday'));
    await waitFor(() => {
      expect(calls).toEqual(['wednesday']);
    });
  });

  it('closes the edit dialog only after the save promise resolves (success)', async () => {
    let resolveSave: () => void = () => {};
    const onSaveDay = () =>
      new Promise<void>((resolve) => {
        resolveSave = resolve;
      });
    render(
      React.createElement(WeeklyCalendar, {
        days: withOpenDays,
        onSaveDay,
        onCloseDay: createCloseRecorder().onCloseDay,
      }),
    );
    fireEvent.click(screen.getByTestId('edit-wednesday'));
    const saveBtn = screen.getByTestId('save-wednesday');
    fireEvent.click(saveBtn);
    await waitFor(() => {
      expect(saveBtn).toBeDisabled();
    });
    expect(screen.getByTestId('edit-form-wednesday')).toBeInTheDocument();
    resolveSave();
    await waitFor(() => {
      expect(screen.queryByTestId('edit-form-wednesday')).not.toBeInTheDocument();
    });
  });

  it('keeps the edit dialog open with an error when the save promise rejects', async () => {
    let saveAttempted = false;
    const onSaveDay = async () => {
      saveAttempted = true;
      throw new Error('network');
    };
    render(
      React.createElement(WeeklyCalendar, {
        days: withOpenDays,
        onSaveDay,
        onCloseDay: createCloseRecorder().onCloseDay,
      }),
    );
    fireEvent.click(screen.getByTestId('edit-wednesday'));
    fireEvent.click(screen.getByTestId('save-wednesday'));
    await waitFor(() => {
      expect(saveAttempted).toBe(true);
    });
    expect(screen.getByTestId('edit-form-wednesday')).toBeInTheDocument();
    expect(screen.getByTestId('edit-form-wednesday')).toHaveTextContent('Save failed');
  });

  it('does not call onCloseDay when the delete confirmation is cancelled', async () => {
    const { calls, onCloseDay } = createCloseRecorder();
    render(
      React.createElement(WeeklyCalendar, {
        days: withOpenDays,
        onSaveDay: createSaveRecorder().onSaveDay,
        onCloseDay,
      }),
    );
    fireEvent.click(screen.getByTestId('delete-wednesday'));
    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('cancel-close-wednesday'));
    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
    expect(calls).toEqual([]);
  });

  it('calls onSaveDay with new times when the user edits an open day', async () => {
    const { calls, onSaveDay } = createSaveRecorder();
    render(
      React.createElement(WeeklyCalendar, {
        days: withOpenDays,
        onSaveDay,
        onCloseDay: createCloseRecorder().onCloseDay,
      }),
    );
    fireEvent.click(screen.getByTestId('edit-wednesday'));
    fireEvent.change(screen.getByTestId('open-input-wednesday'), {
      target: { value: '08:00' },
    });
    fireEvent.change(screen.getByTestId('close-input-wednesday'), {
      target: { value: '14:00' },
    });
    fireEvent.click(screen.getByTestId('save-wednesday'));
    await waitFor(() => {
      expect(calls).toEqual([['wednesday', '08:00', '14:00', '']]);
    });
  });

  it('opens the add dialog when a closed day cell is tapped', () => {
    render(
      React.createElement(WeeklyCalendar, {
        days: allClosed,
        onSaveDay: createSaveRecorder().onSaveDay,
        onCloseDay: createCloseRecorder().onCloseDay,
      }),
    );
    fireEvent.click(screen.getByTestId('day-monday'));
    expect(screen.getByTestId('edit-form-monday')).toBeInTheDocument();
  });

  it('opens the edit dialog when an open day cell is tapped', () => {
    render(
      React.createElement(WeeklyCalendar, {
        days: withOpenDays,
        onSaveDay: createSaveRecorder().onSaveDay,
        onCloseDay: createCloseRecorder().onCloseDay,
      }),
    );
    fireEvent.click(screen.getByTestId('day-wednesday'));
    expect(screen.getByTestId('edit-form-wednesday')).toBeInTheDocument();
  });

  it('opens the edit dialog with the Enter key on a day cell', () => {
    render(
      React.createElement(WeeklyCalendar, {
        days: withOpenDays,
        onSaveDay: createSaveRecorder().onSaveDay,
        onCloseDay: createCloseRecorder().onCloseDay,
      }),
    );
    fireEvent.keyDown(screen.getByTestId('day-wednesday'), { key: 'Enter' });
    expect(screen.getByTestId('edit-form-wednesday')).toBeInTheDocument();
  });

  it('opens the add dialog with the Space key on a closed day cell', () => {
    render(
      React.createElement(WeeklyCalendar, {
        days: allClosed,
        onSaveDay: createSaveRecorder().onSaveDay,
        onCloseDay: createCloseRecorder().onCloseDay,
      }),
    );
    fireEvent.keyDown(screen.getByTestId('day-monday'), { key: ' ' });
    expect(screen.getByTestId('edit-form-monday')).toBeInTheDocument();
  });

  it('does not open the edit dialog when Enter is pressed on a nested edit button', () => {
    const { calls, onSaveDay } = createSaveRecorder();
    render(
      React.createElement(WeeklyCalendar, {
        days: withOpenDays,
        onSaveDay,
        onCloseDay: createCloseRecorder().onCloseDay,
      }),
    );
    const editButton = screen.getByTestId('edit-wednesday');
    fireEvent.click(editButton);
    expect(screen.getByTestId('edit-form-wednesday')).toBeInTheDocument();
    // Change the draft values so we can detect a reset.
    fireEvent.change(screen.getByTestId('open-input-wednesday'), {
      target: { value: '08:00' },
    });
    fireEvent.keyDown(editButton, { key: 'Enter' });
    // If the cell guard failed and startEdit re-fired, the draft would reset to 10:00.
    expect(screen.getByTestId('open-input-wednesday')).toHaveValue('08:00');
  });
});
