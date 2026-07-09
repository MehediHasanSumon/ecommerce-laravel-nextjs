'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Tag, ChevronRight } from 'lucide-react';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductGridSkeleton } from '@/components/skeleton';
import { fetchProducts } from '@/services/catalog-service';
import type { Product } from '@/types';

export default function DealsPage() {
  const [dealProducts, setDealProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);

    fetchProducts(
      {
        on_sale: 1,
        sort: 'discount_desc',
        page: 1,
        per_page: 24,
      },
      { signal: controller.signal },
    )
      .then((response) => setDealProducts(response.items))
      .catch((err: unknown) => {
        if ((err as { name?: string })?.name === 'CanceledError') return;
        setDealProducts([]);
        setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

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
            <ProductGridSkeleton count={8} />
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {dealProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
