import { cn } from "@/utils/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800", className)}
    />
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
