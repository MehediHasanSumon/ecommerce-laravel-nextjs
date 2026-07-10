'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CartItemSkeleton } from '@/components/skeleton';
import { useCartStore } from '@/store/cartStore';
import { selectBrandsEnabled, selectCurrencyFingerprint, useSettingsStore } from '@/store/settings-store';
import { formatPrice } from '@/utils/format';
import {
  Trash2,
  Minus,
  Plus,
  ArrowRight,
  ShieldCheck,
  ShoppingCart,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';

const backendBaseUrl = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api/auth'
).replace(/\/api\/auth\/?$/, '').replace(/\/auth\/?$/, '');

function resolveCartImage(src?: string | null) {
  if (!src) {
    return '/placeholder.svg';
  }

  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/')) {
    return src;
  }

  if (src.startsWith('storage/')) {
    return `${backendBaseUrl}/${src}`;
  }

  return `${backendBaseUrl}/storage/${src}`;
}

export default function CartPage() {
  useSettingsStore(selectCurrencyFingerprint);
  const brandsEnabled = useSettingsStore(selectBrandsEnabled);
  const [mounted, setMounted] = useState(false);
  const initialize = useCartStore((s) => s.initialize);
  const cartInitialized = useCartStore((s) => s.initialized);
  useEffect(() => {
    setMounted(true);
    initialize().catch(() => undefined);
  }, [initialize]);

  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);
  const getSubtotal = useCartStore((s) => s.getSubtotal);
  const getShipping = useCartStore((s) => s.getShipping);
  const getTax = useCartStore((s) => s.getTax);
  const getTotal = useCartStore((s) => s.getTotal);
  const cart = useCartStore((s) => s.cart);
  const handleRemove = (itemId: string, name: string) => {
    void removeItem(itemId);
    toast(`${name} removed from cart`, { icon: '🗑️' });
  };

  if (!mounted || !cartInitialized) {
    return (
      <div className="min-h-screen bg-background">
        <AnnouncementBar />
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-10">
          <div className="h-8 w-32 bg-muted rounded-lg animate-pulse mb-8" />
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <CartItemSkeleton key={i} />
              ))}
            </div>
            <div className="h-80 bg-muted rounded-2xl animate-pulse" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const subtotal = getSubtotal();
  const shipping = getShipping();
  const tax = getTax();
  const total = getTotal();
  const hasCoupon = Boolean(cart.couponCode);
  const couponDiscount = cart.summary?.couponDiscount ?? cart.coupon?.discount ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8 pb-16">
        {/* Breadcrumb */}
        <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
          <ChevronRight size={14} />
          <span className="text-foreground font-medium">Cart</span>
        </nav>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl md:text-3xl font-extrabold">
            Shopping Cart{' '}
            {items.length > 0 && (
              <span className="text-muted-foreground text-xl font-normal">({items.length})</span>
            )}
          </h1>
          {items.length > 0 && (
            <button
              onClick={() => {
                void clearCart();
                toast('Cart cleared');
              }}
            className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-destructive"
            >
              <Trash2 size={14} /> Clear cart
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
              <ShoppingCart size={40} className="text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground mb-8 max-w-sm">
              Looks like you haven&apos;t added anything yet. Explore our products and find
              something you&apos;ll love.
            </p>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
            >
              Start Shopping <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-sm sm:flex-row md:p-5"
                >
                  <Link
                    href={`/products/${item.product.slug}`}
                    className="relative h-40 w-full shrink-0 overflow-hidden rounded-xl bg-muted sm:h-24 sm:w-24"
                  >
                    <Image
                      src={resolveCartImage(item.selectedImage ?? item.product.thumbnail)}
                      alt={item.product.name}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {brandsEnabled && item.product.brand ? <p className="text-xs text-muted-foreground mb-0.5">{item.product.brand}</p> : null}
                        <Link
                          href={`/products/${item.product.slug}`}
                          className="font-semibold text-sm hover:text-primary transition-colors line-clamp-2"
                        >
                          {item.product.name}
                        </Link>
                        {(item.selectedVariant || item.selectedColor || item.selectedSize || item.selectedAttributes?.length) && (
                          <div className="flex flex-wrap gap-2 mt-1">
                            {item.selectedVariant && (
                              <span className="text-xs text-muted-foreground">
                                {item.selectedVariant}
                              </span>
                            )}
                            {item.selectedColor && (
                              <span className="text-xs text-muted-foreground capitalize">
                                Color: {item.selectedColor}
                              </span>
                            )}
                            {item.selectedSize && (
                              <span className="text-xs text-muted-foreground">
                                Size: {item.selectedSize}
                              </span>
                            )}
                            {item.selectedAttributes?.map((attribute) => (
                              <span
                                key={`${attribute.name}-${attribute.value}`}
                                className="text-xs text-muted-foreground"
                              >
                                {attribute.name}: {attribute.label ?? attribute.value}
                              </span>
                            ))}
                          </div>
                        )}
                        {item.selectedSku && (
                          <p className="mt-1 text-xs text-muted-foreground">SKU: {item.selectedSku}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemove(item.id, item.product.name)}
                        className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Remove ${item.product.name}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center border border-border rounded-xl overflow-hidden">
                        <button
                          onClick={() => void updateQuantity(item.id, item.quantity - 1)}
                          className="flex h-9 w-9 items-center justify-center transition-colors hover:bg-muted"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-10 text-center text-sm font-semibold">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => void updateQuantity(item.id, item.quantity + 1)}
                          className="flex h-9 w-9 items-center justify-center transition-colors hover:bg-muted"
                          aria-label="Increase quantity"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">
                          {formatPrice(item.subtotal ?? item.product.price * item.quantity)}
                        </p>
                        {item.quantity > 1 && (
                          <p className="text-xs text-muted-foreground">
                            {formatPrice(item.discountedPrice ?? item.unitPrice ?? item.product.price)} each
                          </p>
                        )}
                        {item.availability && !item.availability.inStock && (
                          <p className="text-xs text-orange-500">Out of stock</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Continue shopping */}
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 text-sm text-primary font-semibold hover:underline"
              >
                ← Continue Shopping
              </Link>
            </div>

            {/* Order Summary */}
            <div className="space-y-4">
              <div className="bg-card border border-border rounded-2xl p-5">
                <h2 className="font-bold text-lg mb-5">Order Summary</h2>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} items)
                    </span>
                    <span className="font-medium">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="font-medium">
                      {shipping === 0 ? <span className="text-emerald-600">FREE</span> : formatPrice(shipping)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Estimated Tax</span>
                    <span className="font-medium">{formatPrice(tax)}</span>
                  </div>
                  {hasCoupon && couponDiscount > 0 ? (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Discount</span>
                      <span className="font-medium text-emerald-600">-{formatPrice(couponDiscount)}</span>
                    </div>
                  ) : null}
                  <div className="border-t border-border pt-3 flex justify-between items-baseline">
                    <span className="font-bold text-base">Total</span>
                    <span className="font-extrabold text-2xl">{formatPrice(total)}</span>
                  </div>
                </div>

                <Link
                  href="/checkout"
                  className="mt-5 flex items-center justify-center gap-2 w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-opacity"
                >
                  Proceed to Checkout <ArrowRight size={16} />
                </Link>

                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
                    <span>Secure checkout powered by 256-bit SSL encryption</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <RotateCcw size={14} className="text-blue-500 shrink-0" />
                    <span>Free 30-day returns on all orders</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

