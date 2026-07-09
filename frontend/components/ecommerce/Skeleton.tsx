'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { ProductCardSkeleton } from '@/components/skeleton';

export { Skeleton, ProductCardSkeleton };

export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Skeleton className="h-8 w-32" />
          <div className="hidden gap-6 md:flex">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex gap-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-6 py-12 text-center">
        <Skeleton className="mx-auto h-10 w-2/3" />
        <Skeleton className="mx-auto h-6 w-1/2" />
        <Skeleton className="mx-auto h-12 w-40 rounded-full" />
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 py-12 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}
