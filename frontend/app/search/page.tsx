'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductGridSkeleton } from '@/components/skeleton';
import { MOCK_PRODUCTS } from '@/mock/products';

function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const results =
    query.length > 0
      ? MOCK_PRODUCTS.filter(
          (p) =>
            p.name.toLowerCase().includes(query.toLowerCase()) ||
            p.description.toLowerCase().includes(query.toLowerCase()) ||
            p.category.toLowerCase().includes(query.toLowerCase()) ||
            p.brand.toLowerCase().includes(query.toLowerCase()) ||
            p.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()))
        )
      : MOCK_PRODUCTS;

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
        <p className="text-muted-foreground text-sm">{results.length} products found</p>
      </div>

      {!mounted ? (
        <ProductGridSkeleton count={8} />
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {results.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
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
