'use client';

import React from 'react';

export function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded-md ${className}`} />;
}

export function ProductCardSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col gap-4">
      <Skeleton className="aspect-square w-full rounded-lg" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
      </div>
      <div className="flex justify-between items-center mt-auto">
        <Skeleton className="h-6 w-1/4" />
        <Skeleton className="h-8 w-1/3 rounded-full" />
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar Skeleton */}
      <div className="border-b border-gray-200 py-4 px-6 flex justify-between items-center">
        <Skeleton className="h-8 w-32" />
        <div className="flex gap-6">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>

      {/* Hero Skeleton */}
      <div className="py-20 px-6 max-w-7xl mx-auto text-center space-y-6">
        <Skeleton className="h-10 w-2/3 mx-auto" />
        <Skeleton className="h-6 w-1/2 mx-auto" />
        <Skeleton className="h-12 w-40 mx-auto rounded-full" />
      </div>

      {/* Grid Skeleton */}
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
