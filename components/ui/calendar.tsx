'use client';

import * as React from 'react';
import { DayPicker } from 'react-day-picker';
import { cn } from '@/lib/utils';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      navLayout="around"
      className={cn('p-1', className)}
      classNames={{
        root: '[--rdp-accent-color:hsl(var(--primary)) [--rdp-accent-background-color:hsl(var(--primary)/0.1)] [--rdp-day-height:2.25rem] [--rdp-day-width:2.25rem] [--rdp-day_button-height:2.25rem] [--rdp-day_button-width:2.25rem] [--rdp-nav-height:2.5rem] bg-zinc-800 text-foreground rounded-lg',
        months: 'flex flex-wrap gap-4',
        month: 'space-y-0 flex flex-wrap items-center justify-center',
        month_caption: 'flex justify-center items-center relative py-0.5 gap-1',
        caption_label: 'text-sm font-medium text-foreground',
        nav: 'flex items-center gap-1',
        button_previous:
          'inline-flex items-center justify-center h-6 w-6 rounded-md text-foreground opacity-100 hover:opacity-70 hover:bg-muted transition-opacity bg-transparent border-0 p-0 cursor-pointer',
        button_next:
          'inline-flex items-center justify-center h-6 w-6 rounded-md text-foreground opacity-100 hover:opacity-70 hover:bg-muted transition-opacity bg-transparent border-0 p-0 cursor-pointer',
        chevron: 'h-4 w-4 fill-current',
        month_grid: 'w-full basis-full border-collapse',
        weekdays: 'flex w-full',
        weekday: 'text-muted-foreground font-normal text-xs w-9 text-center',
        week: 'flex w-full mt-1',
        day: 'h-9 w-9 text-center text-sm p-0 relative [&:has(.rdp-range_end)]:rounded-r-md [&:has(.rdp-range_middle)]:bg-primary/10 [&:has(.rdp-range_start)]:rounded-l-md',
        day_button:
          'h-9 w-9 p-0 font-normal inline-flex items-center justify-center rounded-md text-foreground hover:bg-muted transition-colors bg-transparent border-2 border-transparent cursor-pointer',
        selected: '[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground [&>button]:border-primary font-bold',
        today: '[&>button]:bg-accent [&>button]:text-accent-foreground',
        outside: 'text-muted-foreground opacity-75',
        disabled: 'text-muted-foreground opacity-50',
        range_middle: 'bg-primary/10 [&>button]:bg-transparent [&>button]:border-transparent [&>button]:text-foreground',
        range_start: 'bg-gradient-to-r from-transparent to-primary/10 [&>button]:bg-primary [&>button]:text-primary-foreground',
        range_end: 'bg-gradient-to-r from-primary/10 to-transparent [&>button]:bg-primary [&>button]:text-primary-foreground',
        hidden: 'invisible',
        ...classNames,
      }}
      {...props}
    />
  );
}
Calendar.displayName = 'Calendar';

export { Calendar };
