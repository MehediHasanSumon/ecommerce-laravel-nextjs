'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CartItemSkeleton } from '@/components/skeleton';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/auth-store';
import { selectBrandsEnabled, selectCurrencyFingerprint, useSettingsStore } from '@/store/settings-store';
import { formatPrice } from '@/utils/format';
import { cn } from '@/lib/utils';
import {
  Trash2,
  Minus,
  Plus,
  ArrowRight,
  ShieldCheck,
  ShoppingCart,
  ChevronRight,
  RotateCcw,
  Tag,
  Loader2,
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
  const [couponInput, setCouponInput] = useState('');
  const initialize = useCartStore((s) => s.initialize);
  const cartInitialized = useCartStore((s) => s.initialized);
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

  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);
  const getSubtotal = useCartStore((s) => s.getSubtotal);
  const getShipping = useCartStore((s) => s.getShipping);
  const getTax = useCartStore((s) => s.getTax);
  const getTotal = useCartStore((s) => s.getTotal);
  const cart = useCartStore((s) => s.cart);
  const applyCoupon = useCartStore((s) => s.applyCoupon);
  const removeCoupon = useCartStore((s) => s.removeCoupon);
  const isCouponLoading = useCartStore((s) => s.isCouponLoading);
  const couponMessage = useCartStore((s) => s.couponMessage);
  const couponMessageType = useCartStore((s) => s.couponMessageType);

  const showInitialSkeleton = !mounted || !authInitialized || !cartInitialized;
  const handleRemove = (itemId: string, name: string) => {
    void removeItem(itemId);
    toast.success(`${name} removed from cart`, {
      icon: <Trash2 size={16} className="text-muted-foreground" />,
    });
  };

  if (showInitialSkeleton) {
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
  const promoDiscount = cart.summary?.itemDiscount ?? 0;

  // Calculate compare/original price discount across items
  const productDiscount = items.reduce((sum, item) => {
    if (item.product.originalPrice && item.product.originalPrice > item.product.price) {
      return sum + ((item.product.originalPrice - item.product.price) * item.quantity);
    }
    if (item.discountTotal && item.discountTotal > 0) {
      return sum + item.discountTotal;
    }
    return sum;
  }, 0);

  const rawSubtotal = items.reduce((sum, item) => {
    const unitRegular = item.product.originalPrice && item.product.originalPrice > item.product.price
      ? item.product.originalPrice
      : (item.unitPrice ?? item.product.price);
    return sum + (unitRegular * item.quantity);
  }, 0);

  const totalSavings = productDiscount + promoDiscount + couponDiscount;

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
                toast.success('Cart cleared', {
                  icon: <Trash2 size={16} className="text-muted-foreground" />,
                });
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
              {items.map((item) => {
                const hasOriginalPrice = item.product.originalPrice && item.product.originalPrice > item.product.price;
                return (
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
                          {(() => {
                            const renderedBadges: string[] = [];
                            if (item.selectedVariant) renderedBadges.push(item.selectedVariant);
                            if (item.selectedColor) renderedBadges.push(`Color: ${item.selectedColor}`);
                            if (item.selectedSize) renderedBadges.push(`Size: ${item.selectedSize}`);
                            item.selectedAttributes?.forEach((attr) => {
                              const text = `${attr.name}: ${attr.label ?? attr.value}`;
                              if (!renderedBadges.some((b) => b.toLowerCase().includes(text.toLowerCase()) || text.toLowerCase().includes(b.toLowerCase()))) {
                                renderedBadges.push(text);
                              }
                            });

                            return renderedBadges.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {renderedBadges.map((badge, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center rounded-md bg-secondary/80 px-2 py-0.5 text-xs text-muted-foreground font-medium"
                                  >
                                    {badge}
                                  </span>
                                ))}
                              </div>
                            ) : null;
                          })()}
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
                          <div className="flex items-baseline justify-end gap-1.5">
                            <span className="font-bold text-foreground">
                              {formatPrice(item.subtotal ?? item.product.price * item.quantity)}
                            </span>
                            {hasOriginalPrice ? (
                              <span className="text-xs text-muted-foreground line-through">
                                {formatPrice(item.product.originalPrice! * item.quantity)}
                              </span>
                            ) : null}
                          </div>
                          <div className="flex items-center justify-end gap-1.5 mt-0.5">
                            {item.quantity > 1 && (
                              <p className="text-xs text-muted-foreground">
                                {formatPrice(item.discountedPrice ?? item.unitPrice ?? item.product.price)} each
                              </p>
                            )}
                            {item.product.discount ? (
                              <span className="inline-flex items-center rounded-md bg-rose-50 px-1.5 py-0.5 text-[11px] font-bold text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50">
                                -{item.product.discount}%
                              </span>
                            ) : null}
                          </div>
                          {item.availability && !item.availability.inStock && (
                            <p className="text-xs text-orange-500 mt-1">Out of stock</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

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
                    <span className="font-medium">{formatPrice(productDiscount > 0 ? rawSubtotal : subtotal)}</span>
                  </div>

                  {productDiscount > 0 ? (
                    <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-medium">
                      <span>Product Discount</span>
                      <span className="font-semibold">-{formatPrice(productDiscount)}</span>
                    </div>
                  ) : null}

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="font-medium">
                      {shipping === 0 ? <span className="text-emerald-700 font-semibold dark:text-emerald-400">FREE</span> : formatPrice(shipping)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Estimated Tax</span>
                    <span className="font-medium">{formatPrice(tax)}</span>
                  </div>

                  {promoDiscount > 0 ? (
                    <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-medium">
                      <span>Promotional Discount</span>
                      <span className="font-semibold">-{formatPrice(promoDiscount)}</span>
                    </div>
                  ) : null}

                  {hasCoupon && couponDiscount > 0 ? (
                    <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-medium">
                      <span>Coupon ({cart.couponCode})</span>
                      <span className="font-semibold">-{formatPrice(couponDiscount)}</span>
                    </div>
                  ) : null}

                  {/* Total Savings Highlight Banner */}
                  {totalSavings > 0 ? (
                    <div className="rounded-xl border border-emerald-300/60 bg-emerald-50 px-3.5 py-2.5 dark:border-emerald-800/60 dark:bg-emerald-950/40">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Total Savings</span>
                        <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">-{formatPrice(totalSavings)}</span>
                      </div>
                    </div>
                  ) : null}

                  {/* Total Amount */}
                  <div className="border-t border-border pt-3 flex justify-between items-baseline">
                    <span className="font-bold text-base">Total</span>
                    <span className="font-extrabold text-2xl text-foreground">{formatPrice(total)}</span>
                  </div>
                </div>

                {/* Coupon Input Box */}
                <div className="mt-5 border-t border-border pt-4">
                  {hasCoupon ? (
                    <div className="flex items-center justify-between rounded-xl bg-muted p-2.5 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Tag size={13} className="text-primary" />
                        <span className="font-medium text-foreground">Coupon: <strong className="uppercase">{cart.couponCode}</strong></span>
                      </div>
                      <button
                        type="button"
                        onClick={() => void removeCoupon()}
                        className="text-xs font-semibold text-destructive hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!couponInput.trim()) return;
                        const ok = await applyCoupon(couponInput.trim());
                        if (ok) {
                          setCouponInput('');
                          toast.success('Coupon applied successfully!');
                        }
                      }}
                      className="flex gap-2"
                    >
                      <input
                        type="text"
                        placeholder="Promo / Coupon code"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value)}
                        className="h-10 flex-1 rounded-xl border border-border bg-background px-3 text-xs uppercase placeholder:normal-case placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={isCouponLoading || !couponInput.trim()}
                        className="h-10 rounded-xl bg-secondary px-3.5 text-xs font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80 disabled:opacity-50"
                      >
                        {isCouponLoading ? <Loader2 size={13} className="animate-spin" /> : 'Apply'}
                      </button>
                    </form>
                  )}
                  {couponMessage && (
                    <p className={cn("mt-1.5 text-xs", couponMessageType === 'error' ? "text-destructive" : "text-emerald-600")}>
                      {couponMessage}
                    </p>
                  )}
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
