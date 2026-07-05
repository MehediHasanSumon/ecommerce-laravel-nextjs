'use client';
import Link from 'next/link';
import Image from 'next/image';
import { createElement, useMemo, useState, useEffect } from 'react';
import {
  ArrowRight,
  Star,
  ShoppingBag,
  Zap,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductGridSkeleton } from '@/components/skeleton';
import { useCountdown } from '@/hooks/useCountdown';
import { HOMEPAGE_REVIEWS } from '@/mock/reviews';
import { MOCK_BLOG_POSTS } from '@/mock/blog';
import { fetchHomePageSections, type HomePageSections } from '@/services/catalog-service';
import {
  selectCategoryDisplaySettings,
  selectFeatureCardSettings,
  selectHomeFeatureCards,
  selectRuntimeCategories,
  selectSettingsPending,
  useSettingsStore,
} from '@/store/settings-store';

const HERO_SLIDES = [
  {
    id: 1,
    eyebrow: 'New Collection 2026',
    title: 'Elevate Your\nEveryday Style',
    description:
      'Discover premium products crafted for those who demand excellence. Shop the latest drops from top brands.',
    cta: 'Shop Now',
    ctaHref: '/shop',
    secondary: 'Explore Categories',
    secondaryHref: '/categories',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200&auto=format&fit=crop',
    gradient: 'from-slate-900 to-slate-700',
    accent: 'text-rose-400',
  },
  {
    id: 2,
    eyebrow: 'Flash Sale — Up to 40% Off',
    title: 'Premium Tech\nAt Your Reach',
    description:
      "Top-tier electronics, audio gear, and smart devices — now with exclusive deals you won't find anywhere else.",
    cta: 'Shop Tech',
    ctaHref: '/categories/electronics',
    secondary: 'View Flash Sale',
    secondaryHref: '/flash-sale',
    image:
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200&auto=format&fit=crop',
    gradient: 'from-blue-950 to-slate-800',
    accent: 'text-cyan-400',
  },
  {
    id: 3,
    eyebrow: 'Summer Active Collection',
    title: 'Gear Up For\nGreatness',
    description:
      'From yoga mats to performance shorts — outfit your active lifestyle with the gear that keeps up with you.',
    cta: 'Shop Sports',
    ctaHref: '/categories/sports',
    secondary: 'New Arrivals',
    secondaryHref: '/new-arrivals',
    image:
      'https://images.unsplash.com/photo-1599447421416-3414500d18a5?w=1200&auto=format&fit=crop',
    gradient: 'from-emerald-950 to-slate-800',
    accent: 'text-emerald-400',
  },
];

