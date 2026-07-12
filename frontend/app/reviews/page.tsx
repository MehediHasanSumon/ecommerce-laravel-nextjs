'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { fetchPublicReviews, type PublicReview } from '@/services/catalog-service';
import type { PaginationMeta } from '@/features/admin/shared/types';
import { selectBrandsEnabled, useSettingsStore } from '@/store/settings-store';

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'CU';
}

function ReviewsContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const brandsEnabled = useSettingsStore(selectBrandsEnabled);
  const page = Math.max(1, Number(searchParams.get('page') ?? 1) || 1);
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    current_page: 1,
    last_page: 1,
    per_page: 12,
    total: 0,
    from: null,
    to: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const pageLinks = useMemo(() => {
    const start = Math.max(1, pagination.current_page - 2);
    const end = Math.min(pagination.last_page, start + 4);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [pagination.current_page, pagination.last_page]);

  function pageHref(targetPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (targetPage <= 1) {
      params.delete('page');
    } else {
      params.set('page', String(targetPage));
    }

    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);

    fetchPublicReviews({ page, per_page: 12 }, { signal: controller.signal })
      .then((response) => {
        setReviews(response.items);
        setPagination(response.pagination);
      })
      .catch((err: unknown) => {
        if ((err as { name?: string })?.name === 'CanceledError') return;
        setReviews([]);
        setPagination({
          current_page: page,
          last_page: 1,
          per_page: 12,
          total: 0,
          from: null,
          to: null,
        });
        setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [page]);

  return (
    <>
        <nav className="mb-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
          <ChevronRight size={14} />
          <span className="font-medium text-foreground">Reviews</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl font-extrabold">Customer Reviews</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Read verified customer feedback from approved product reviews.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
            {Array.from({ length: 9 }).map((_, index) => (
              <div key={index} className="h-64 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <h2 className="text-xl font-bold">Reviews are temporarily unavailable</h2>
            <p className="mt-2 text-sm text-muted-foreground">Please try again in a moment.</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <h2 className="text-xl font-bold">No reviews yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Approved product reviews will appear here.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {reviews.map((review) => (
                <article key={review.id} className="flex h-full flex-col rounded-2xl border border-border bg-card p-5">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star
                        key={index}
                        size={14}
                        className={index < review.rating ? 'fill-amber-400 text-amber-400' : 'text-muted'}
                      />
                    ))}
                  </div>

                  <p className="mt-4 line-clamp-4 text-sm leading-6 text-muted-foreground">
                    &ldquo;{review.comment}&rdquo;
                  </p>

                  {review.product ? (
                    <Link
                      href={`/products/${review.product.slug}`}
                      className="mt-5 flex items-center gap-3 rounded-xl bg-muted/60 p-2 transition-colors hover:bg-muted"
                    >
                      <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                        <Image
                          src={review.product.thumbnail}
                          alt={review.product.name}
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">
                          {review.product.name}
                        </span>
                        {brandsEnabled && review.product.brand ? (
                          <span className="block truncate text-xs text-muted-foreground">
                            {review.product.brand}
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  ) : null}

                  <div className="mt-auto flex items-center gap-3 border-t border-border pt-4">
                    {review.user.avatar ? (
                      <Image
                        src={review.user.avatar}
                        alt={review.user.name}
                        width={36}
                        height={36}
                        unoptimized
                        className="h-9 w-9 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {initials(review.user.name)}
                      </span>
                    )}
                    <div>
                      <p className="text-sm font-semibold">{review.user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {review.verified ? 'Verified purchase' : 'Customer review'}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {pagination.last_page > 1 ? (
              <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {pagination.from ?? 0}-{pagination.to ?? 0} of {pagination.total} reviews
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={pageHref(Math.max(1, pagination.current_page - 1))}
                    aria-disabled={pagination.current_page <= 1}
                    className={`inline-flex h-10 items-center gap-1 rounded-xl border border-border px-3 text-sm font-semibold transition-colors hover:bg-muted ${pagination.current_page <= 1 ? 'pointer-events-none opacity-50' : ''}`}
                  >
                    <ChevronLeft size={15} />
                    Prev
                  </Link>
                  {pageLinks.map((pageNumber) => (
                    <Link
                      key={pageNumber}
                      href={pageHref(pageNumber)}
                      className={`inline-flex h-10 min-w-10 items-center justify-center rounded-xl border px-3 text-sm font-semibold transition-colors ${pageNumber === pagination.current_page ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted'}`}
                    >
                      {pageNumber}
                    </Link>
                  ))}
                  <Link
                    href={pageHref(Math.min(pagination.last_page, pagination.current_page + 1))}
                    aria-disabled={pagination.current_page >= pagination.last_page}
                    className={`inline-flex h-10 items-center gap-1 rounded-xl border border-border px-3 text-sm font-semibold transition-colors hover:bg-muted ${pagination.current_page >= pagination.last_page ? 'pointer-events-none opacity-50' : ''}`}
                  >
                    Next
                    <ChevronRight size={15} />
                  </Link>
                </div>
              </div>
            ) : null}
          </>
        )}
    </>
  );
}

export default function ReviewsPage() {
  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-10 pb-16">
        <Suspense
          fallback={
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
              {Array.from({ length: 12 }).map((_, index) => (
                <div key={index} className="h-64 animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          }
        >
          <ReviewsContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
