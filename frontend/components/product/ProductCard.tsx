'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Eye, Heart, Loader2, ShoppingCart, Star, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useCartStore } from '@/store/cartStore';
import { useWishlistStore } from '@/store/wishlistStore';
import {
  selectBrandsEnabled,
  selectCurrencyFingerprint,
  selectProductCardSettings,
  useSettingsStore,
} from '@/store/settings-store';
import { useAuthStore } from '@/store/auth-store';
import { toAppError } from '@/lib/errors';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/utils/format';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  className?: string;
  layout?: 'grid' | 'list';
}

const BADGE_STYLES: Record<string, string> = {
  new: 'bg-emerald-500 text-white',
  sale: 'bg-rose-500 text-white',
  hot: 'bg-orange-500 text-white',
  limited: 'bg-purple-600 text-white',
  bestseller: 'bg-amber-500 text-white',
};

export function ProductCard({ product, className, layout = 'grid' }: ProductCardProps) {
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);
  const toggleItem = useWishlistStore((state) => state.toggleItem);
  const isInWishlist = useWishlistStore((state) => state.isInWishlist(product.id));
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const brandsEnabled = useSettingsStore(selectBrandsEnabled);
  const cardSettings = useSettingsStore(selectProductCardSettings);
  const runtimeSettings = useSettingsStore((state) => state.settings);
  const wishlistEnabled = (runtimeSettings?.module_settings.wishlist ?? true) && isAuthenticated;
  const reviewsEnabled = runtimeSettings?.module_settings.reviews ?? true;
  const requireLoginBeforeCheckout = Boolean(
    runtimeSettings?.website_settings.require_login_before_checkout,
  );
  const [pendingAction, setPendingAction] = useState<'cart' | 'buy' | null>(null);
  useSettingsStore(selectCurrencyFingerprint);

  const showRating = cardSettings.style === 'hover_review' && reviewsEnabled;
  const simpleMode = cardSettings.style === 'simple';

  async function handleAddToCart(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    if (product.requiresVariantSelection && !product.primaryVariantId) {
      router.push(`/products/${product.slug}`);
      return;
    }

    try {
      setPendingAction('cart');
      await addItem(
        product.primaryVariantId
          ? { productId: Number(product.id), productVariantId: product.primaryVariantId, quantity: 1 }
          : product,
        1,
      );
      toast.success(`${product.name} added to cart!`, {
        description: formatPrice(product.price),
        action: { label: 'View Cart', onClick: () => router.push('/cart') },
      });
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setPendingAction(null);
    }
  }

  async function handleBuyNow(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    if (product.requiresVariantSelection && !product.primaryVariantId) {
      router.push(`/products/${product.slug}?buyNow=1`);
      return;
    }

    try {
      setPendingAction('buy');
      await addItem(
        product.primaryVariantId
          ? { productId: Number(product.id), productVariantId: product.primaryVariantId, quantity: 1 }
          : product,
        1,
      );
      const checkoutPath = '/checkout';
      router.push(
        requireLoginBeforeCheckout && !isAuthenticated
          ? `/login?redirect=${encodeURIComponent(checkoutPath)}`
          : checkoutPath,
      );
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setPendingAction(null);
    }
  }

  function handleToggleWishlist(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(`/products/${product.slug}`)}`);
      return;
    }

    void toggleItem(product);
    toast(isInWishlist ? 'Removed from wishlist' : 'Added to wishlist');
  }

  const purchaseButtons = (
    <>
      <button
        type="button"
        onClick={handleAddToCart}
        disabled={pendingAction !== null}
        className="inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-2 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pendingAction === 'cart' ? <Loader2 size={14} className="animate-spin" /> : <ShoppingCart size={14} />}
        <span className="truncate">Add to Cart</span>
      </button>
      <button
        type="button"
        onClick={handleBuyNow}
        disabled={pendingAction !== null}
        className="inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border border-primary bg-background px-2 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pendingAction === 'buy' ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
        <span className="truncate">Buy Now</span>
      </button>
    </>
  );

  if (layout === 'list') {
    return (
      <article
        className={cn(
          'group flex h-full min-w-0 gap-3 rounded-2xl border border-border bg-card p-3 transition-all hover:-translate-y-0.5 hover:shadow-md sm:gap-4 sm:p-4',
          className,
        )}
      >
        <Link
          href={`/products/${product.slug}`}
          className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-muted sm:h-36 sm:w-36"
        >
          <Image
            src={product.thumbnail}
            alt={product.name}
            fill
            unoptimized
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 112px, 144px"
          />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col">
          {brandsEnabled && product.brand ? <p className="mb-1 text-xs text-muted-foreground">{product.brand}</p> : null}
          <Link href={`/products/${product.slug}`} className="font-semibold text-sm line-clamp-2 transition-colors group-hover:text-primary">
            {product.name}
          </Link>
          {product.description ? (
            <p className="mt-1 hidden text-xs leading-relaxed text-muted-foreground line-clamp-2 sm:block">
              {product.description}
            </p>
          ) : null}
          {showRating ? (
            <div className="mt-1 flex items-center gap-1">
              <Star size={11} className="fill-amber-400 text-amber-400" />
              <span className="text-xs text-muted-foreground">
                {product.rating} ({product.reviewCount})
              </span>
            </div>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="font-bold">{formatPrice(product.price)}</span>
            {product.originalPrice ? (
              <span className="text-sm text-muted-foreground line-through">{formatPrice(product.originalPrice)}</span>
            ) : null}
          </div>
          <div className="mt-auto flex min-w-0 flex-wrap gap-2 pt-3">
            {purchaseButtons}
            {wishlistEnabled ? (
              <button
                type="button"
                onClick={handleToggleWishlist}
                aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                className={cn(
                  'rounded-xl border border-border p-2 transition-colors hover:bg-muted',
                  isInWishlist && 'border-rose-200 bg-rose-50 text-rose-500 dark:bg-rose-950',
                )}
              >
                <Heart size={16} className={isInWishlist ? 'fill-rose-500' : ''} />
              </button>
            ) : null}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      className={cn(
        'group relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg',
        className,
      )}
    >
      <Link href={`/products/${product.slug}`} className="relative block aspect-square overflow-hidden bg-muted">
        <Image
          src={product.thumbnail}
          alt={product.name}
          fill
          unoptimized
          className={cn('object-cover transition-transform duration-500', !simpleMode && 'group-hover:scale-105')}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />

        {product.badge ? (
          <div className={cn('absolute left-2 top-2 z-10 rounded-lg px-2 py-1 text-[11px] font-bold uppercase sm:left-3 sm:top-3 sm:text-xs', BADGE_STYLES[product.badge])}>
            {product.badge === 'sale' && product.discount ? `-${product.discount}%` : product.badge}
          </div>
        ) : null}
        {product.isFlashSale ? (
          <div className="absolute right-2 top-2 z-10 rounded-lg bg-rose-500 p-1 text-white sm:right-3 sm:top-3">
            <Zap size={12} className="fill-white" />
          </div>
        ) : null}

        {!simpleMode ? (
          <>
            <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10" />
            <div className="absolute bottom-2 left-0 right-0 flex min-w-0 translate-y-0 gap-1 px-2 opacity-100 transition-all duration-300 sm:bottom-3 sm:px-3 sm:translate-y-10 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={pendingAction !== null}
                className="flex min-w-0 flex-1 items-center justify-center gap-1 rounded-xl bg-background/95 px-1.5 py-2 text-[10px] font-semibold shadow-lg backdrop-blur-sm transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-60 sm:text-xs"
              >
                {pendingAction === 'cart' ? <Loader2 size={13} className="animate-spin" /> : <ShoppingCart size={13} />}
                <span className="truncate">Cart</span>
              </button>
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={pendingAction !== null}
                className="flex min-w-0 flex-1 items-center justify-center gap-1 rounded-xl bg-primary px-1.5 py-2 text-[10px] font-semibold text-primary-foreground shadow-lg transition-opacity hover:opacity-90 disabled:opacity-60 sm:text-xs"
              >
                {pendingAction === 'buy' ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                <span className="truncate">Buy</span>
              </button>
              {wishlistEnabled ? (
                <button
                  type="button"
                  onClick={handleToggleWishlist}
                  aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                  className={cn('rounded-xl bg-background/95 p-2 shadow-lg backdrop-blur-sm transition-colors', isInWishlist ? 'text-rose-500' : 'hover:bg-muted')}
                >
                  <Heart size={13} className={isInWishlist ? 'fill-rose-500' : ''} />
                </button>
              ) : null}
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  router.push(`/products/${product.slug}`);
                }}
                className="rounded-xl bg-background/95 p-2 shadow-lg backdrop-blur-sm transition-colors hover:bg-muted"
                aria-label="View product"
              >
                <Eye size={13} />
              </button>
            </div>
          </>
        ) : null}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col p-2.5 sm:p-4">
        {brandsEnabled && product.brand ? <p className="mb-1 text-xs font-medium text-muted-foreground">{product.brand}</p> : null}
        <Link href={`/products/${product.slug}`} className="line-clamp-2 flex-1 text-[13px] font-semibold leading-snug transition-colors group-hover:text-primary sm:text-sm">
          {product.name}
        </Link>

        {showRating ? (
          <div className="mt-2 flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star key={index} size={11} className={cn(index < Math.floor(product.rating) ? 'fill-amber-400 text-amber-400' : 'text-muted')} />
            ))}
            <span className="ml-1 text-xs text-muted-foreground">({product.reviewCount.toLocaleString()})</span>
          </div>
        ) : null}

        <div className="mt-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="break-words text-sm font-bold sm:text-base">{formatPrice(product.price)}</span>
            {product.originalPrice ? <span className="text-xs text-muted-foreground line-through">{formatPrice(product.originalPrice)}</span> : null}
          </div>
          {product.freeShipping ? <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Free ship</span> : null}
        </div>

        {product.stock > 0 && product.stock <= 5 ? <p className="mt-1 text-xs font-medium text-orange-500">Only {product.stock} left!</p> : null}
        {simpleMode ? <div className="mt-3 flex min-w-0 flex-wrap gap-2">{purchaseButtons}</div> : null}
      </div>
    </article>
  );
}
