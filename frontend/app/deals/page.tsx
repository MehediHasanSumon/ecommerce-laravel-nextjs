'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Tag, ChevronRight } from 'lucide-react';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductGridSkeleton } from '@/components/skeleton';
import { MOCK_PRODUCTS } from '@/mock/products';

export default function DealsPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const dealProducts = MOCK_PRODUCTS.filter((p) => p.discount && p.discount > 0).sort(
    (a, b) => (b.discount ?? 0) - (a.discount ?? 0)
  );

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

          {!mounted ? (
            <ProductGridSkeleton count={8} />
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
