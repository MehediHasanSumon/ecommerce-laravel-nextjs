'use client';
import Link from 'next/link';
import Image from 'next/image';
import { createElement, useMemo, useState, useEffect } from 'react';
import {
  ArrowRight,
  Star,
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
import { fetchHomePageSections, fetchPublicReviews, type HomePageSections, type PublicReview } from '@/services/catalog-service';
import { fetchHomeBlogs, type BlogCard } from '@/services/blog-service';
import type { HeroDevice, HeroSectionPayload, HeroSlide, HeroSlideElement } from '@/features/admin/hero-section/types';
import {
  selectCategoryDisplaySettings,
  selectFeatureCardSettings,
  selectHomeFeatureCards,
  selectRuntimeCategories,
  selectSettingsPending,
  selectShowHomeBrandSection,
  useSettingsStore,
} from '@/store/settings-store';

function HeroSlider({
  hero,
  loading,
}: {
  hero?: HeroSectionPayload;
  loading: boolean;
}) {
  const [current, setCurrent] = useState(0);
  const [mounted, setMounted] = useState(false);
  const slides = useMemo(() => hero?.slides?.filter((slide) => slide.status) ?? [], [hero?.slides]);
  const settings = hero?.settings;
  const simpleMode = settings?.mode !== 'advanced';
  const activeSlides = settings?.enabled === false ? [] : slides;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!settings?.slider_autoplay || activeSlides.length <= 1) return;
    const timer = setInterval(() => setCurrent((c) => nextIndex(c, activeSlides.length, settings.infinite_loop)), settings.autoplay_delay);
    return () => clearInterval(timer);
  }, [activeSlides.length, settings?.autoplay_delay, settings?.infinite_loop, settings?.slider_autoplay]);

  useEffect(() => {
    setCurrent(0);
  }, [activeSlides.length]);

  if (loading) {
    return <div className="h-[480px] animate-pulse rounded-2xl bg-muted md:h-[560px] lg:h-[620px]" />;
  }

  if (activeSlides.length === 0) {
    return null;
  }

  if (!simpleMode && activeSlides.length > 0) {
    return (
      <AdvancedHeroSlider
        slides={activeSlides}
        current={current}
        settings={settings}
        mounted={mounted}
        onPrevious={() => setCurrent((c) => previousIndex(c, activeSlides.length, settings?.infinite_loop ?? true))}
        onNext={() => setCurrent((c) => nextIndex(c, activeSlides.length, settings?.infinite_loop ?? true))}
        onSelect={setCurrent}
      />
    );
  }

  if (activeSlides.length > 0) {
    const slide = activeSlides[current] ?? activeSlides[0];
    const image = slide.mobile_image || slide.background_image;
    const alignClass = slide.text_alignment === 'center' ? 'mx-auto text-center' : slide.text_alignment === 'right' ? 'ml-auto text-right' : '';
    return (
      <div className="relative h-[480px] md:h-[560px] lg:h-[620px] rounded-2xl overflow-hidden">
        {image ? <Image src={image} alt={slide.title || slide.name || 'Hero slide'} fill unoptimized className="object-cover" priority={!settings?.lazy_load_images} /> : null}
        {slide.overlay ? <div className="absolute inset-0 bg-gradient-to-r from-slate-950 to-slate-800" style={{ opacity: slide.overlay_opacity / 100 }} /> : null}
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-7xl mx-auto px-8 md:px-12 w-full">
            <div className={`max-w-xl ${alignClass}`}>
              {slide.subtitle ? (
                <span className="text-sm font-bold uppercase tracking-widest mb-4 block text-primary">
                  {slide.subtitle}
                </span>
              ) : null}
              {slide.title ? (
                <h1 suppressHydrationWarning className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-5 whitespace-pre-line">
                  {slide.title}
                </h1>
              ) : null}
              {slide.description ? <p className="text-base md:text-lg text-white/80 mb-8 max-w-sm leading-relaxed">{slide.description}</p> : null}
              <div className={`flex flex-wrap gap-3 ${slide.text_alignment === 'center' ? 'justify-center' : slide.text_alignment === 'right' ? 'justify-end' : ''}`}>
                {slide.primary_button_text ? (
                  <Link href={slide.primary_button_url || '/shop'} className="inline-flex items-center gap-2 px-6 py-3 bg-white text-slate-900 rounded-xl font-bold text-sm hover:bg-white/90 transition-colors shadow-lg">
                    {slide.primary_button_text} <ArrowRight size={15} />
                  </Link>
                ) : null}
                {slide.secondary_button_text ? (
                  <Link href={slide.secondary_button_url || '/shop'} className="inline-flex items-center gap-2 px-6 py-3 bg-white/15 text-white rounded-xl font-bold text-sm hover:bg-white/25 transition-colors">
                    {slide.secondary_button_text}
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        <HeroControls
          count={activeSlides.length}
          current={current}
          showNavigation={settings?.show_navigation ?? true}
          showPagination={settings?.show_pagination ?? true}
          onPrevious={() => setCurrent((c) => previousIndex(c, activeSlides.length, settings?.infinite_loop ?? true))}
          onNext={() => setCurrent((c) => nextIndex(c, activeSlides.length, settings?.infinite_loop ?? true))}
          onSelect={setCurrent}
        />
        {!mounted && <div className="absolute inset-0 bg-slate-900 animate-pulse" />}
      </div>
    );
  }

  return null;
}

function previousIndex(current: number, length: number, loop: boolean) {
  if (length <= 1) return 0;
  if (current <= 0) return loop ? length - 1 : 0;
  return current - 1;
}

function nextIndex(current: number, length: number, loop: boolean) {
  if (length <= 1) return 0;
  if (current >= length - 1) return loop ? 0 : length - 1;
  return current + 1;
}

function HeroControls({
  count,
  current,
  showNavigation,
  showPagination,
  onPrevious,
  onNext,
  onSelect,
  ids,
}: {
  count: number;
  current: number;
  showNavigation: boolean;
  showPagination: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSelect: (index: number) => void;
  ids?: string[];
}) {
  if (count <= 1) return null;
  return (
    <>
      {showNavigation ? (
        <>
          <button onClick={onPrevious} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-colors" aria-label="Previous hero slide">
            <ChevronLeft size={20} />
          </button>
          <button onClick={onNext} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-colors" aria-label="Next hero slide">
            <ChevronRight size={20} />
          </button>
        </>
      ) : null}
      {showPagination ? (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
          {Array.from({ length: count }).map((_, i) => (
            <button key={ids?.[i] ?? i} onClick={() => onSelect(i)} className={`h-1.5 rounded-full transition-all duration-300 ${i === current ? 'w-8 bg-white' : 'w-1.5 bg-white/40'}`} aria-label={`Go to hero slide ${i + 1}`} />
          ))}
        </div>
      ) : null}
    </>
  );
}

function AdvancedHeroSlider({
  slides,
  current,
  settings,
  mounted,
  onPrevious,
  onNext,
  onSelect,
}: {
  slides: HeroSlide[];
  current: number;
  settings?: HeroSectionPayload['settings'];
  mounted: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSelect: (index: number) => void;
}) {
  const slide = slides[current] ?? slides[0];
  const device = useHeroDevice();
  return (
    <div className="relative h-[480px] md:h-[560px] lg:h-[620px] rounded-2xl overflow-hidden">
      <AdvancedSlide slide={slide} device={device} />
      <HeroControls
        count={slides.length}
        current={current}
        showNavigation={settings?.show_navigation ?? true}
        showPagination={settings?.show_pagination ?? true}
        onPrevious={onPrevious}
        onNext={onNext}
        onSelect={onSelect}
        ids={slides.map((item) => String(item.id))}
      />
      {!mounted && <div className="absolute inset-0 bg-slate-900 animate-pulse" />}
    </div>
  );
}

function useHeroDevice(): HeroDevice {
  const [device, setDevice] = useState<HeroDevice>('desktop');

  useEffect(() => {
    const update = () => {
      setDevice(window.innerWidth < 640 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop');
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return device;
}

function AdvancedSlide({ slide, device }: { slide: HeroSlide; device: HeroDevice }) {
  const size = slide.canvas_size?.[device] ?? slide.canvas_size?.desktop ?? { width: 1280, height: 620 };
  return (
    <div
      className="absolute inset-0"
      style={{
        backgroundColor: slide.background_color || '#0f172a',
        backgroundImage: slide.background_image ? `url(${slide.background_image})` : slide.background_gradient || undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {slide.background_overlay ? <div className="absolute inset-0 bg-black" style={{ opacity: slide.canvas_overlay_opacity / 100 }} /> : null}
      {slide.elements
        .filter((element) => !element.hidden)
        .sort((a, b) => a.z_index - b.z_index)
        .map((element) => <AdvancedElement key={`${element.id}-${element.z_index}`} element={element} device={device} size={size} />)}
    </div>
  );
}

function AdvancedElement({ element, device, size }: { element: HeroSlideElement; device: HeroDevice; size: { width: number; height: number } }) {
  const box = element.responsive?.[device] ?? element.responsive?.desktop;
  if (!box) return null;
  const style = element.style ?? {};
  const frame = {
    left: `${(box.x / size.width) * 100}%`,
    top: `${(box.y / size.height) * 100}%`,
    width: `${(box.width / size.width) * 100}%`,
    height: `${(box.height / size.height) * 100}%`,
    zIndex: element.z_index,
    opacity: Number(style.opacity ?? 1),
    transform: `rotate(${box.rotation ?? 0}deg)`,
  };

  if (element.type === 'image') {
    return element.content.src ? (
      <div className="absolute" style={frame}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={element.content.src} alt={element.content.alt ?? ''} loading="lazy" className="h-full w-full object-cover" style={{ borderRadius: style.borderRadius as number, boxShadow: String(style.boxShadow ?? '') }} />
      </div>
    ) : null;
  }

  if (element.type === 'button') {
    return (
      <Link href={element.content.url || '/shop'} target={element.content.target || '_self'} className="absolute flex items-center justify-center font-bold transition-colors" style={{ ...frame, background: String(style.backgroundColor ?? '#fff'), color: String(style.textColor ?? '#111'), borderRadius: style.borderRadius as number, padding: String(style.padding ?? '12px 22px'), border: String(style.border ?? '0 solid transparent'), boxShadow: String(style.boxShadow ?? '') }}>
        {element.content.text}
      </Link>
    );
  }

  if (element.type === 'shape') {
    return <div className="absolute" style={{ ...frame, background: String(style.backgroundColor ?? '#fff'), borderRadius: style.borderRadius as number, border: String(style.border ?? '0 solid transparent'), boxShadow: String(style.boxShadow ?? '') }} />;
  }

  return (
    <div
      className="absolute overflow-hidden"
      style={{
        ...frame,
        color: String(style.color ?? '#fff'),
        fontFamily: String(style.fontFamily ?? 'Inter, sans-serif'),
        fontSize: `clamp(14px, ${(Number(style.fontSize ?? 16) / size.width) * 100}vw, ${Number(style.fontSize ?? 16)}px)`,
        fontWeight: Number(style.fontWeight ?? 600),
        lineHeight: Number(style.lineHeight ?? 1.2),
        letterSpacing: Number(style.letterSpacing ?? 0),
        textAlign: style.textAlign as 'left' | 'center' | 'right',
      }}
    >
      {element.content.text}
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

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'CU';
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
  const [homeBlogs, setHomeBlogs] = useState<BlogCard[]>([]);
  const [homeBlogsEnabled, setHomeBlogsEnabled] = useState(false);
  const [homeBlogsLoading, setHomeBlogsLoading] = useState(true);
  const [homeReviews, setHomeReviews] = useState<PublicReview[]>([]);
  const [homeReviewsLoading, setHomeReviewsLoading] = useState(true);
  const homeCollections = homeData?.collections ?? [];
  const categoryDisplay = useSettingsStore(selectCategoryDisplaySettings);
  const runtimeCategories = useSettingsStore(selectRuntimeCategories);
  const settingsLoading = useSettingsStore(selectSettingsPending);
  const showHomeBrands = useSettingsStore(selectShowHomeBrandSection);
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
    setHomeBlogsLoading(true);
    fetchHomeBlogs({ signal: controller.signal })
      .then((response) => {
        setHomeBlogs(response.blogs);
        setHomeBlogsEnabled(response.settings.enabled && response.settings.show_on_home);
      })
      .catch(() => {
        setHomeBlogs([]);
        setHomeBlogsEnabled(false);
      })
      .finally(() => {
        if (!controller.signal.aborted) setHomeBlogsLoading(false);
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setHomeReviewsLoading(true);

    fetchPublicReviews({ per_page: 3 }, { signal: controller.signal })
      .then((response) => setHomeReviews(response.items))
      .catch((error: unknown) => {
        if ((error as { name?: string })?.name === 'CanceledError') return;
        setHomeReviews([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setHomeReviewsLoading(false);
      });

    return () => controller.abort();
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

  const topBrands = showHomeBrands && homeData?.sections.topBrands.enabled ? homeData.sections.topBrands.items : [];
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
          <HeroSlider hero={homeData?.hero} loading={homeLoading} />
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
        {renderCollections('promo_banners', 'after')}

        {renderCollections('top_brands', 'before')}
        {showHomeBrands ? (
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
        ) : null}
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
          {homeReviewsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6" aria-hidden="true">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-56 animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          ) : homeReviews.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              No customer reviews available right now.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {homeReviews.map((review) => (
                <div
                  key={review.id}
                  className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-4"
                >
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={13}
                        className={i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-muted'}
                      />
                    ))}
                  </div>
                  <div>
                    {review.product ? (
                      <Link href={`/products/${review.product.slug}`} className="font-semibold text-sm mb-1 line-clamp-1 hover:text-primary">
                        {review.product.name}
                      </Link>
                    ) : null}
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                      &ldquo;{review.comment}&rdquo;
                    </p>
                  </div>
                  <div className="flex items-center gap-3 pt-2 border-t border-border mt-auto">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {initials(review.user.name)}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{review.user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {review.verified ? 'Verified purchase' : 'Customer review'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        {renderCollections('reviews', 'after')}

        {renderCollections('blog', 'before')}
        {homeBlogsEnabled || homeBlogsLoading ? (
          <section className="py-10">
            <SectionHeader
              title="From Our Blog"
              subtitle="Style guides, reviews, and inspiration"
              href="/blogs"
            />
            {homeBlogsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="h-72 animate-pulse rounded-2xl bg-muted" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {homeBlogs.map((post) => (
                  <Link
                    key={post.id}
                    href={`/blogs/${post.slug}`}
                    className="group bg-card border border-border rounded-2xl overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="relative aspect-video overflow-hidden">
                      <Image
                        src={post.featured_image}
                        alt={post.title}
                        fill
                        unoptimized
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-5">
                      <h3 className="font-bold mb-1 line-clamp-2 group-hover:text-primary transition-colors text-sm leading-snug">
                        {post.title}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">{post.excerpt}</p>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                        <span className="text-xs text-muted-foreground">{post.reading_time_minutes} min read</span>
                        <span className="text-xs font-semibold text-primary group-hover:underline">
                          Read more →
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        ) : null}
        {renderCollections('blog', 'after')}

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
