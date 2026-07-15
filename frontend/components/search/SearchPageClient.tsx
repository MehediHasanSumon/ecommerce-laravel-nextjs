'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ProductListing } from '@/components/product/ProductListing';
import { ProductGridSkeleton } from '@/components/skeleton';
import { fetchProducts } from '@/services/catalog-service';
import type { Product } from '@/types';

function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const [results, setResults] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);

    fetchProducts(
      {
        search: query || undefined,
        page: 1,
        per_page: 24,
        sort: query ? 'default' : 'newest',
      },
      { signal: controller.signal },
    )
      .then((response) => {
        setResults(response.items);
        setTotal(response.pagination.total);
      })
      .catch((err: unknown) => {
        if ((err as { name?: string })?.name === 'CanceledError') return;
        setResults([]);
        setTotal(0);
        setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [query]);

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 pb-16">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/" className="hover:text-foreground">
          Home
        </Link>
        <ChevronRight size={14} />
        <span className="text-foreground font-medium">Search</span>
      </nav>

      <div className="mb-8">
        <h1 className="text-2xl font-extrabold mb-1">
          {query ? `Results for "${query}"` : 'All Products'}
        </h1>
        <p className="text-muted-foreground text-sm">{total} products found</p>
      </div>

      {loading ? (
        <ProductGridSkeleton count={8} />
      ) : error ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <h2 className="text-xl font-bold mb-2">Search is temporarily unavailable</h2>
          <p className="text-sm text-muted-foreground">Please try again in a moment.</p>
        </div>
      ) : results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
            <Search size={40} className="text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-2">No results found</h2>
          <p className="text-muted-foreground mb-8 max-w-sm">
            We couldn&apos;t find anything matching &ldquo;{query}&rdquo;. Try different keywords or
            browse our categories.
          </p>
          <div className="flex gap-3">
            <Link
              href="/shop"
              className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 text-sm"
            >
              Browse All Products
            </Link>
            <Link
              href="/categories"
              className="px-6 py-3 border border-border rounded-xl font-semibold hover:bg-muted text-sm flex items-center gap-2"
            >
              <SlidersHorizontal size={14} /> By Category
            </Link>
          </div>
        </div>
      ) : (
        <ProductListing products={results} />
      )}
    </main>
  );
}

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />
      <Suspense
        fallback={
          <div className="max-w-7xl mx-auto px-4 py-10">
            <ProductGridSkeleton count={8} />
          </div>
        }
      >
        <SearchResults />
      </Suspense>
      <Footer />
    </div>
  );
}
