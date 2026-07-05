import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/utils/cn";

type AlertProps = {
  type?: "error" | "success" | "info";
  title?: string;
  message: string;
};

export function Alert({ type = "info", title, message }: AlertProps) {
  const isError = type === "error";
  const isSuccess = type === "success";

  return (
    <div
      className={cn(
        "flex gap-3 rounded-2xl border px-4 py-3.5 text-sm shadow-sm",
        isError &&
          "border-destructive/20 bg-destructive/8 text-destructive",
        isSuccess &&
          "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200",
        !isError &&
          !isSuccess &&
          "border-border bg-muted/70 text-foreground",
      )}
      role={isError ? "alert" : "status"}
    >
      {isSuccess ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <div>
        {title ? <p className="font-semibold">{title}</p> : null}
        <p className="leading-6">{message}</p>
      </div>
    </div>
  );
}
