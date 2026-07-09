import { cn } from "@/utils/cn";
import type { CSSProperties } from "react";

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <div
      className={cn(
        "skeleton-shimmer relative overflow-hidden rounded-lg bg-muted",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.6s_ease-in-out_infinite]",
        "before:bg-gradient-to-r before:from-transparent before:via-background/55 before:to-transparent",
        className,
      )}
      style={style}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({
  lines = 1,
  className,
  widths = ["100%", "75%", "50%"],
}: {
  lines?: number;
  className?: string;
  widths?: string[];
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className="h-4"
          style={{ width: widths[index % widths.length] } as CSSProperties}
        />
      ))}
    </div>
  );
}

export function TableSkeleton({
  rows = 5,
  columns = 6,
  selectable = false,
  actions = true,
}: {
  rows?: number;
  columns?: number;
  selectable?: boolean;
  actions?: boolean;
}) {
  const totalColumns = columns + (selectable ? 1 : 0) + (actions ? 1 : 0);

  return (
    <>
      {Array.from({ length: rows }).map((_, row) => (
        <tr key={row} className="border-t border-border">
          {Array.from({ length: totalColumns }).map((__, column) => (
            <td key={column} className="px-4 py-3">
              <Skeleton
                className={cn(
                  "h-5",
                  column === 0 && selectable ? "w-4 rounded" : "",
                  column === totalColumns - 1 && actions ? "ml-auto w-20" : "",
                  column !== 0 || !selectable ? "w-full max-w-[11rem]" : "",
                )}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function FormSkeleton({ fields = 6, columns = 2 }: { fields?: number; columns?: 1 | 2 }) {
  return (
    <div className={cn("grid gap-3.5", columns === 2 && "md:grid-cols-2")}>
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-11 w-full" />
        </div>
      ))}
    </div>
  );
}

export function SettingsSectionSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-start gap-3 border-b border-border p-3.5 sm:p-4">
        <Skeleton className="h-9 w-9 shrink-0" />
        <div className="w-full max-w-2xl space-y-2">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
      <div className="p-3.5 sm:p-4">
        <FormSkeleton fields={fields} columns={2} />
      </div>
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        <Skeleton className="h-9 w-9" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="ml-auto h-9 w-24" />
      </div>
      <div className="mx-auto max-w-7xl space-y-5 px-4 py-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    </div>
  );
}
