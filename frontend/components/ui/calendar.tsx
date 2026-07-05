"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/utils/cn";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("relative p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-4",
        month: "grid grid-cols-[2rem_1fr_2rem] items-center gap-y-4",
        month_caption: "col-start-2 row-start-1 flex min-h-8 items-center justify-center",
        caption_label: "text-sm font-semibold",
        nav: "flex items-center justify-between",
        button_previous:
          "col-start-1 row-start-1 z-10 flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background p-0 opacity-80 hover:bg-muted hover:opacity-100",
        button_next:
          "col-start-3 row-start-1 z-10 flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background p-0 opacity-80 hover:bg-muted hover:opacity-100",
        chevron: "h-4 w-4 fill-current",
        month_grid: "col-span-3 row-start-2 w-full border-collapse space-y-1",
        weekdays: "flex",
        weekday: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        week: "flex w-full mt-2",
        day: "h-9 w-9 text-center text-sm p-0 relative",
        day_button: "h-9 w-9 rounded-md hover:bg-muted",
        selected: "bg-primary text-primary-foreground rounded-md hover:bg-primary hover:text-primary-foreground",
        today: "border border-primary rounded-md",
        outside: "text-muted-foreground opacity-50",
        disabled: "text-muted-foreground opacity-50",
        range_middle: "bg-muted text-foreground",
        hidden: "invisible",
        ...classNames,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
