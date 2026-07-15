'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, ChevronRight, Home, SearchX, ShoppingBag, Sparkles, TrendingUp, Zap } from 'lucide-react';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductGridSkeleton } from '@/components/skeleton';
import { fetchCollectionDetail, type CollectionDetailResponse } from '@/services/catalog-service';
import { useCountdown } from '@/hooks/useCountdown';
import { cn } from '@/utils/cn';

function CountdownBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center bg-white/20 backdrop-blur-sm rounded-2xl font-extrabold text-3xl md:text-4xl text-white tabular-nums">
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-xs text-white/70 mt-1 uppercase tracking-wide">{label}</span>
    </div>
  );
}

function CollectionHero({ data }: { data: CollectionDetailResponse }) {
  const collection = data.collection;
  const isFlash = Boolean(collection.startsAt && collection.endsAt);
  const isBestSeller = collection.ruleKey === 'best_sellers' || collection.slug === 'best-sellers';
  const Icon = isFlash ? Zap : isBestSeller ? TrendingUp : Sparkles;
  const gradient = isFlash
    ? 'from-rose-600 to-rose-800'
    : isBestSeller
      ? 'from-amber-500 to-orange-600'
      : 'from-emerald-600 to-teal-700';
  const { days, hours, minutes, seconds } = useCountdown(collection.endsAt ?? '2026-12-31T23:59:59Z');

  return (
    <div className={`bg-gradient-to-r ${gradient} py-12 px-4 text-center`}>
      <div className="inline-flex items-center gap-2 bg-white/20 text-white rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
        <Icon size={14} className={isFlash ? 'fill-white' : ''} /> {collection.promotionalText ?? collection.title}
      </div>
      <p className="text-white/80">{collection.description || collection.subtitle}</p>
      {isFlash && collection.endsAt ? (
        <div className="mt-8 flex items-center justify-center gap-4">
          {days > 0 ? (
            <>
              <CountdownBox value={days} label={days === 1 ? 'Day' : 'Days'} />
              <span className="text-2xl font-bold text-white/60 mb-4">:</span>
            </>
          ) : null}
          <CountdownBox value={hours} label="Hours" />
          <span className="text-2xl font-bold text-white/60 mb-4">:</span>
          <CountdownBox value={minutes} label="Minutes" />
          <span className="text-2xl font-bold text-white/60 mb-4">:</span>
          <CountdownBox value={seconds} label="Seconds" />
        </div>
      ) : null}
    </div>
  );
}

export function CollectionPageContent({ slug }: { slug: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentPage = Math.max(1, Number(searchParams.get('page') ?? 1) || 1);
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<CollectionDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError(false);

    fetchCollectionDetail(slug, { page: currentPage, per_page: 12 }, { signal: controller.signal })
      .then((response) => setData(response))
      .catch((error: unknown) => {
        if ((error as { name?: string })?.name === 'CanceledError') return;
        setData(null);
        setLoadError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [slug, currentPage]);

  useEffect(() => {
    if (!data?.collection.seo) return;
    document.title = data.collection.seo.title || data.collection.title;
    const description = data.collection.seo.description || data.collection.description;
    if (description) {
      let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'description';
        document.head.appendChild(meta);
      }
      meta.content = description;
    }
  }, [data]);

  const goToPage = useCallback((page: number) => {
    const nextPage = Math.max(1, page);
    const params = new URLSearchParams(searchParams.toString());
    if (nextPage <= 1) {
      params.delete('page');
    } else {
      params.set('page', String(nextPage));
    }
    const query = params.toString();
    router.push(query ? `/collections/${slug}?${query}` : `/collections/${slug}`);
  }, [router, searchParams, slug]);

  useEffect(() => {
    if (!data || loading || data.pagination.last_page < 1 || currentPage <= data.pagination.last_page) return;
    goToPage(data.pagination.last_page);
  }, [currentPage, data, goToPage, loading]);

  if (loadError) {
    return (
      <div className="min-h-screen bg-background">
        <AnnouncementBar />
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-16 md:py-24">
          <section className="mx-auto flex max-w-2xl flex-col items-center text-center">
            <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-muted">
              <SearchX size={40} className="text-muted-foreground" />
              <span className="absolute -right-1 -top-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                <ShoppingBag size={18} />
              </span>
            </div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Collection unavailable</p>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
              This collection could not be found
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-6 text-muted-foreground md:text-base">
              The collection may have been moved, unpublished, or the link may be outdated. Browse all products or return home to keep shopping.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/shop"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Browse Products <ArrowRight size={16} />
              </Link>
              <Link
                href="/"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-background px-6 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                <Home size={16} /> Back Home
              </Link>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />
      <main>
        {loading || !data ? (
          <div className="h-40 animate-pulse bg-muted" />
        ) : (
          <CollectionHero data={data} />
        )}

        <div className="max-w-7xl mx-auto px-4 py-10 pb-16">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
            <Link href="/" className="hover:text-foreground">Home</Link>
            <ChevronRight size={14} />
            <span className="text-foreground font-medium">{data?.collection.title ?? 'Collection'}</span>
          </nav>

          
          {!mounted || loading ? (
            <ProductGridSkeleton count={8} />
          ) : data && data.products.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:gap-4 md:grid-cols-3 md:gap-5 xl:grid-cols-4 xl:gap-6">
              {data.products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : null}

          {!loading && data && data.pagination.last_page > 1 ? (
            <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="Collection pagination">
              <button
                type="button"
                disabled={data.pagination.current_page <= 1}
                onClick={() => goToPage(data.pagination.current_page - 1)}
                className="rounded-xl border border-border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 hover:bg-muted"
              >
                Previous
              </button>
              {Array.from({ length: Math.min(data.pagination.last_page, 5) }, (_, index) => {
                const start = Math.max(1, Math.min(data.pagination.current_page - 2, data.pagination.last_page - 4));
                const pageNumber = start + index;
                if (pageNumber > data.pagination.last_page) return null;
                return (
                  <button
                    key={pageNumber}
                    type="button"
                    aria-current={pageNumber === data.pagination.current_page ? 'page' : undefined}
                    onClick={() => goToPage(pageNumber)}
                    className={cn(
                      'rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-muted',
                      pageNumber === data.pagination.current_page && 'bg-primary text-primary-foreground hover:bg-primary',
                    )}
                  >
                    {pageNumber}
                  </button>
                );
              })}
              <button
                type="button"
                disabled={data.pagination.current_page >= data.pagination.last_page}
                onClick={() => goToPage(data.pagination.current_page + 1)}
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
