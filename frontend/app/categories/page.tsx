'use client';

import { Suspense, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { notFound, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CategoryIcon } from '@/components/category/CategoryIcon';
import {
  selectCategoryDisplaySettings,
  selectRuntimeCategories,
  selectSettingsPending,
  useSettingsStore,
} from '@/store/settings-store';

export default function CategoriesPage() {
  return (
    <Suspense fallback={<CategoriesLoadingPage />}>
      <CategoriesPageContent />
    </Suspense>
  );
}

function CategoriesLoadingPage() {
  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8 pb-16">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-border">
              <div className="aspect-video animate-pulse bg-muted" />
              <div className="space-y-2 p-4">
                <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-4 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function CategoriesPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fetchSettings = useSettingsStore((state) => state.fetchSettings);
  const isLoaded = useSettingsStore((state) => state.isLoaded);
  const isLoading = useSettingsStore(selectSettingsPending);
  const categoryDisplay = useSettingsStore(selectCategoryDisplaySettings);
  const runtimeCategories = useSettingsStore(selectRuntimeCategories);
  const categories = useMemo(
    () =>
      runtimeCategories
        .slice()
        .sort((a, b) => a.home_display_order - b.home_display_order || a.name.localeCompare(b.name)),
    [runtimeCategories]
  );
  const page = Math.max(1, Number(searchParams.get('page') ?? 1) || 1);
  const lastPage = Math.max(1, Math.ceil(categories.length / 12));
  const paginatedCategories = categories.slice((page - 1) * 12, page * 12);

  function goToPage(nextPage: number) {
    const params = new URLSearchParams(searchParams);
    if (nextPage <= 1) params.delete('page');
    else params.set('page', String(nextPage));
    router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname, { scroll: false });
  }

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  if (isLoaded && !categoryDisplay.categories_page_enabled) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8 pb-16">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
          <ChevronRight size={14} />
          <span className="text-foreground font-medium">Categories</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl font-extrabold">All Categories</h1>
          <p className="text-muted-foreground mt-2">
            Browse our complete range of product categories
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-border">
                <div className="aspect-video animate-pulse bg-muted" />
                <div className="space-y-2 p-4">
                  <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-4 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : categories.length ? (
          <>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {paginatedCategories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/categories/${cat.slug}`}
                  className="group overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="relative h-48 overflow-hidden bg-muted">
                    {cat.image_url ? (
                      <Image
                        src={cat.image_url}
                        alt={cat.name}
                        fill
                        unoptimized
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-4xl font-bold text-muted-foreground">
                        <CategoryIcon icon={cat.icon} name={cat.name} className="h-16 w-16" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h3 className="truncate text-lg font-bold text-white">{cat.name}</h3>
                      <p className="text-sm text-white/80">{cat.product_count} products</p>
                    </div>
                  </div>
                  <div className="p-4">
                    {cat.description ? (
                      <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                        {cat.description}
                      </p>
                    ) : null}
                    {cat.children.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {cat.children.slice(0, 4).map((sub) => (
                          <span
                            key={sub.id}
                            className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
                          >
                            {sub.name}
                          </span>
                        ))}
                        {cat.children.length > 4 ? (
                          <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                            +{cat.children.length - 4} more
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
            {lastPage > 1 ? (
              <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Category pagination">
                <button type="button" disabled={page <= 1} onClick={() => goToPage(page - 1)} className="rounded-xl border border-border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 hover:bg-muted">Previous</button>
                <span className="text-sm text-muted-foreground">Page {Math.min(page, lastPage)} of {lastPage}</span>
                <button type="button" disabled={page >= lastPage} onClick={() => goToPage(page + 1)} className="rounded-xl border border-border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 hover:bg-muted">Next</button>
              </nav>
            ) : null}
          </>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}
