'use client';
import { useState, use, useEffect, useMemo } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ChevronRight,
  Star,
  ShoppingCart,
  Heart,
  Share2,
  Shield,
  Truck,
  RotateCcw,
  Check,
  Minus,
  Plus,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
} from 'lucide-react';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ProductCard } from '@/components/product/ProductCard';
import { useCartStore } from '@/store/cartStore';
import { useWishlistStore } from '@/store/wishlistStore';
import { selectBrandsEnabled, selectCurrencyFingerprint, useSettingsStore } from '@/store/settings-store';
import { formatPrice } from '@/utils/format';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  fetchProductDetail,
  submitProductReview,
  type ProductDetail,
  type ProductDetailResponse,
  type ProductVariantDetail,
} from '@/services/catalog-service';
import { useAuthStore } from '@/store/auth-store';
import { toAppError } from '@/lib/errors';

function findSelectedVariant(
  product: ProductDetail | null,
  selectedColor: string | undefined,
  selectedSize: string | undefined,
  attributeNames: string[]
): ProductVariantDetail | null {
  if (!product?.variants?.length) return null;

  return product.variants.find((variant) => {
    const colorEntry = Object.entries(variant.options).find(([name]) =>
      name.toLowerCase().includes('color')
    );
    const selectableEntry = Object.entries(variant.options).find(([name]) => {
      const normalized = name.toLowerCase();
      return attributeNames.some((attribute) => attribute.toLowerCase() === normalized) && !normalized.includes('color');
    });
    const colorMatches = selectedColor ? colorEntry?.[1].value === selectedColor : true;
    const sizeMatches = selectedSize ? selectableEntry?.[1].name === selectedSize || selectableEntry?.[1].value === selectedSize : true;

    return colorMatches && sizeMatches;
  }) ?? null;
}

