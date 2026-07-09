"use client";

import { format, parseISO } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { useState } from "react";
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
  const displayValue = selected ? format(selected, "PPP") : placeholder;

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
                "h-10 flex-1 justify-start rounded-lg px-3 text-left text-sm font-medium",
                !selected && "text-muted-foreground",
                error && "border-destructive",
              )}
              icon={<CalendarIcon className="h-4 w-4" />}
            >
              <span className="truncate">{displayValue}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="z-[110] w-auto p-0" align="start">
            <Calendar
              mode="single"
              navLayout="around"
              selected={selected}
              onSelect={(date) => {
                if (!date) {
                  return;
                }
                onChange(toIsoDate(date));
                setOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
        {selected ? (
            <Button
              type="button"
              variant="secondary"
              size="icon"
            className="h-10 w-9 rounded-lg"
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