function HeroSlider() {
  const [current, setCurrent] = useState(0);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setCurrent((c) => (c + 1) % HERO_SLIDES.length), 6000);
    return () => clearInterval(timer);
  }, []);

  const slide = HERO_SLIDES[current];
  return (
    <div className="relative h-[480px] md:h-[560px] lg:h-[620px] rounded-2xl overflow-hidden">
      <Image src={slide.image} alt="Hero" fill className="object-cover" priority />
      <div className={`absolute inset-0 bg-gradient-to-r ${slide.gradient} opacity-80`} />
      <div className="absolute inset-0 flex items-center">
        <div className="max-w-7xl mx-auto px-8 md:px-12 w-full">
          <div className="max-w-xl">
            <span
              className={`text-sm font-bold uppercase tracking-widest mb-4 block ${slide.accent}`}
            >
              {slide.eyebrow}
            </span>
            <h1
              suppressHydrationWarning
              className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-5 whitespace-pre-line"
            >
              {slide.title}
            </h1>
            <p className="text-base md:text-lg text-white/80 mb-8 max-w-sm leading-relaxed">
              {slide.description}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href={slide.ctaHref}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-slate-900 rounded-xl font-bold text-sm hover:bg-white/90 transition-colors shadow-lg"
              >
                {slide.cta} <ArrowRight size={15} />
              </Link>
              <Link
                href={slide.secondaryHref}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white/15 backdrop-blur-sm text-white rounded-xl font-semibold text-sm hover:bg-white/25 transition-colors border border-white/20"
              >
                {slide.secondary}
              </Link>
            </div>
          </div>
        </div>
      </div>
      <button
        onClick={() => setCurrent((c) => (c - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-colors"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        onClick={() => setCurrent((c) => (c + 1) % HERO_SLIDES.length)}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-colors"
      >
        <ChevronRight size={20} />
      </button>
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
        {HERO_SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${i === current ? 'w-8 bg-white' : 'w-1.5 bg-white/40'}`}
          />
        ))}
      </div>
      {!mounted && <div className="absolute inset-0 bg-slate-900 animate-pulse" />}
    </div>
  );
}

function FlashSaleTimer({ endsAt }: { endsAt: string }) {
  const { hours, minutes, seconds } = useCountdown(endsAt);
  return (
    <div className="flex items-center gap-1.5">
      {[
        { v: hours, l: 'h' },
        { v: minutes, l: 'm' },
        { v: seconds, l: 's' },
      ].map(({ v, l }) => (
        <div key={l} className="flex items-center gap-1">
          <span className="w-10 h-10 flex items-center justify-center bg-primary text-primary-foreground rounded-lg font-bold text-lg tabular-nums">
            {String(v).padStart(2, '0')}
          </span>
          <span className="text-muted-foreground text-xs font-medium">{l}</span>
        </div>
      ))}
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  href,
  linkLabel = 'View all',
  icon: Icon,
}: {
  title: string;
  subtitle?: string;
  href: string;
  linkLabel?: string;
  icon?: React.ElementType;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-8">
      <div>
        {Icon && (
          <div className="flex items-center gap-2 mb-1">
            <Icon size={16} className="text-primary" />
            <span className="text-xs font-bold text-primary uppercase tracking-wider">
              Featured
            </span>
          </div>
        )}
        <h2 className="text-2xl font-extrabold">{title}</h2>
        {subtitle && <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>}
      </div>
      <Link
        href={href}
        className="shrink-0 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline mt-1 whitespace-nowrap"
      >
        {linkLabel} <ArrowRight size={14} />
      </Link>
    </div>
  );
}

function renderLucideIcon(name: string, props: { className?: string; size?: number; 'aria-hidden'?: boolean }) {
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string; size?: number }>>;
  const Icon = icons[name] ?? LucideIcons.BadgeCheck;

  return createElement(Icon, props);
}

function FeatureCardsSection() {
  const featureCardSettings = useSettingsStore(selectFeatureCardSettings);
  const cards = useSettingsStore(selectHomeFeatureCards);
  const activeCards = useMemo(
    () => cards.slice().sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title)),
    [cards]
  );

  if (!featureCardSettings.enabled || activeCards.length === 0) {
    return null;
  }

  return (
    <section className="my-4 border-y border-border py-6" aria-label="Store service highlights">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {activeCards.map((card) => {
          return (
            <article
              key={card.id}
              className="group flex h-full min-h-24 items-center gap-3 rounded-xl p-3 transition-all hover:-translate-y-0.5 hover:bg-card hover:shadow-sm focus-within:bg-card"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                {renderLucideIcon(card.icon, { size: 19, 'aria-hidden': true })}
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold">{card.title}</h2>
                <p className="text-xs leading-relaxed text-muted-foreground">{card.description}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function HomeCollectionSection({
  entry,
  loading,
  mounted,
}: {
  entry?: HomePageSections['collections'][number];
  loading: boolean;
  mounted: boolean;
}) {
  const collection = entry?.collection;
  const products = entry?.items ?? [];
  const isFlashSale = Boolean(collection?.startsAt && collection?.endsAt);
  const isTrending = collection?.ruleKey === 'trending';
  const href = collection?.aliases?.[0] ?? collection?.url ?? '/shop';

  if (!loading && (!collection || products.length === 0)) {
    return null;
  }

  if (isFlashSale) {
    return (
      <section className="py-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500 rounded-xl">
              <Zap size={18} className="text-white fill-white" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold">{collection?.title ?? 'Flash Sale'}</h2>
              <p className="text-xs text-muted-foreground">
                {collection?.subtitle ?? 'Limited-time deals — grab them before they&apos;re gone'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Ends in:</span>
            {mounted && collection?.endsAt ? (
              <FlashSaleTimer endsAt={collection.endsAt} />
            ) : (
              <div className="flex gap-1.5">
                {['h', 'm', 's'].map((l) => (
                  <div key={l} className="w-10 h-10 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            )}
            <Link
              href={href}
              className="ml-1 text-sm font-semibold text-primary hover:underline hidden md:inline"
            >
              See all →
            </Link>
          </div>
        </div>
        {loading ? (
          <ProductGridSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="py-10">
      <SectionHeader
        icon={isTrending ? TrendingUp : undefined}
        title={collection?.title ?? 'Collection'}
        subtitle={collection?.subtitle ?? collection?.description}
        href={href}
      />
      {loading ? (
        <ProductGridSkeleton count={collection?.productLimit && collection.productLimit > 4 ? 8 : 4} />
      ) : products.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No products available right now.
        </div>
      )}
    </section>
  );
}

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const [homeData, setHomeData] = useState<HomePageSections | null>(null);
  const [homeLoading, setHomeLoading] = useState(true);
  const [homeError, setHomeError] = useState(false);
  const homeCollections = homeData?.collections ?? [];
  const categoryDisplay = useSettingsStore(selectCategoryDisplaySettings);
  const runtimeCategories = useSettingsStore(selectRuntimeCategories);
  const settingsLoading = useSettingsStore(selectSettingsPending);
  const homeCategories = useMemo(
    () =>
      runtimeCategories
        .filter((category) => category.show_on_home)
        .slice()
        .sort((a, b) => a.home_display_order - b.home_display_order || a.name.localeCompare(b.name))
        .slice(0, 8),
    [runtimeCategories]
  );
  const showHomeCategories =
    categoryDisplay.enable_home_category_section &&
    categoryDisplay.home_category_variant !== 'hidden';

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setHomeLoading(true);
    setHomeError(false);

    fetchHomePageSections({ signal: controller.signal })
      .then((response) => setHomeData(response))
      .catch((error: unknown) => {
        if ((error as { name?: string })?.name === 'CanceledError') return;
        setHomeData(null);
        setHomeError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setHomeLoading(false);
      });

    return () => controller.abort();
  }, []);

  const topBrands = homeData?.sections.topBrands.items ?? [];
  const homeProducts = homeData?.sections.products.items ?? [];
  const renderCollections = (anchor: string, placement: 'before' | 'after') =>
    homeCollections
      .filter((entry) => entry.collection.displayPositionAnchor === anchor && entry.collection.displayPositionPlacement === placement)
      .sort((a, b) => a.collection.homeSortOrder - b.collection.homeSortOrder || b.collection.priority - a.collection.priority)
      .map((entry) => (
        <HomeCollectionSection key={entry.collection.id} entry={entry} loading={false} mounted={mounted} />
      ));

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />
      <main className="max-w-7xl mx-auto px-4 pb-16">
        {/* Hero */}
        <section className="py-6">
          <HeroSlider />
        </section>

        {renderCollections('feature_cards', 'before')}
        <FeatureCardsSection />
        {renderCollections('feature_cards', 'after')}

        {renderCollections('categories', 'before')}
        {showHomeCategories ? (
          <section className="py-10">
            <SectionHeader
              title="Shop by Category"
              subtitle="Explore our curated premium categories"
              href={categoryDisplay.categories_page_enabled ? '/categories' : '/shop'}
            />
            {settingsLoading ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="aspect-square animate-pulse rounded-2xl bg-muted" />
                ))}
              </div>
            ) : categoryDisplay.home_category_variant === 'icon_grid' ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {homeCategories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/categories/${cat.slug}`}
                    className="group flex min-h-36 flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card p-4 text-center transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-lg font-bold text-primary">
                      {cat.icon || cat.name.slice(0, 1)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-bold group-hover:text-primary">{cat.name}</p>
                      <p className="text-xs text-muted-foreground">{cat.product_count} items</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {homeCategories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/categories/${cat.slug}`}
                    className="group overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <div className="relative aspect-square bg-muted">
                      {cat.image_url ? (
                        <Image
                          src={cat.image_url}
                          alt={cat.name}
                          fill
                          unoptimized
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-muted-foreground">
                          {cat.icon || cat.name.slice(0, 1)}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
                        <p className="truncate text-sm font-bold text-white">{cat.name}</p>
                        <p className="text-xs text-white/70">{cat.product_count} items</p>
                      </div>
                    </div>
                    {cat.children.length ? (
                      <div className="flex flex-wrap gap-1.5 p-3">
                        {cat.children.slice(0, 3).map((child) => (
                          <span key={child.id} className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                            {child.name}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </Link>
                ))}
              </div>
            )}
          </section>
        ) : null}
        {renderCollections('categories', 'after')}

        {homeLoading ? (
          <HomeCollectionSection loading mounted={mounted} />
        ) : null}

        {renderCollections('promo_banners', 'before')}
        {/* Promo banners */}
        <section className="py-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          {[
            {
              src: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop',
              color: 'from-slate-900/80',
              accent: 'text-amber-400',
              badge: 'New Season',
              title: 'Bags & Carry-ons',
              href: '/categories/bags',
            },
            {
              src: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=800&auto=format&fit=crop',
              color: 'from-emerald-900/80',
              accent: 'text-emerald-300',
              badge: 'Up to 40% Off',
              title: 'Summer Clothing',
              href: '/categories/clothing',
            },
          ].map((b) => (
            <div key={b.title} className="relative rounded-2xl overflow-hidden h-52 group">
              <Image
                src={b.src}
                alt={b.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className={`absolute inset-0 bg-gradient-to-r ${b.color} to-transparent`} />
              <div className="absolute inset-0 flex flex-col justify-center px-8">
                <span className={`text-xs font-bold uppercase tracking-widest mb-2 ${b.accent}`}>
                  {b.badge}
                </span>
                <h3 className="text-2xl font-extrabold text-white mb-3">{b.title}</h3>
                <Link
                  href={b.href}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-white/20 backdrop-blur-sm hover:bg-white/30 px-4 py-2 rounded-xl transition-colors w-fit"
                >
                  Shop Now <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          ))}
        </section>
        {renderCollections('promo_banners', 'after')}

        {renderCollections('top_brands', 'before')}
        {/* Brands */}
        <section className="py-10">
          <SectionHeader
            title="Top Brands"
            subtitle="Shop from the world's most trusted names"
            href="/brands"
          />
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {homeLoading ? Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-28 animate-pulse rounded-2xl bg-muted" />
            )) : topBrands.map((brand) => (
              <Link
                key={brand.id}
                href={`/brands/${brand.slug}`}
                className="flex flex-col items-center justify-center gap-2 p-4 bg-card border border-border rounded-2xl hover:shadow-md hover:border-primary/30 transition-all group"
              >
                <div className="w-10 h-10 relative">
                  <Image
                    src={brand.logo}
                    alt={brand.name}
                    fill
                    unoptimized
                    className="object-contain grayscale group-hover:grayscale-0 transition-all"
                  />
                </div>
                <span className="text-xs font-semibold text-center truncate w-full text-center">
                  {brand.name}
                </span>
              </Link>
            ))}
          </div>
          {!homeLoading && topBrands.length === 0 && (
            <div className="mt-4 rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              No brands available right now.
            </div>
          )}
        </section>
        {renderCollections('top_brands', 'after')}

        {renderCollections('products', 'before')}
        {/* Products */}
        <section className="py-10">
          <SectionHeader
            title="Products"
            subtitle="Browse more curated products from our catalog"
            href="/shop"
          />
          {homeLoading ? (
            <ProductGridSkeleton count={8} />
          ) : homeProducts.length > 0 ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {homeProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
              <div className="mt-6 flex justify-end">
                <Link
                  href="/shop"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                >
                  View All Products <ArrowRight size={14} />
                </Link>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              No products available right now.
            </div>
          )}
        </section>
        {renderCollections('products', 'after')}

        {renderCollections('reviews', 'before')}
        {/* Reviews */}
        <section className="py-10">
          <SectionHeader
            title="What Our Customers Say"
            subtitle="Trusted by over 100,000 happy shoppers worldwide"
            href="/reviews"
            linkLabel="All reviews"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {HOMEPAGE_REVIEWS.map((r) => (
              <div
                key={r.id}
                className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-4"
              >
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={13}
                      className={i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-muted'}
                    />
                  ))}
                </div>
                <div>
                  <p className="font-semibold text-sm mb-1">{r.title}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                    &ldquo;{r.comment}&rdquo;
                  </p>
                </div>
                <div className="flex items-center gap-3 pt-2 border-t border-border mt-auto">
                  <Image
                    src={r.user.avatar}
                    alt={r.user.name}
                    width={36}
                    height={36}
                    className="rounded-full"
                  />
                  <div>
                    <p className="text-sm font-semibold">{r.user.name}</p>
                    <p className="text-xs text-muted-foreground">{r.user.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
        {renderCollections('reviews', 'after')}

        {renderCollections('blog', 'before')}
        {/* Blog */}
        <section className="py-10">
          <SectionHeader
            title="From Our Blog"
            subtitle="Style guides, reviews, and inspiration"
            href="/blog"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {MOCK_BLOG_POSTS.slice(0, 3).map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group bg-card border border-border rounded-2xl overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="relative aspect-video overflow-hidden">
                  <Image
                    src={post.coverImage}
                    alt={post.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-5">
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                    {post.category}
                  </span>
                  <h3 className="font-bold mt-2 mb-1 line-clamp-2 group-hover:text-primary transition-colors text-sm leading-snug">
                    {post.title}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{post.excerpt}</p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                    <span className="text-xs text-muted-foreground">{post.readTime} min read</span>
                    <span className="text-xs font-semibold text-primary group-hover:underline">
                      Read more →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
        {renderCollections('blog', 'after')}

        {renderCollections('newsletter', 'before')}
        {/* App Download */}
        <section className="py-10">
          <div className="bg-gradient-to-br from-primary to-primary/80 rounded-3xl px-8 py-12 md:px-16 grid md:grid-cols-2 gap-8 items-center">
            <div>
              <span className="text-xs font-bold text-primary-foreground/60 uppercase tracking-widest">
                Mobile App
              </span>
              <h2 className="text-3xl font-extrabold text-primary-foreground mt-2 mb-4">
                Shop Smarter,
                <br />
                Anytime, Anywhere
              </h2>
              <p className="text-primary-foreground/80 mb-6 leading-relaxed">
                Get exclusive app-only deals, track orders in real-time, and enjoy a seamless
                experience on your phone.
              </p>
              <div className="flex flex-wrap gap-3">
                {['App Store', 'Google Play'].map((store) => (
                  <button
                    key={store}
                    className="flex items-center gap-2 bg-black text-white px-5 py-3 rounded-xl hover:bg-black/80 transition-colors text-sm font-medium"
                  >
                    {store}
                  </button>
                ))}
              </div>
            </div>
            <div className="hidden md:flex justify-end">
              <div className="w-56 h-56 bg-primary-foreground/10 rounded-3xl flex items-center justify-center">
                <ShoppingBag size={72} className="text-primary-foreground/30" />
              </div>
            </div>
          </div>
        </section>
        {renderCollections('newsletter', 'after')}
      </main>
      {homeError && (
        <div className="sr-only" role="status">
          Product and brand sections could not be loaded.
        </div>
      )}
      <Footer />
    </div>
  );
}