export default function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  useSettingsStore(selectCurrencyFingerprint);
  const brandsEnabled = useSettingsStore(selectBrandsEnabled);
  const [mounted, setMounted] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string | undefined>(undefined);
  const [selectedSize, setSelectedSize] = useState<string | undefined>(undefined);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'description' | 'specs' | 'reviews'>('description');
  const [data, setData] = useState<ProductDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);

  const addItem = useCartStore((s) => s.addItem);
  const toggleItem = useWishlistStore((s) => s.toggleItem);
  const isInWishlist = useWishlistStore((s) => s.isInWishlist);
  const initializeCart = useCartStore((s) => s.initialize);
  const initializeWishlist = useWishlistStore((s) => s.initialize);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const authInitialized = useAuthStore((s) => s.initialized);
  const fetchCurrentUser = useAuthStore((s) => s.fetchCurrentUser);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    initializeCart().catch(() => undefined);
    initializeWishlist().catch(() => undefined);
  }, [initializeCart, initializeWishlist]);

  useEffect(() => {
    if (!authInitialized) {
      fetchCurrentUser().catch(() => undefined);
    }
  }, [authInitialized, fetchCurrentUser]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);
    fetchProductDetail(slug, { signal: controller.signal })
      .then((response) => {
        setData(response);
        setSelectedImage(0);
      })
      .catch((error: unknown) => {
        if ((error as { name?: string })?.name === 'CanceledError') return;
        setData(null);
        setLoadError('This product does not exist or is not available.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [slug]);

  const product = data?.product ?? null;
  const reviews = data?.reviews ?? [];
  const relatedProducts = (data?.relatedProducts.length ? data.relatedProducts : data?.similarProducts ?? []).slice(0, 4);
  const variantAttributeNames = useMemo(
    () => product?.attributes?.map((attribute) => attribute.name) ?? [],
    [product?.attributes]
  );
  const selectedVariant = useMemo(
    () => findSelectedVariant(product, selectedColor, selectedSize, variantAttributeNames),
    [product, selectedColor, selectedSize, variantAttributeNames]
  );
  const displayPrice = selectedVariant?.price ?? product?.price ?? 0;
  const displayOriginalPrice = selectedVariant?.originalPrice ?? product?.originalPrice ?? null;
  const displayStock = selectedVariant?.stock ?? product?.stock ?? 0;
  const displaySku = selectedVariant?.sku ?? product?.sku ?? '';
  const displayImages = selectedVariant?.images?.length ? selectedVariant.images : product?.images ?? [];

  useEffect(() => {
    if (product) {
      setSelectedColor(product.colors?.[0]?.value);
      setSelectedSize(product.sizes?.[0]);
      setQuantity(1);
    }
  }, [product]);

  useEffect(() => {
    if (displayImages.length && selectedImage >= displayImages.length) {
      setSelectedImage(0);
    }
  }, [displayImages.length, selectedImage]);

  useEffect(() => {
    if (!product?.seo) return;
    document.title = product.seo.title || product.name;
    const description = product.seo.description || product.description;
    if (description) {
      let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'description';
        document.head.appendChild(meta);
      }
      meta.content = description;
    }
  }, [product]);

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-background">
        <AnnouncementBar />
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-10">
          <div className="grid lg:grid-cols-2 gap-12">
            <div className="aspect-square bg-muted rounded-2xl animate-pulse" />
            <div className="space-y-4">
              {[80, 60, 40, 90, 40, 60].map((w, i) => (
                <div
                  key={i}
                  className={`h-6 bg-muted rounded animate-pulse`}
                  style={{ width: `${w}%` }}
                />
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!product || loadError) {
    return (
      <div className="min-h-screen bg-background">
        <AnnouncementBar />
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-24 text-center">
          <h1 className="text-3xl font-bold mb-4">Product Not Found</h1>
          <p className="text-muted-foreground mb-8">
            {loadError ?? "This product doesn't exist or has been removed."}
          </p>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90"
          >
            Back to Shop
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const inWishlist = isInWishlist(product.id);
  const handleAddToCart = () => {
    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      toast.error('Please select a size');
      return;
    }
    void addItem({
      productId: Number(product.id),
      productVariantId: selectedVariant ? Number(selectedVariant.id) : undefined,
      quantity,
      selectedColor,
      selectedSize,
      selectedAttributes: Object.entries(selectedVariant?.options ?? {}).map(([name, option]) => ({
        name,
        value: option.value,
        label: option.name,
      })),
      selectedOptions: selectedVariant?.options ?? {},
    });
    toast.success(`${product.name} added to cart!`, {
      description: `${quantity} × ${formatPrice(displayPrice)}`,
      action: { label: 'View Cart', onClick: () => router.push('/cart') },
    });
  };
  const handleWishlist = () => {
    void toggleItem({ ...product, price: displayPrice, originalPrice: displayOriginalPrice ?? undefined, stock: displayStock, sku: displaySku });
    toast(inWishlist ? 'Removed from wishlist' : 'Added to wishlist!', {
      icon: inWishlist ? '💔' : '❤️',
    });
  };
  const handleReviewSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setReviewMessage(null);

    if (!isAuthenticated) {
      toast.error('Please sign in to write a review.');
      return;
    }

    setReviewSubmitting(true);
    try {
      const message = await submitProductReview(slug, {
        rating: reviewRating,
        comment: reviewComment.trim(),
      });
      setReviewComment('');
      setReviewRating(5);
      setReviewMessage(message);
      toast.success(message);
    } catch (error) {
      const appError = toAppError(error);
      toast.error(appError.message);
    } finally {
      setReviewSubmitting(false);
    }
  };
  const discount = product.discount ?? 0;
  const savings = displayOriginalPrice ? displayOriginalPrice - displayPrice : 0;

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8 pb-16">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6 flex-wrap">
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
          <ChevronRight size={14} />
          <Link href="/shop" className="hover:text-foreground">
            Shop
          </Link>
          <ChevronRight size={14} />
          {product.categories?.map((category) => (
            <span key={category.slug} className="contents">
              <Link href={`/categories/${category.slug}`} className="hover:text-foreground">
                {category.name}
              </Link>
              <ChevronRight size={14} />
            </span>
          )) ?? (
            <Link href={`/categories/${product.categorySlug}`} className="hover:text-foreground">
              {product.category}
            </Link>
          )}
          <span className="text-foreground font-medium truncate max-w-48">{product.name}</span>
        </nav>

        {/* Main product section */}
        <div className="mb-16 grid gap-8 lg:grid-cols-2 lg:gap-16">
          {/* Gallery */}
          <div className="space-y-4">
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
              <Image
                src={displayImages[selectedImage] ?? product.thumbnail}
                alt={product.name}
                fill
                unoptimized
                className="object-cover"
                priority
              />
              {product.badge && (
                <div
                  className={cn(
                    'absolute top-4 left-4 px-3 py-1.5 rounded-xl text-xs font-bold uppercase z-10',
                    product.badge === 'sale'
                      ? 'bg-rose-500 text-white'
                      : product.badge === 'new'
                        ? 'bg-emerald-500 text-white'
                        : product.badge === 'hot'
                          ? 'bg-orange-500 text-white'
                          : product.badge === 'bestseller'
                            ? 'bg-amber-500 text-white'
                            : 'bg-purple-600 text-white'
                  )}
                >
                  {product.badge === 'sale' && discount ? `-${discount}%` : product.badge}
                </div>
              )}
              {displayImages.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setSelectedImage(
                        (i) => (i - 1 + displayImages.length) % displayImages.length
                      )
                    }
                    className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 shadow-lg transition-colors hover:bg-background"
                    aria-label="Previous image"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={() => setSelectedImage((i) => (i + 1) % displayImages.length)}
                    className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 shadow-lg transition-colors hover:bg-background"
                    aria-label="Next image"
                  >
                    <ChevronRightIcon size={18} />
                  </button>
                </>
              )}
            </div>
            {displayImages.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {displayImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={cn(
                      'relative aspect-square overflow-hidden rounded-xl border-2 bg-muted transition-colors',
                      selectedImage === i
                        ? 'border-primary'
                        : 'border-transparent hover:border-muted-foreground/30'
                    )}
                  >
                    <Image
                      src={img}
                      alt={`${product.name} ${i + 1}`}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {brandsEnabled && product.brand && product.brandSlug ? (
                  <Link
                    href={`/brands/${product.brandSlug}`}
                    className="text-sm font-semibold text-primary hover:underline"
                  >
                    {product.brand}
                  </Link>
                ) : null}
                {product.freeShipping && (
                  <span className="text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-md">
                    Free Shipping
                  </span>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold leading-tight">{product.name}</h1>
              <p className="text-sm text-muted-foreground mt-1">SKU: {displaySku}</p>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-3">
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={16}
                    className={
                      i < Math.floor(product.rating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-muted'
                    }
                  />
                ))}
              </div>
              <span className="text-sm font-semibold">{product.rating}</span>
              <button className="text-sm text-muted-foreground hover:text-primary hover:underline">
                ({product.reviewCount.toLocaleString()} reviews)
              </button>
            </div>

            {/* Price */}
            <div className="flex flex-wrap items-end gap-3">
              <span className="text-3xl font-extrabold">{formatPrice(displayPrice)}</span>
              {displayOriginalPrice && (
                <>
                  <span className="text-lg text-muted-foreground line-through mb-0.5">
                    {formatPrice(displayOriginalPrice)}
                  </span>
                  <span className="mb-0.5 inline-flex h-7 items-center rounded-full border border-border bg-muted px-3 text-xs font-semibold text-foreground/80 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300">
                    Save {formatPrice(savings)}
                  </span>
                </>
              )}
            </div>

            <p className="text-muted-foreground leading-relaxed">{product.description}</p>

            {/* Colors */}
            {product.colors && product.colors.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">
                  Color:{' '}
                  <span className="font-normal text-muted-foreground capitalize">
                    {selectedColor}
                  </span>
                </p>
                <div className="flex gap-2 flex-wrap">
                  {product.colors.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => {
                        setSelectedColor(color.value);
                        setQuantity(1);
                      }}
                      title={color.name}
                      className={cn(
                      'relative h-9 w-9 rounded-full border-2 transition-all',
                        selectedColor === color.value
                          ? 'border-primary scale-110 shadow-md'
                          : 'border-transparent hover:border-muted-foreground/50'
                      )}
                      style={{ backgroundColor: color.hex }}
                    >
                      {selectedColor === color.value && (
                        <Check
                          size={14}
                          className="absolute inset-0 m-auto text-white drop-shadow"
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sizes */}
            {product.sizes && product.sizes.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold">
                    Size: <span className="font-normal text-muted-foreground">{selectedSize}</span>
                  </p>
                  <button className="text-xs text-primary hover:underline">Size Guide</button>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => {
                        setSelectedSize(size);
                        setQuantity(1);
                      }}
                      className={cn(
                        'h-10 min-w-[44px] rounded-xl border px-3 text-sm font-medium transition-colors',
                        selectedSize === size
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-sm font-semibold">Quantity:</span>
              <div className="flex items-center border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="flex h-10 w-10 items-center justify-center transition-colors hover:bg-muted"
                  aria-label="Decrease quantity"
                >
                  <Minus size={15} />
                </button>
                <span className="w-12 text-center font-semibold">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => Math.min(Math.max(displayStock, 1), q + 1))}
                  className="flex h-10 w-10 items-center justify-center transition-colors hover:bg-muted"
                  aria-label="Increase quantity"
                >
                  <Plus size={15} />
                </button>
              </div>
              <span className="text-sm text-muted-foreground">{displayStock} available</span>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={handleAddToCart}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-bold text-primary-foreground shadow-lg transition-opacity hover:opacity-90"
              >
                <ShoppingCart size={18} /> Add to Cart
              </button>
              <button
                onClick={handleWishlist}
                className={cn(
                  'rounded-xl border p-3.5 font-medium transition-colors',
                  inWishlist
                    ? 'border-rose-300 bg-rose-50 text-rose-500 dark:bg-rose-950'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <Heart size={18} className={inWishlist ? 'fill-rose-500' : ''} />
              </button>
              <button
                className="rounded-xl border border-border p-3.5 transition-colors hover:border-primary/50"
                aria-label="Share product"
              >
                <Share2 size={18} />
              </button>
            </div>

            {/* Trust */}
            <div className="grid grid-cols-1 gap-3 border-t border-border pt-2 sm:grid-cols-3">
              {[
                { icon: Truck, text: product.shippingInfo ?? `Free delivery over ${formatPrice(75)}` },
                { icon: Shield, text: product.warrantyInfo ?? '2-year warranty' },
                { icon: RotateCcw, text: product.returnPolicy ?? '30-day free returns' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex flex-col items-center gap-1.5 text-center">
                  <Icon size={18} className="text-primary" />
                  <span className="text-xs text-muted-foreground">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="mb-16">
          <div className="flex border-b border-border mb-8 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {(['description', 'specs', 'reviews'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-6 py-3 text-sm font-semibold capitalize whitespace-nowrap -mb-px transition-colors',
                  activeTab === tab
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {tab === 'reviews'
                  ? `Reviews (${reviews.length})`
                  : tab === 'specs'
                    ? 'Specifications'
                    : 'Description'}
              </button>
            ))}
          </div>

          {activeTab === 'description' && (
            <div className="max-w-3xl">
              <p className="text-muted-foreground leading-relaxed mb-6">
                {product.longDescription ?? product.description}
              </p>
              {product.features && (
                <div>
                  <h3 className="font-bold mb-4">Key Features</h3>
                  <ul className="space-y-3">
                    {product.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                        <span className="text-sm">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {activeTab === 'specs' && product.specifications && (
            <div className="max-w-2xl">
              <div className="border border-border rounded-2xl overflow-hidden">
                {Object.entries(product.specifications).map(([key, value], i) => (
              <div key={key} className={cn('grid sm:grid-cols-[10rem_1fr]', i % 2 === 0 && 'bg-muted/30')}>
                    <div className="px-5 py-3.5 text-sm font-semibold">{key}</div>
                    <div className="border-t border-border px-5 py-3.5 text-sm text-muted-foreground sm:border-l sm:border-t-0">
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-5 max-w-3xl">
              {isAuthenticated && (
                <form onSubmit={handleReviewSubmit} className="rounded-2xl border border-border bg-card p-5">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-sm font-bold">Write a review</h3>
                      <p className="mt-1 text-xs text-muted-foreground">Share your experience with this product.</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, index) => {
                        const rating = index + 1;

                        return (
                          <button
                            key={rating}
                            type="button"
                            onClick={() => setReviewRating(rating)}
                            className="rounded-md p-1 transition-colors hover:bg-muted"
                            aria-label={`${rating} star rating`}
                          >
                            <Star
                              size={18}
                              className={rating <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40'}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {reviewMessage && (
                    <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                      {reviewMessage}
                    </div>
                  )}
                  <div className="space-y-3">
                    <textarea
                      value={reviewComment}
                      onChange={(event) => setReviewComment(event.target.value)}
                      className="min-h-28 w-full resize-y rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none transition-colors focus:border-primary"
                      placeholder="Write your review"
                      minLength={10}
                      maxLength={2000}
                      required
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={reviewSubmitting}
                        className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
                      </button>
                    </div>
                  </div>
                </form>
              )}
              {reviews.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Star size={40} className="mx-auto mb-3 opacity-20" />
                  <p>No reviews yet. Be the first to review this product!</p>
                </div>
              ) : (
                reviews.map((review) => (
                  <div key={review.id} className="bg-card border border-border rounded-2xl p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-center gap-3">
                        <Image
                          src={review.user.avatar ?? ''}
                          alt={review.user.name}
                          width={40}
                          height={40}
                          unoptimized
                          className="rounded-full"
                        />
                        <div>
                          <p className="font-semibold text-sm">{review.user.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <div className="flex">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  size={11}
                                  className={
                                    i < review.rating
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'text-muted'
                                  }
                                />
                              ))}
                            </div>
                            {review.verified && (
                              <span className="text-xs text-emerald-600 font-medium">
                                ✓ Verified
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {review.createdAt.slice(0, 10)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {review.comment}
                    </p>
                    {review.replies?.length ? (
                      <div className="mt-4 space-y-3 border-l-2 border-border pl-4">
                        {review.replies.map((reply) => (
                          <div key={reply.id} className="rounded-xl bg-muted/50 p-4">
                            <div className="mb-1 flex items-center justify-between gap-3">
                              <p className="text-xs font-bold uppercase text-foreground">{reply.author}</p>
                              {reply.createdAt ? <span className="text-xs text-muted-foreground">{reply.createdAt.slice(0, 10)}</span> : null}
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">{reply.comment}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section>
            <h2 className="text-2xl font-extrabold mb-6">Related Products</h2>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 md:gap-6">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}

