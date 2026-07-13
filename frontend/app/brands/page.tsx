'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight } from 'lucide-react';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { fetchBrands, type BrandListResponse } from '@/services/catalog-service';
import { selectBrandsEnabled, selectSettingsPending, useSettingsStore } from '@/store/settings-store';

export default function BrandsPage() {
  const brandsEnabled = useSettingsStore(selectBrandsEnabled);
  const settingsPending = useSettingsStore(selectSettingsPending);
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<BrandListResponse | null>(null);
  const [loading, setLoading] = useState(true);
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

    fetchBrands({}, { signal: controller.signal })
      .then((response) => setData(response))
      .catch((error: unknown) => {
        if ((error as { name?: string })?.name === 'CanceledError') return;
        setData({ featured: [], items: [], pagination: { current_page: 1, last_page: 1, per_page: 48, total: 0, from: null, to: null } });
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [brandsEnabled, settingsPending]);

  const featuredBrands = data?.featured ?? [];
  const brands = data?.items ?? [];
  const showFeaturedBrands = !mounted || loading || featuredBrands.length > 0;
  const showBrands = !mounted || loading || brands.length > 0;

  if (mounted && !settingsPending && !brandsEnabled) {
    return (
      <div className="min-h-screen bg-background">
        <AnnouncementBar />
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-24 text-center">
          <h1 className="text-2xl font-bold mb-4">Brand Not Found</h1>
          <Link href="/shop" className="text-primary hover:underline">
            Back to Shop
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
      <main className="max-w-7xl mx-auto px-4 py-8 pb-16">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
          <ChevronRight size={14} />
          <span className="text-foreground font-medium">Brands</span>
        </nav>

        <div className="mb-10">
          <h1 className="text-3xl font-extrabold">Top Brands</h1>
          <p className="text-muted-foreground mt-2">
            Shop authentic products from the world&apos;s most trusted brands
          </p>
        </div>

        {/* Featured Brands */}
        {showFeaturedBrands ? (
        <section className="mb-12">
          <h2 className="text-lg font-bold mb-5">Featured Brands</h2>
          {!mounted || loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-video bg-muted rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : featuredBrands.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
              {featuredBrands.map((brand) => (
                <Link
                  key={brand.id}
                  href={`/brands/${brand.slug}`}
                  className="group relative h-40 rounded-2xl overflow-hidden bg-muted"
                >
                  <Image
                    src={brand.coverImage}
                    alt={brand.name}
                    fill
                    unoptimized
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between">
                    <div>
                      <p className="text-white font-bold">{brand.name}</p>
                      <p className="text-white/70 text-xs">{brand.productCount} products</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : null}
        </section>
        ) : null}

        {/* All Brands Grid */}
        {showBrands ? (
        <section>
          <h2 className="text-lg font-bold mb-5">All Brands</h2>
          {!mounted || loading ? (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-36 bg-muted rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : brands.length > 0 ? (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {brands.map((brand) => (
              <Link
                key={brand.id}
                href={`/brands/${brand.slug}`}
                className="flex flex-col items-center justify-center gap-3 p-5 bg-card border border-border rounded-2xl hover:shadow-md hover:border-primary/30 transition-all group"
              >
                <div className="w-12 h-12 relative">
                  <Image
                    src={brand.logo}
                    alt={brand.name}
                    fill
                    unoptimized
                    className="object-contain grayscale group-hover:grayscale-0 transition-all"
                  />
                </div>
                <span className="text-xs font-semibold text-center">{brand.name}</span>
                <span className="text-xs text-muted-foreground">{brand.productCount} items</span>
              </Link>
              ))}
            </div>
          ) : null}
        </section>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}
