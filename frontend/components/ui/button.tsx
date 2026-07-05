import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/utils/cn";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
  icon?: ReactNode;
};

const variants = {
  primary:
    "bg-primary text-primary-foreground shadow-[0_16px_30px_-18px_hsl(var(--primary)/0.8)] hover:opacity-95 active:scale-[0.99]",
  secondary:
    "border border-border bg-background text-foreground shadow-sm hover:bg-muted active:scale-[0.99]",
  ghost:
    "text-muted-foreground hover:bg-muted hover:text-foreground active:scale-[0.99]",
  danger: "bg-destructive text-destructive-foreground hover:opacity-90 active:scale-[0.99]",
};

const sizes = {
  sm: "h-10 rounded-xl px-3.5 text-xs",
  md: "h-12 rounded-2xl px-4 text-sm",
  lg: "h-13 rounded-2xl px-5 text-base",
  icon: "h-10 w-10 rounded-full p-0",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  isLoading,
  icon,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 dark:focus-visible:ring-offset-background",
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : icon}
      {children}
    </button>
  );
}
