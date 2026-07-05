import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/utils/cn";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};

export function Input({ label, error, id, className, leftIcon, rightIcon, ...props }: InputProps) {
  const inputId = id ?? props.name;

  return (
    <div className="block space-y-2.5">
      {label ? (
        <label className="block text-sm font-medium tracking-tight text-foreground" htmlFor={inputId}>
          {label}
        </label>
      ) : null}
      <div className="relative">
        {leftIcon ? (
          <span className="pointer-events-none absolute left-4 top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center text-muted-foreground">
            {leftIcon}
          </span>
        ) : null}
        <input
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={cn(
            "h-12 w-full rounded-2xl border border-border/80 bg-background/90 px-4 text-sm text-foreground shadow-sm transition duration-200 placeholder:text-muted-foreground/80 hover:border-border hover:bg-background focus:border-primary focus:bg-background focus:outline-none focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60",
            leftIcon && "pl-11",
            rightIcon && "pr-12",
            error && "border-destructive/60 focus:border-destructive focus:ring-destructive/10",
            className,
          )}
          {...props}
        />
        {rightIcon ? (
          <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center justify-center">
            {rightIcon}
          </div>
        ) : null}
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
