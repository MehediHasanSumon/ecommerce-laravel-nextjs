'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Heart, ShoppingCart, Star, Eye, Zap } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useWishlistStore } from '@/store/wishlistStore';
import { selectBrandsEnabled, selectCurrencyFingerprint, useSettingsStore } from '@/store/settings-store';
import { formatPrice } from '@/utils/format';
import type { Product } from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
  const addItem = useCartStore((s) => s.addItem);
  const toggleItem = useWishlistStore((s) => s.toggleItem);
  const isInWishlist = useWishlistStore((s) => s.isInWishlist(product.id));
  const brandsEnabled = useSettingsStore(selectBrandsEnabled);
  useSettingsStore(selectCurrencyFingerprint);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    void addItem(product, 1);
    toast.success(`${product.name} added to cart!`, {
      description: formatPrice(product.price),
      action: { label: 'View Cart', onClick: () => router.push('/cart') },
    });
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    void toggleItem(product);
    toast(isInWishlist ? 'Removed from wishlist' : `Added to wishlist`, {
      icon: isInWishlist ? '💔' : '❤️',
    });
  };

  if (layout === 'list') {
    return (
      <Link
        href={`/products/${product.slug}`}
        className={cn(
          'group flex gap-3 rounded-2xl border border-border bg-card p-3 transition-all hover:-translate-y-0.5 hover:shadow-md sm:gap-4 sm:p-4',
          className
        )}
      >
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-muted sm:h-28 sm:w-28">
          <Image
            src={product.thumbnail}
            alt={product.name}
            fill
            unoptimized
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
        <div className="flex-1 min-w-0">
          {brandsEnabled && product.brand ? <p className="text-xs text-muted-foreground mb-1">{product.brand}</p> : null}
          <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          <div className="flex items-center gap-1 mt-1">
            <Star size={11} className="fill-amber-400 text-amber-400" />
            <span className="text-xs text-muted-foreground">
              {product.rating} ({product.reviewCount})
            </span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="font-bold">{formatPrice(product.price)}</span>
            {product.originalPrice && (
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={handleToggleWishlist}
            aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            className={cn(
              'rounded-lg border border-border p-2 transition-colors hover:bg-muted',
              isInWishlist && 'text-rose-500 border-rose-200 bg-rose-50 dark:bg-rose-950'
            )}
          >
            <Heart size={16} className={isInWishlist ? 'fill-rose-500' : ''} />
          </button>
          <button
            onClick={handleAddToCart}
            aria-label="Add to cart"
            className="rounded-lg bg-primary p-2 text-primary-foreground transition-opacity hover:opacity-90"
          >
            <ShoppingCart size={16} />
          </button>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/products/${product.slug}`}
      className={cn(
        'group relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg',
        className
      )}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        <Image
          src={product.thumbnail}
          alt={product.name}
          fill
          unoptimized
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />

        {/* Badge */}
        {product.badge && (
          <div
            className={cn(
              'absolute left-2 top-2 z-10 rounded-lg px-2 py-1 text-[11px] font-bold uppercase tracking-wide sm:left-3 sm:top-3 sm:text-xs',
              BADGE_STYLES[product.badge]
            )}
          >
            {product.badge === 'sale' && product.discount ? `-${product.discount}%` : product.badge}
          </div>
        )}

        {/* Flash sale indicator */}
        {product.isFlashSale && (
          <div className="absolute right-2 top-2 z-10 rounded-lg bg-rose-500 p-1 text-white sm:right-3 sm:top-3">
            <Zap size={12} className="fill-white" />
          </div>
        )}

        {/* Hover actions */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
        <div className="absolute bottom-2 left-0 right-0 flex min-w-0 translate-y-0 gap-1 px-2 opacity-100 transition-all duration-300 sm:bottom-3 sm:gap-2 sm:px-3 sm:translate-y-10 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100">
          <button
            onClick={handleAddToCart}
            className="flex min-w-0 flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-xl bg-background/95 px-1.5 py-2 text-[11px] font-semibold text-foreground shadow-lg backdrop-blur-sm transition-colors hover:bg-primary hover:text-primary-foreground sm:gap-2 sm:px-2 sm:text-xs"
          >
            <ShoppingCart size={13} className="shrink-0" />
            Add to Cart
          </button>
          <button
            onClick={handleToggleWishlist}
            aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            className={cn(
              'rounded-xl bg-background/95 p-2 shadow-lg backdrop-blur-sm transition-colors',
              isInWishlist
                ? 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950'
                : 'hover:bg-muted'
            )}
          >
            <Heart size={13} className={isInWishlist ? 'fill-rose-500' : ''} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              router.push(`/products/${product.slug}`);
            }}
            className="rounded-xl bg-background/95 p-2 shadow-lg backdrop-blur-sm transition-colors hover:bg-muted"
            aria-label="View product"
          >
            <Eye size={13} />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col p-2.5 sm:p-4">
        {brandsEnabled && product.brand ? <p className="text-xs text-muted-foreground font-medium mb-1">{product.brand}</p> : null}
        <h3 className="line-clamp-2 flex-1 text-[13px] font-semibold leading-snug transition-colors group-hover:text-primary sm:text-sm">
          {product.name}
        </h3>

        {/* Rating */}
        <div className="flex items-center gap-1 mt-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              size={11}
              className={cn(
                i < Math.floor(product.rating) ? 'fill-amber-400 text-amber-400' : 'text-muted'
              )}
            />
          ))}
          <span className="text-xs text-muted-foreground ml-1">
            ({product.reviewCount.toLocaleString()})
          </span>
        </div>

        {/* Price */}
        <div className="mt-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="break-words text-sm font-bold sm:text-base">{formatPrice(product.price)}</span>
            {product.originalPrice && (
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>
          {product.freeShipping && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              Free ship
            </span>
          )}
        </div>

        {/* Stock warning */}
        {product.stock <= 5 && (
          <p className="text-xs text-orange-500 font-medium mt-1">Only {product.stock} left!</p>
        )}
      </div>
    </Link>
  );
}

