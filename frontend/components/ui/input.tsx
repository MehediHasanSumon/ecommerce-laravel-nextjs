import type { InputHTMLAttributes } from "react";
import { cn } from "@/utils/cn";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export function Input({ label, error, id, className, ...props }: InputProps) {
  const inputId = id ?? props.name;

  return (
    <label className="block space-y-2.5" htmlFor={inputId}>
      {label ? (
        <span className="text-sm font-medium tracking-tight text-foreground">
          {label}
        </span>
      ) : null}
      <input
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className={cn(
          "h-12 w-full rounded-2xl border border-border/80 bg-background/90 px-4 text-sm text-foreground shadow-sm transition duration-200 placeholder:text-muted-foreground/80 hover:border-border hover:bg-background focus:border-primary focus:bg-background focus:outline-none focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60",
          error && "border-destructive/60 focus:border-destructive focus:ring-destructive/10",
          className,
        )}
        {...props}
      />
      {error ? (
        <p id={`${inputId}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </label>
  );
}
