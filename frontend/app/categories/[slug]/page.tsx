'use client';
import { use, useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CategoryIcon } from '@/components/category/CategoryIcon';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductGridSkeleton } from '@/components/skeleton';
import { fetchProducts } from '@/services/catalog-service';
import {
  selectCategoryDisplaySettings,
  selectRuntimeCategories,
  useSettingsStore,
} from '@/store/settings-store';
import type { PaginationMeta } from '@/features/admin/shared/types';
import type { Product } from '@/types';

export default function CategoryDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [productsLoading, setProductsLoading] = useState(true);
  const page = Math.max(1, Number(searchParams.get('page') ?? 1) || 1);
  const fetchSettings = useSettingsStore((state) => state.fetchSettings);
  const isLoaded = useSettingsStore((state) => state.isLoaded);
  const categoryDisplay = useSettingsStore(selectCategoryDisplaySettings);
  const runtimeCategories = useSettingsStore(selectRuntimeCategories);
  useEffect(() => {
    setMounted(true);
    void fetchSettings();
  }, [fetchSettings]);

  const category = useMemo(
    () =>
      runtimeCategories
        .flatMap((current) => [current, ...current.children])
        .find((current) => current.slug === slug),
    [runtimeCategories, slug]
  );

  useEffect(() => {
    let active = true;
    setProductsLoading(true);

    fetchProducts({ category: slug, per_page: 12, page })
      .then((response) => {
        if (active) {
          setProducts(response.items);
          setPagination(response.pagination);
        }
      })
      .catch(() => {
        if (active) setProducts([]);
      })
      .finally(() => {
        if (active) setProductsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, slug]);

  function goToPage(nextPage: number) {
    const params = new URLSearchParams(searchParams);
    if (nextPage <= 1) {
      params.delete('page');
    } else {
      params.set('page', String(nextPage));
    }
    router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname, { scroll: false });
  }

  if (isLoaded && !category) {
    return (
      <div className="min-h-screen bg-background">
        <AnnouncementBar />
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-24 text-center">
          <h1 className="text-2xl font-bold mb-4">Category Not Found</h1>
          <Link href="/categories" className="text-primary hover:underline">
            ← Back to Categories
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-background">
        <AnnouncementBar />
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-10 pb-16">
          <ProductGridSkeleton count={8} />
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
        {/* Hero */}
        <div className="relative h-48 md:h-64 overflow-hidden bg-muted">
          {category.image_url ? (
            <Image src={category.image_url} alt={category.name} fill unoptimized className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-5xl font-bold text-muted-foreground">
              <CategoryIcon icon={category.icon} name={category.name} className="h-20 w-20" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <div className="max-w-7xl mx-auto">
              <nav className="flex items-center gap-2 text-sm text-white/70 mb-2">
                <Link href="/" className="hover:text-white">
                  Home
                </Link>
                <ChevronRight size={14} />
                {categoryDisplay.categories_page_enabled ? (
                  <>
                    <Link href="/categories" className="hover:text-white">
                      Categories
                    </Link>
                    <ChevronRight size={14} />
                  </>
                ) : null}
                <span className="text-white">{category.name}</span>
              </nav>
              <h1 className="text-3xl font-extrabold text-white">{category.name}</h1>
              <p className="text-white/80 text-sm mt-1">{category.product_count} products</p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-10 pb-16">
          {/* Subcategories */}
          {category.children && category.children.length > 0 && (
            <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
              {category.children.map((sub) => (
                <Link
                  key={sub.id}
                  href={`/categories/${sub.slug}`}
                  className="flex-shrink-0 px-4 py-2 bg-card border border-border rounded-full text-sm font-medium hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                >
                  {sub.name} <span className="text-xs opacity-60 ml-1">({sub.product_count})</span>
                </Link>
              ))}
            </div>
          )}

          {!mounted || productsLoading ? (
            <ProductGridSkeleton count={8} />
          ) : products.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground mb-6">
                {pagination?.total ?? products.length} products in {category.name}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
              {pagination && pagination.last_page > 1 ? (
                <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="Category pagination">
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
