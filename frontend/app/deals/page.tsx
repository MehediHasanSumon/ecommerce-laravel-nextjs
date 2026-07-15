'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Tag, ChevronRight } from 'lucide-react';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ProductListing } from '@/components/product/ProductListing';
import { ProductGridSkeleton } from '@/components/skeleton';
import { fetchProducts } from '@/services/catalog-service';
import type { PaginationMeta } from '@/features/admin/shared/types';
import type { Product } from '@/types';
import { cn } from '@/lib/utils';

const DEALS_PER_PAGE = 12;

function parsePage(searchParams: URLSearchParams) {
  const page = Number(searchParams.get('page') ?? 1);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export default function DealsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [dealProducts, setDealProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const page = useMemo(() => parsePage(searchParams), [searchParams]);

  const goToPage = useCallback(
    (nextPage: number) => {
      const params = new URLSearchParams(searchParams);
      if (nextPage <= 1) {
        params.delete('page');
      } else {
        params.set('page', String(nextPage));
      }
      router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);

    fetchProducts(
      {
        on_sale: 1,
        sort: 'discount_desc',
        page,
        per_page: DEALS_PER_PAGE,
      },
      { signal: controller.signal },
    )
      .then((response) => {
        setDealProducts(response.items);
        setPagination(response.pagination);
        if (response.pagination.last_page > 0 && page > response.pagination.last_page) {
          goToPage(response.pagination.last_page);
        }
      })
      .catch((err: unknown) => {
        if ((err as { name?: string })?.name === 'CanceledError') return;
        setDealProducts([]);
        setPagination(null);
        setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [goToPage, page]);

  const currentPage = pagination?.current_page ?? page;
  const lastPage = pagination?.last_page ?? 1;

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />
      <main>
        <div className="bg-gradient-to-r from-violet-600 to-purple-700 py-12 px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 text-white rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
            <Tag size={14} /> Special Deals
          </div>
          <h1 className="text-4xl font-extrabold text-white mb-2">Best Deals</h1>
          <p className="text-white/80">
            Handpicked offers with the biggest savings — updated daily.
          </p>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-10 pb-16">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>
            <ChevronRight size={14} />
            <span className="text-foreground font-medium">Deals</span>
          </nav>

          {loading ? (
            <ProductGridSkeleton count={DEALS_PER_PAGE} />
          ) : error ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <h2 className="text-xl font-bold mb-2">Deals are temporarily unavailable</h2>
              <p className="text-sm text-muted-foreground">Please try again in a moment.</p>
            </div>
          ) : dealProducts.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <h2 className="text-xl font-bold mb-2">No deals available right now</h2>
              <p className="text-sm text-muted-foreground">Check back soon for new offers.</p>
            </div>
          ) : (
            <ProductListing products={dealProducts} />
          )}

          {!loading && !error && lastPage > 1 ? (
            <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="Deals pagination">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => goToPage(currentPage - 1)}
                className="rounded-xl border border-border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 hover:bg-muted"
              >
                Previous
              </button>
              {Array.from({ length: Math.min(lastPage, 5) }, (_, index) => {
                const start = Math.max(1, Math.min(currentPage - 2, lastPage - 4));
                const pageNumber = start + index;
                if (pageNumber > lastPage) return null;
                return (
                  <button
                    key={pageNumber}
                    type="button"
                    aria-current={pageNumber === currentPage ? 'page' : undefined}
                    onClick={() => goToPage(pageNumber)}
                    className={cn(
                      'rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-muted',
                      pageNumber === currentPage && 'bg-primary text-primary-foreground hover:bg-primary',
                    )}
                  >
                    {pageNumber}
                  </button>
                );
              })}
              <button
                type="button"
                disabled={currentPage >= lastPage}
                onClick={() => goToPage(currentPage + 1)}
                className="rounded-xl border border-border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 hover:bg-muted"
              >
                Next
              </button>
            </nav>
          ) : null}
        </div>
      </main>
      <Footer />
    </div>
  );
}
