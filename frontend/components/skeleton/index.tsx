import { cn } from '@/lib/utils';

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-muted', className)} />;
}

export function ProductCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex items-center gap-1 pt-1">
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function CategoryCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden">
      <Skeleton className="aspect-[3/4] w-full" />
    </div>
  );
}

export function CartItemSkeleton() {
  return (
    <div className="flex gap-4 p-4 border border-border rounded-2xl">
      <Skeleton className="w-20 h-20 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-5 w-16" />
        </div>
      </div>
    </div>
  );
}

export function WishlistItemSkeleton() {
  return (
    <div className="rounded-2xl border border-border overflow-hidden">
      <Skeleton className="aspect-square w-full" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-9 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function OrderCardSkeleton() {
  return (
    <div className="border border-border rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-7 w-20 rounded-full" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="w-14 h-14 rounded-xl shrink-0" />
        <Skeleton className="w-14 h-14 rounded-xl shrink-0" />
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>
    </div>
  );
}

export function ReviewCardSkeleton() {
  return (
    <div className="border border-border rounded-2xl p-5 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full shrink-0" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}

export function ProfileCardSkeleton() {
  return (
    <div className="border border-border rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton className="w-16 h-16 rounded-full shrink-0" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </div>
  );
}

export function DashboardWidgetSkeleton() {
  return (
    <div className="border border-border rounded-2xl p-5 space-y-3">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-3 w-40" />
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="space-y-3 py-8">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-64" />
    </div>
  );
}

export function HeroSkeleton() {
  return <Skeleton className="w-full h-[500px] md:h-[600px] rounded-2xl" />;
}
