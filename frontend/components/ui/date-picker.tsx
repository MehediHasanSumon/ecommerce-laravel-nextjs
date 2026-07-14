"use client";

import { addYears, format, getMonth, getYear, parseISO, setMonth, setYear } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/utils/cn";

type DatePickerProps = {
  label?: string;
  value?: string | null;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  onChange: (value: string) => void;
};

type PickerView = "date" | "month" | "year";

const MONTHS = Array.from({ length: 12 }, (_, month) => new Date(2020, month, 1));

function toDate(value?: string | null) {
  if (!value) {
    return undefined;
  }

  try {
    return parseISO(value);
  } catch {
    return undefined;
  }
}

function toIsoDate(value: Date) {
  return format(value, "yyyy-MM-dd");
}

function monthStart(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

export function DatePicker({
  label,
  value,
  placeholder = "Pick a date",
  error,
  disabled,
  className,
  onChange,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = toDate(value);
  const [view, setView] = useState<PickerView>("date");
  const [calendarMonth, setCalendarMonth] = useState(() => monthStart(selected ?? new Date()));
  const displayValue = selected ? format(selected, "PPP") : placeholder;
  const activeYear = getYear(calendarMonth);
  const activeMonth = getMonth(calendarMonth);
  const yearListRef = useRef<HTMLDivElement | null>(null);
  const activeYearRef = useRef<HTMLButtonElement | null>(null);
  const yearRange = useMemo(() => {
    const currentYear = getYear(new Date());
    const start = Math.min(activeYear, currentYear) - 100;
    const end = Math.max(activeYear, currentYear) + 50;

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [activeYear]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setView("date");
    setCalendarMonth(monthStart(toDate(value) ?? new Date()));
  }, [open, value]);

  useEffect(() => {
    if (view !== "year") {
      return;
    }

    window.setTimeout(() => {
      activeYearRef.current?.scrollIntoView({ block: "center" });
    }, 0);
  }, [view, activeYear]);

  function selectMonth(month: number) {
    setCalendarMonth(monthStart(setMonth(calendarMonth, month)));
    setView("date");
  }

  function selectYear(year: number) {
    setCalendarMonth(monthStart(setYear(calendarMonth, year)));
    setView("month");
  }

  function moveYear(amount: number) {
    setCalendarMonth(monthStart(addYears(calendarMonth, amount)));
  }

  return (
    <label className={cn("block space-y-2", className)}>
      {label ? <span className="text-sm font-semibold text-foreground">{label}</span> : null}
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="secondary"
              disabled={disabled}
              className={cn(
                "h-10 flex-1 justify-start rounded-lg border-border bg-background px-3 text-left text-sm font-medium shadow-sm hover:bg-background focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/15 disabled:bg-muted/50 disabled:opacity-100",
                !selected && "text-muted-foreground",
                error && "border-destructive",
              )}
              icon={<CalendarIcon className="h-4 w-4" />}
            >
              <span className="truncate">{displayValue}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="z-[110] w-auto p-0" align="start">
            {view === "date" ? (
              <Calendar
                mode="single"
                navLayout="around"
                month={calendarMonth}
                onMonthChange={(nextMonth) => setCalendarMonth(monthStart(nextMonth))}
                selected={selected}
                components={{
                  CaptionLabel: ({ children, className, ...props }) => (
                    <button
                      {...props}
                      type="button"
                      className={cn(className, "rounded-md px-2 py-1 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20")}
                      aria-label={`Choose month and year, currently ${children}`}
                      onClick={() => setView("month")}
                    >
                      {children}
                    </button>
                  ),
                }}
                onSelect={(date) => {
                  if (!date) {
                    return;
                  }
                  onChange(toIsoDate(date));
                  setOpen(false);
                }}
              />
            ) : null}

            {view === "month" ? (
              <div className="w-[19.75rem] p-3">
                <div className="grid grid-cols-[2rem_1fr_2rem] items-center gap-y-4">
                  <button
                    type="button"
                    className="z-10 flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background p-0 opacity-80 hover:bg-muted hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
                    aria-label="Previous year"
                    onClick={() => moveYear(-1)}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="min-h-8 rounded-md px-2 text-sm font-semibold transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
                    aria-label={`Choose year, currently ${activeYear}`}
                    onClick={() => setView("year")}
                  >
                    {activeYear}
                  </button>
                  <button
                    type="button"
                    className="z-10 flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background p-0 opacity-80 hover:bg-muted hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
                    aria-label="Next year"
                    onClick={() => moveYear(1)}
                  >
                    ›
                  </button>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2" role="grid" aria-label={`Months in ${activeYear}`}>
                  {MONTHS.map((monthDate, month) => {
                    const isSelectedMonth = month === activeMonth;

                    return (
                      <button
                        key={month}
                        type="button"
                        className={cn(
                          "h-10 rounded-md text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20",
                          isSelectedMonth && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                        )}
                        aria-pressed={isSelectedMonth}
                        onClick={() => selectMonth(month)}
                      >
                        {format(monthDate, "MMM")}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {view === "year" ? (
              <div className="w-[19.75rem] p-3">
                <div className="flex min-h-8 items-center justify-center">
                  <span className="text-sm font-semibold">Select year</span>
                </div>
                <div
                  ref={yearListRef}
                  className="mt-4 grid max-h-64 grid-cols-3 gap-2 overflow-y-auto pr-1"
                  role="grid"
                  aria-label="Years"
                >
                  {yearRange.map((year) => {
                    const isSelectedYear = year === activeYear;

                    return (
                      <button
                        key={year}
                        ref={isSelectedYear ? activeYearRef : undefined}
                        type="button"
                        className={cn(
                          "h-10 rounded-md text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20",
                          isSelectedYear && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                        )}
                        aria-pressed={isSelectedYear}
                        onClick={() => selectYear(year)}
                      >
                        {year}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </PopoverContent>
        </Popover>
        {selected ? (
            <Button
              type="button"
              variant="secondary"
              size="icon"
            className="h-10 w-9 rounded-lg border-border bg-background shadow-sm hover:bg-background focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/15 disabled:bg-muted/50 disabled:opacity-100"
            disabled={disabled}
            aria-label="Clear date"
            icon={<X className="h-4 w-4" />}
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
          />
        ) : null}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </label>
  );
}
