'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, ShoppingCart, Trash2, ChevronRight, ShoppingBag } from 'lucide-react';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useWishlistStore } from '@/store/wishlistStore';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/auth-store';
import { selectBrandsEnabled, selectCurrencyFingerprint, useSettingsStore } from '@/store/settings-store';
import { formatPrice } from '@/utils/format';
import { toast } from 'sonner';

export default function WishlistPage() {
  useSettingsStore(selectCurrencyFingerprint);
  const brandsEnabled = useSettingsStore(selectBrandsEnabled);
  const [mounted, setMounted] = useState(false);
  const initialize = useWishlistStore((s) => s.initialize);
  const storeLoading = useWishlistStore((s) => s.isLoading);
  const wishlistInitialized = useWishlistStore((s) => s.initialized);
  const authInitialized = useAuthStore((s) => s.initialized);
  const fetchCurrentUser = useAuthStore((s) => s.fetchCurrentUser);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (!authInitialized) {
      fetchCurrentUser().catch(() => undefined);
      return;
    }

    initialize().catch(() => undefined);
  }, [authInitialized, fetchCurrentUser, initialize, mounted]);

  const items = useWishlistStore((s) => s.items);
  const removeItem = useWishlistStore((s) => s.removeItem);
  const clearWishlist = useWishlistStore((s) => s.clearWishlist);
  const addToCart = useCartStore((s) => s.addItem);

  const handleAddToCart = (item: (typeof items)[0]) => {
    void addToCart(item.product, 1);
    toast.success(`${item.product.name} added to cart!`);
  };

  const handleRemove = (itemId: string, name: string) => {
    void removeItem(itemId);
    toast(`${name} removed from wishlist`, { icon: '💔' });
  };

  if (!mounted || !authInitialized || !wishlistInitialized || storeLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AnnouncementBar />
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-10">
          <div className="h-8 w-32 bg-muted rounded-lg animate-pulse mb-8" />
          <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:gap-4 md:grid-cols-3 md:gap-5 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border overflow-hidden">
                <div className="aspect-square bg-muted animate-pulse" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-5 bg-muted rounded w-20 animate-pulse" />
                  <div className="h-9 bg-muted rounded-xl animate-pulse" />
                </div>
              </div>
            ))}
          </div>
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
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
          <ChevronRight size={14} />
          <span className="text-foreground font-medium">Wishlist</span>
        </nav>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-3">
              <Heart size={28} className="text-rose-500 fill-rose-500" />
              My Wishlist{' '}
              {items.length > 0 && (
                <span className="text-muted-foreground text-xl font-normal">({items.length})</span>
              )}
            </h1>
          </div>
          {items.length > 0 && (
            <div className="flex gap-3">
              <button
                onClick={() => {
                  items.forEach((item) => {
                    void addToCart(item.product, 1);
                  });
                  toast.success(`${items.length} items added to cart!`);
                }}
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                <ShoppingCart size={15} /> Add All to Cart
              </button>
              <button
                onClick={() => {
                  void clearWishlist();
                  toast('Wishlist cleared');
                }}
                className="text-sm text-muted-foreground hover:text-destructive flex items-center gap-1.5 transition-colors"
              >
                <Trash2 size={14} /> Clear
              </button>
            </div>
          )}
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
              <Heart size={40} className="text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Your wishlist is empty</h2>
            <p className="text-muted-foreground mb-8 max-w-sm">
              Save items you love and come back to them anytime.
            </p>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
            >
              <ShoppingBag size={16} /> Start Browsing
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:gap-4 md:grid-cols-3 md:gap-5 xl:grid-cols-4 xl:gap-6">
            {items.map((item) => (
              <div
                key={item.id}
                className="group bg-card border border-border rounded-2xl overflow-hidden hover:shadow-md transition-shadow"
              >
                <Link
                  href={`/products/${item.product.slug}`}
                  className="relative block aspect-square overflow-hidden bg-muted"
                >
                  <Image
                    src={item.product.thumbnail}
                    alt={item.product.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleRemove(item.id, item.product.name);
                    }}
                    className="absolute top-3 right-3 w-8 h-8 bg-background/90 backdrop-blur-sm rounded-full flex items-center justify-center text-rose-500 hover:bg-destructive hover:text-white transition-colors shadow-md"
                  >
                    <Trash2 size={14} />
                  </button>
                </Link>
                <div className="p-4">
                  {brandsEnabled && item.product.brand ? <p className="text-xs text-muted-foreground mb-0.5">{item.product.brand}</p> : null}
                  <Link
                    href={`/products/${item.product.slug}`}
                    className="font-semibold text-sm hover:text-primary transition-colors line-clamp-2 leading-snug"
                  >
                    {item.product.name}
                  </Link>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="font-bold">{formatPrice(item.discountedPrice ?? item.product.price)}</span>
                    {(item.discountedPrice || item.product.originalPrice) && (
                      <span className="text-xs text-muted-foreground line-through">
                        {formatPrice(item.product.originalPrice ?? item.product.price)}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {item.stockStatus === 'in_stock' ? 'In stock' : item.stockStatus === 'out_of_stock' ? 'Out of stock' : 'Unavailable'}
                  </p>
                  <button
                    onClick={() => handleAddToCart(item)}
                    disabled={item.stockStatus !== 'in_stock'}
                    className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    <ShoppingCart size={14} /> Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

