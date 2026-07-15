'use client';
import { use, useCallback, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronRight, ExternalLink } from 'lucide-react';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductGridSkeleton } from '@/components/skeleton';
import { fetchBrandDetail, type BrandDetailResponse } from '@/services/catalog-service';
import { selectBrandsEnabled, selectSettingsPending, useSettingsStore } from '@/store/settings-store';

export default function BrandDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const brandsEnabled = useSettingsStore(selectBrandsEnabled);
  const settingsPending = useSettingsStore(selectSettingsPending);
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<BrandDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const page = Math.max(1, Number(searchParams.get('page') ?? 1) || 1);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (settingsPending || !brandsEnabled) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setLoadError(false);

    fetchBrandDetail(slug, { page, per_page: 12 }, { signal: controller.signal })
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
  }, [brandsEnabled, page, settingsPending, slug]);

  const brand = data?.brand ?? null;
  const products = data?.products ?? [];
  const pagination = data?.pagination ?? null;

  const goToPage = useCallback((nextPage: number) => {
    const params = new URLSearchParams(searchParams);
    if (nextPage <= 1) {
      params.delete('page');
    } else {
      params.set('page', String(nextPage));
    }
    router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (!data || loading || data.pagination.last_page < 1 || page <= data.pagination.last_page) return;
    goToPage(data.pagination.last_page);
  }, [data, goToPage, loading, page]);

  useEffect(() => {
    if (!brand?.seo) return;
    document.title = brand.seo.title || brand.name;
    const description = brand.seo.description || brand.description;
    if (description) {
      let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'description';
        document.head.appendChild(meta);
      }
      meta.content = description;
    }
  }, [brand]);

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-background">
        <AnnouncementBar />
        <Header />
        <main>
          <div className="h-48 md:h-60 bg-muted animate-pulse" />
          <div className="max-w-7xl mx-auto px-4 py-10 pb-16">
            <div className="h-4 w-80 bg-muted rounded animate-pulse mb-8" />
            <ProductGridSkeleton count={8} />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!brand || loadError || (!settingsPending && !brandsEnabled)) {
    return (
      <div className="min-h-screen bg-background">
        <AnnouncementBar />
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-24 text-center">
          <h1 className="text-2xl font-bold mb-4">Brand Not Found</h1>
          <Link href={brandsEnabled ? "/brands" : "/shop"} className="text-primary hover:underline">
            {brandsEnabled ? "Back to Brands" : "Back to Shop"}
          </Link>
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
        {/* Brand Hero */}
        <div className="relative h-48 md:h-60 overflow-hidden bg-muted">
          <Image src={brand.coverImage} alt={brand.name} fill unoptimized className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <div className="max-w-7xl mx-auto flex items-end justify-between">
              <div>
                <nav className="flex items-center gap-2 text-sm text-white/70 mb-2">
                  <Link href="/" className="hover:text-white">
                    Home
                  </Link>
                  <ChevronRight size={14} />
                  <Link href="/brands" className="hover:text-white">
                    Brands
                  </Link>
                  <ChevronRight size={14} />
                  <span className="text-white">{brand.name}</span>
                </nav>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center p-2">
                    <Image
                      src={brand.logo}
                      alt={brand.name}
                      width={48}
                      height={48}
                      unoptimized
                      className="object-contain"
                    />
                  </div>
                  <div>
                    <h1 className="text-3xl font-extrabold text-white">{brand.name}</h1>
                    <p className="text-white/80 text-sm">{brand.productCount} products</p>
                  </div>
                </div>
              </div>
              {brand.website && (
                <a
                  href={brand.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-xl text-sm font-medium hover:bg-white/30 transition-colors"
                >
                  Visit Website <ExternalLink size={13} />
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-10 pb-16">
          <p className="text-muted-foreground mb-8 max-w-2xl">{brand.description}</p>

          {!mounted ? (
            <ProductGridSkeleton count={8} />
          ) : products.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground mb-6">
                {pagination?.total ?? products.length} products from {brand.name}
              </p>
              <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:gap-4 md:grid-cols-3 md:gap-5 xl:grid-cols-4 xl:gap-6">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
              {pagination && pagination.last_page > 1 ? (
                <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="Brand pagination">
                  <button
                    type="button"
                    disabled={pagination.current_page <= 1}
                    onClick={() => goToPage(pagination.current_page - 1)}
                    className="rounded-xl border border-border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 hover:bg-muted"
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.min(pagination.last_page, 5) }, (_, index) => {
                    const start = Math.max(1, Math.min(pagination.current_page - 2, pagination.last_page - 4));
                    const pageNumber = start + index;
                    if (pageNumber > pagination.last_page) return null;
                    return (
                      <button
                        key={pageNumber}
                        type="button"
                        aria-current={pageNumber === pagination.current_page ? 'page' : undefined}
                        onClick={() => goToPage(pageNumber)}
                        className={`rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-muted ${pageNumber === pagination.current_page ? 'bg-primary text-primary-foreground hover:bg-primary' : ''}`}
                      >
                        {pageNumber}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    disabled={pagination.current_page >= pagination.last_page}
                    onClick={() => goToPage(pagination.current_page + 1)}
                    className="rounded-xl border border-border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 hover:bg-muted"
                  >
                    Next
                  </button>
                </nav>
              ) : null}
            </>
          ) : null}
        </div>
      </main>
      <Footer />
    </div>
  );
}
