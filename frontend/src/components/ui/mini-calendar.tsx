'use client';

import React, { useMemo, useState } from 'react';

type MiniCalendarProps = {
  value?: Date;
  onChange?: (date: Date) => void;
  className?: string;
};

const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function MiniCalendar({ value, onChange, className }: MiniCalendarProps) {
  const [viewDate, setViewDate] = useState<Date>(value ?? new Date());

  const { monthLabel, yearLabel, firstDayOfWeek, daysInMonth } = useMemo(() => {
    const m = viewDate.getMonth();
    const y = viewDate.getFullYear();
    const firstDay = new Date(y, m, 1).getDay();
    const days = new Date(y, m + 1, 0).getDate();
    const monthName = viewDate.toLocaleString('default', { month: 'long' });
    return {
      monthLabel: monthName.charAt(0).toUpperCase() + monthName.slice(1),
      yearLabel: y,
      firstDayOfWeek: firstDay,
      daysInMonth: days,
    };
  }, [viewDate]);

  const goPrevMonth = () => {
    const d = new Date(viewDate);
    d.setMonth(d.getMonth() - 1);
    setViewDate(d);
  };

  const goNextMonth = () => {
    const d = new Date(viewDate);
    d.setMonth(d.getMonth() + 1);
    setViewDate(d);
  };

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const today = new Date();

  const handleSelect = (day: number) => {
    const d = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    onChange?.(d);
  };

  return (
    <div
      className={[
        'rounded-xl border bg-background/95 p-2 shadow-md backdrop-blur supports-[backdrop-filter]:bg-background/60',
        'w-[280px]',
        className ?? '',
      ].join(' ')}
    >
      <div className="flex items-center justify-between px-1 py-1.5">
        <button
          onClick={goPrevMonth}
          className="size-6 rounded-md border text-xs hover:bg-muted/60"
          aria-label="Previous month"
        >
          ‹
        </button>
        <div className="text-sm font-medium">
          {monthLabel} {yearLabel}
        </div>
        <button
          onClick={goNextMonth}
          className="size-6 rounded-md border text-xs hover:bg-muted/60"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 px-1 pt-1">
        {dayNames.map((d) => (
          <div
            key={d}
            className="text-[10px] text-muted-foreground text-center select-none"
          >
            {d}
          </div>
        ))}

        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="h-8" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateObj = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
          const isToday = isSameDay(dateObj, today);
          const isSelected = value ? isSameDay(dateObj, value) : false;

          return (
            <button
              key={day}
              className={[
                'h-8 w-8 rounded-lg text-sm flex items-center justify-center transition',
                'hover:bg-muted/80',
                isSelected ? 'bg-primary text-primary-foreground' : '',
                !isSelected && isToday ? 'ring-1 ring-primary/50' : '',
              ].join(' ')}
              onClick={() => handleSelect(day)}
              aria-label={`Select ${dateObj.toDateString()}`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default MiniCalendar;
