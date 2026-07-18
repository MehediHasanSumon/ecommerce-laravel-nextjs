'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useMemo, useRef, useState, useEffect } from 'react';
import type { TouchEvent } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  CreditCard,
  HeadphonesIcon,
  PackageCheck,
  RotateCcw,
  Shield,
  Star,
  Truck,
  Zap,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CategoryIcon } from '@/components/category/CategoryIcon';
import { ProductListing } from '@/components/product/ProductListing';
import { ProductGridSkeleton } from '@/components/skeleton';
import { useCountdown } from '@/hooks/useCountdown';
import { fetchHomePageSections, type HomePageSections } from '@/services/catalog-service';
import type { HeroDevice, HeroSectionPayload, HeroSlide, HeroSlideElement } from '@/features/admin/hero-section/types';
import { cn } from '@/utils/cn';
import {
  selectCategoryDisplaySettings,
  selectFeatureCardSettings,
  selectHomePageSettings,
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
  const [paused, setPaused] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const slides = useMemo(() => hero?.slides?.filter((slide) => slide.status) ?? [], [hero?.slides]);
  const settings = hero?.settings;
  const simpleMode = settings?.mode !== 'advanced';
  const activeSlides = settings?.enabled === false ? [] : slides;
  const loop = settings?.infinite_loop ?? true;
  const previous = () => setCurrent((c) => previousIndex(c, activeSlides.length, loop));
  const next = () => setCurrent((c) => nextIndex(c, activeSlides.length, loop));

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!settings?.slider_autoplay || paused || activeSlides.length <= 1) return;
    const timer = setInterval(() => setCurrent((c) => nextIndex(c, activeSlides.length, settings.infinite_loop)), settings.autoplay_delay);
    return () => clearInterval(timer);
  }, [activeSlides.length, paused, settings?.autoplay_delay, settings?.infinite_loop, settings?.slider_autoplay]);

  useEffect(() => {
    setCurrent(0);
  }, [activeSlides.length]);

  if (loading) {
    return <div className="h-[440px] animate-pulse rounded-2xl bg-muted sm:h-[480px] md:h-[560px] lg:h-[620px]" />;
  }

  if (activeSlides.length === 0) {
    return null;
  }

  const interactionProps = {
    onMouseEnter: () => {
      if (settings?.pause_on_hover) setPaused(true);
    },
    onMouseLeave: () => {
      if (settings?.pause_on_hover) setPaused(false);
    },
    onTouchStart: (event: TouchEvent) => {
      if (!settings?.swipe_support) return;
      const touch = event.touches[0];
      touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
    },
    onTouchEnd: (event: TouchEvent) => {
      if (!settings?.swipe_support || !touchStart.current || activeSlides.length <= 1) return;
      const touch = event.changedTouches[0];
      if (!touch) return;
      const dx = touch.clientX - touchStart.current.x;
      const dy = touch.clientY - touchStart.current.y;
      touchStart.current = null;
      if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
      if (dx > 0) previous();
      else next();
    },
  };

  if (!simpleMode && activeSlides.length > 0) {
    return (
      <div {...interactionProps}>
        <AdvancedHeroSlider
          slides={activeSlides}
          current={current}
          settings={settings}
          mounted={mounted}
          onPrevious={previous}
          onNext={next}
          onSelect={setCurrent}
        />
      </div>
    );
  }

  if (activeSlides.length > 0) {
    const slide = activeSlides[current] ?? activeSlides[0];
    const image = slide.mobile_image || slide.background_image;
    const alignClass = slide.text_alignment === 'center' ? 'mx-auto text-center' : slide.text_alignment === 'right' ? 'ml-auto text-right' : '';
    return (
      <div {...interactionProps} className="relative h-[440px] overflow-hidden rounded-2xl sm:h-[480px] md:h-[560px] lg:h-[620px]">
        {image ? <Image src={image} alt={slide.title || slide.name || 'Hero slide'} fill unoptimized className="object-cover" priority={!settings?.lazy_load_images} loading={settings?.lazy_load_images ? 'lazy' : undefined} /> : null}
        {slide.overlay ? <div className="absolute inset-0 bg-gradient-to-r from-slate-950 to-slate-800" style={{ opacity: slide.overlay_opacity / 100 }} /> : null}
        <div className="absolute inset-0 flex items-center">
          <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 md:px-12">
            <div className={`max-w-xl ${alignClass}`}>
              {slide.subtitle ? (
                <span className="text-sm font-bold uppercase tracking-widest mb-4 block text-primary">
                  {slide.subtitle}
                </span>
              ) : null}
              {slide.title ? (
                <h1 suppressHydrationWarning className="mb-4 whitespace-pre-line text-3xl font-extrabold leading-tight text-white sm:text-4xl md:mb-5 md:text-5xl lg:text-6xl">
                  {slide.title}
                </h1>
              ) : null}
              {slide.description ? <p className="mb-6 max-w-sm text-sm leading-relaxed text-white/80 sm:text-base md:mb-8 md:text-lg">{slide.description}</p> : null}
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
          onPrevious={previous}
          onNext={next}
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
          <button onClick={onPrevious} className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/40 sm:left-4 sm:h-10 sm:w-10" aria-label="Previous hero slide">
            <ChevronLeft size={20} />
          </button>
          <button onClick={onNext} className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/40 sm:right-4 sm:h-10 sm:w-10" aria-label="Next hero slide">
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
  const size = slide.canvas_size?.[device] ?? slide.canvas_size?.desktop ?? { width: 1280, height: 620 };
  const desktopSize = slide.canvas_size?.desktop ?? size;
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const scale = width > 0 ? width / size.width : 1;
  const visualScale = device === 'desktop'
    ? 1
    : Math.min(1, Math.max(device === 'mobile' ? 0.58 : 0.78, Math.sqrt(size.width / desktopSize.width)));

  return (
    <div
      ref={ref}
      className="relative overflow-hidden rounded-2xl"
      style={{ aspectRatio: `${size.width} / ${size.height}`, height: width > 0 ? size.height * scale : undefined }}
    >
      <AdvancedSlide
        slide={slide}
        device={device}
        size={size}
        desktopSize={desktopSize}
        scale={scale}
        visualScale={visualScale}
        lazyLoad={settings?.lazy_load_images ?? true}
      />
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

function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const update = () => setWidth(node.getBoundingClientRect().width);
    update();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      setWidth(entry?.contentRect.width ?? node.getBoundingClientRect().width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
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

function AdvancedSlide({
  slide,
  device,
  size,
  desktopSize,
  scale,
  visualScale,
  lazyLoad,
}: {
  slide: HeroSlide;
  device: HeroDevice;
  size: { width: number; height: number };
  desktopSize: { width: number; height: number };
  scale: number;
  visualScale: number;
  lazyLoad: boolean;
}) {
  return (
    <div
      className="absolute left-0 top-0 origin-top-left overflow-hidden"
      style={{
        width: size.width,
        height: size.height,
        transform: `scale(${scale})`,
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
        .map((element) => (
          <AdvancedElement
            key={`${element.id}-${element.z_index}`}
            element={element}
            device={device}
            canvasSize={size}
            desktopSize={desktopSize}
            visualScale={visualScale}
            lazyLoad={lazyLoad}
          />
        ))}
    </div>
  );
}

function AdvancedElement({
  element,
  device,
  canvasSize,
  desktopSize,
  visualScale,
  lazyLoad,
}: {
  element: HeroSlideElement;
  device: HeroDevice;
  canvasSize: { width: number; height: number };
  desktopSize: { width: number; height: number };
  visualScale: number;
  lazyLoad: boolean;
}) {
  const box = resolveHeroElementBox(element, device, canvasSize, desktopSize);
  if (!box) return null;
  const style = element.style ?? {};
  const baseFontSize = Number(style.fontSize ?? 16);
  const minimumFontSize = element.type === 'heading' ? 24 : element.type === 'subheading' ? 16 : 12;
  const fontSize = device === 'desktop' ? baseFontSize : Math.max(minimumFontSize, baseFontSize * visualScale);
  const frame = {
    left: box.x,
    top: box.y,
    width: box.width,
    height: box.height,
    zIndex: element.z_index,
    opacity: Number(style.opacity ?? 1),
    transform: `rotate(${box.rotation ?? 0}deg)`,
  };
  const wrap = (node: React.ReactNode) => wrapHeroElement(node, element.content.url, element.content.target);

  if (element.type === 'image') {
    return element.content.src ? (
      <div className="absolute" style={frame}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {wrap(<img src={element.content.src} alt={element.content.alt ?? ''} loading={lazyLoad ? 'lazy' : 'eager'} className="h-full w-full" style={{ objectFit: String(style.objectFit ?? 'cover') as React.CSSProperties['objectFit'], borderRadius: style.borderRadius as number, boxShadow: String(style.boxShadow ?? '') }} />)}
      </div>
    ) : null;
  }

  if (element.type === 'button') {
    const buttonStyle = {
      ...frame,
      '--hero-button-bg': String(style.backgroundColor ?? '#fff'),
      '--hero-button-color': String(style.textColor ?? '#111'),
      '--hero-button-border': String(style.border ?? '0 solid transparent'),
      '--hero-button-hover-bg': String(style.hoverBackgroundColor || style.backgroundColor || '#fff'),
      '--hero-button-hover-color': String(style.hoverTextColor || style.textColor || '#111'),
      '--hero-button-hover-border-color': String(style.hoverBorderColor || style.borderColor || 'transparent'),
      background: 'var(--hero-button-bg)',
      color: 'var(--hero-button-color)',
      border: 'var(--hero-button-border)',
      borderRadius: style.borderRadius as number,
      padding: String(style.padding ?? '12px 22px'),
      boxShadow: String(style.boxShadow ?? ''),
      fontSize: Math.max(12, fontSize),
    } as React.CSSProperties;

    return (
      <Link href={element.content.url || '/shop'} target={element.content.target || '_self'} className="absolute flex items-center justify-center font-bold transition-colors hover:bg-[var(--hero-button-hover-bg)] hover:text-[var(--hero-button-hover-color)] hover:border-[var(--hero-button-hover-border-color)]" style={buttonStyle}>
        {element.content.text}
      </Link>
    );
  }

  if (element.type === 'shape') {
    return (
      <div className="absolute" style={frame}>
        {wrap(
          <span
            className="block h-full w-full"
            style={{
              background: String(style.gradientFill || (style.backgroundColor ?? '#fff')),
              borderRadius: style.borderRadius as number,
              border: String(style.border ?? '0 solid transparent'),
              boxShadow: String(style.boxShadow ?? ''),
              clipPath: heroShapeClipPath(element.content.shape),
            }}
          />
        )}
      </div>
    );
  }

  return wrap(
    <div
      className="absolute overflow-hidden [overflow-wrap:anywhere]"
      style={{
        ...frame,
        color: String(style.color ?? '#fff'),
        fontFamily: String(style.fontFamily ?? 'Inter, sans-serif'),
        fontSize,
        fontWeight: Number(style.fontWeight ?? 600),
        lineHeight: Number(style.lineHeight ?? 1.2),
        letterSpacing: Number(style.letterSpacing ?? 0),
        textAlign: style.textAlign as 'left' | 'center' | 'right',
        textShadow: String(style.textShadow ?? ''),
      }}
    >
      {element.content.text}
    </div>
  );
}

function resolveHeroElementBox(
  element: HeroSlideElement,
  device: HeroDevice,
  canvasSize: { width: number; height: number },
  desktopSize: { width: number; height: number },
) {
  const directBox = element.responsive?.[device];
  const desktopBox = element.responsive?.desktop;
  if (!directBox && !desktopBox) return null;

  const source = directBox ?? {
    ...desktopBox,
    x: desktopBox.x * (canvasSize.width / desktopSize.width),
    y: desktopBox.y * (canvasSize.height / desktopSize.height),
    width: desktopBox.width * (canvasSize.width / desktopSize.width),
    height: desktopBox.height * (canvasSize.height / desktopSize.height),
  };
  const edge = device === 'mobile' ? 16 : device === 'tablet' ? 24 : 0;
  const width = Math.max(1, Math.min(source.width, canvasSize.width - edge * 2));
  const height = Math.max(1, Math.min(source.height, canvasSize.height - edge * 2));
  const x = Math.max(edge, Math.min(source.x, canvasSize.width - edge - width));
  const y = Math.max(edge, Math.min(source.y, canvasSize.height - edge - height));

  return { ...source, x, y, width, height };
}

function wrapHeroElement(node: React.ReactNode, href?: string, target?: string) {
  if (!href) return node;
  const external = /^https?:\/\//i.test(href);
  const className = "block h-full w-full";

  if (external) {
    return (
      <a href={href} target={target || '_self'} rel={target === '_blank' ? 'noopener noreferrer' : undefined} className={className}>
        {node}
      </a>
    );
  }

  return (
    <Link href={href} target={target || '_self'} className={className}>
      {node}
    </Link>
  );
}

function heroShapeClipPath(shape?: string) {
  switch (shape) {
    case 'circle':
    case 'oval':
      return 'ellipse(50% 50% at 50% 50%)';
    case 'triangle':
      return 'polygon(50% 0%, 0% 100%, 100% 100%)';
    case 'diamond':
      return 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';
    case 'pentagon':
      return 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)';
    case 'hexagon':
      return 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)';
    case 'octagon':
      return 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)';
    case 'star':
      return 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 92%, 50% 70%, 21% 92%, 32% 57%, 2% 35%, 39% 35%)';
    case 'arrow':
      return 'polygon(0% 35%, 60% 35%, 60% 15%, 100% 50%, 60% 85%, 60% 65%, 0% 65%)';
    case 'double-arrow':
      return 'polygon(0% 50%, 25% 15%, 25% 35%, 75% 35%, 75% 15%, 100% 50%, 75% 85%, 75% 65%, 25% 65%, 25% 85%)';
    case 'heart':
      return 'polygon(50% 90%, 8% 48%, 8% 22%, 28% 8%, 50% 28%, 72% 8%, 92% 22%, 92% 48%)';
    case 'lightning':
      return 'polygon(58% 0%, 18% 55%, 46% 55%, 35% 100%, 82% 38%, 54% 38%)';
    case 'plus':
      return 'polygon(35% 0%, 65% 0%, 65% 35%, 100% 35%, 100% 65%, 65% 65%, 65% 100%, 35% 100%, 35% 65%, 0% 65%, 0% 35%, 35% 35%)';
    case 'minus':
      return 'polygon(0% 35%, 100% 35%, 100% 65%, 0% 65%)';
    case 'cross':
      return 'polygon(20% 0%, 50% 30%, 80% 0%, 100% 20%, 70% 50%, 100% 80%, 80% 100%, 50% 70%, 20% 100%, 0% 80%, 30% 50%, 0% 20%)';
    default:
      return undefined;
  }
}

function FlashSaleTimer({ endsAt }: { endsAt: string }) {
  const { days, hours, minutes, seconds } = useCountdown(endsAt);
  const units = [
    ...(days > 0 ? [{ v: days, l: days === 1 ? 'day' : 'days', wide: true }] : []),
    { v: hours, l: 'h' },
    { v: minutes, l: 'm' },
    { v: seconds, l: 's' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
      {units.map(({ v, l, wide }) => (
        <div key={l} className="flex items-center gap-1">
          <span className={cn(
            'h-10 flex items-center justify-center bg-primary text-primary-foreground rounded-lg font-bold text-lg tabular-nums',
            wide ? 'min-w-14 px-2 text-base' : 'w-10',
          )}>
            {wide ? String(v) : String(v).padStart(2, '0')}
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
    <div className="mb-6 flex items-start justify-between gap-3 sm:mb-8 sm:gap-4">
      <div className="min-w-0">
        {Icon && (
          <div className="flex items-center gap-2 mb-1">
            <Icon size={16} className="text-primary" />
            <span className="text-xs font-bold text-primary uppercase tracking-wider">
              Featured
            </span>
          </div>
        )}
        <h2 className="text-xl font-extrabold sm:text-2xl">{title}</h2>
        {subtitle && <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>}
      </div>
      <Link
        href={href}
        className="mt-1 inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-semibold text-primary hover:underline sm:text-sm"
      >
        {linkLabel} <ArrowRight size={14} />
      </Link>
    </div>
  );
}

const featureCardIcons: Record<string, React.ComponentType<{ className?: string; size?: number; 'aria-hidden'?: boolean }>> = {
  BadgeCheck,
  CreditCard,
  HeadphonesIcon,
  PackageCheck,
  RotateCcw,
  Shield,
  Truck,
};

function FeatureCardIcon({
  name,
  ...props
}: {
  name: string;
  className?: string;
  size?: number;
  'aria-hidden'?: boolean;
}) {
  const Icon = featureCardIcons[name] ?? BadgeCheck;

  return <Icon {...props} />;
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
                <FeatureCardIcon name={card.icon} size={19} aria-hidden />
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
  const href = collection?.slug ? `/collections/${collection.slug}` : collection?.url ?? '/shop';

  if (!loading && (!collection || products.length === 0)) {
    return null;
  }

  if (isFlashSale) {
    return (
      <section className="py-10">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="p-2 bg-rose-500 rounded-xl">
              <Zap size={18} className="text-white fill-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-extrabold sm:text-2xl">{collection?.title ?? 'Flash Sale'}</h2>
              <p className="text-xs text-muted-foreground">
                {collection?.subtitle ?? 'Limited-time deals — grab them before they&apos;re gone'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="shrink-0 text-sm text-muted-foreground">Ends in:</span>
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
          <ProductListing products={products} />
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
        <ProductListing products={products} />
      ) : null}
    </section>
  );
}

export default function HomePage({ initialData = null }: { initialData?: HomePageSections | null }) {
  const [mounted, setMounted] = useState(false);
  const [homeData, setHomeData] = useState<HomePageSections | null>(initialData);
  const [homeLoading, setHomeLoading] = useState(!initialData);
  const [homeError, setHomeError] = useState(false);
  const homeCollections = homeData?.collections ?? [];
  const categoryDisplay = useSettingsStore(selectCategoryDisplaySettings);
  const runtimeCategories = useSettingsStore(selectRuntimeCategories);
  const settingsLoading = useSettingsStore(selectSettingsPending);
  const showHomeBrands = useSettingsStore(selectShowHomeBrandSection);
  const runtimeHomePageSettings = useSettingsStore(selectHomePageSettings);
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
    categoryDisplay.home_category_variant !== 'hidden' &&
    (settingsLoading || homeCategories.length > 0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const showHomeProducts = homeData?.sections.products.enabled ?? runtimeHomePageSettings.product_section.enabled;
  const showHomeTestimonials = homeData?.sections.testimonials.enabled ?? runtimeHomePageSettings.testimonial_section.enabled;

  useEffect(() => {
    if (initialData) return;

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
  }, [initialData]);

  const topBrands = showHomeBrands && homeData?.sections.topBrands.enabled ? homeData.sections.topBrands.items : [];
  const homeProducts = homeData?.sections.products.items ?? [];
  const homeBlogs = homeData?.sections.blogs.items ?? [];
  const homeBlogsEnabled = Boolean(homeData?.sections.blogs.settings.enabled && homeData.sections.blogs.settings.show_on_home);
  const homeBlogsLoading = homeLoading;
  const homeReviews = homeData?.sections.reviews.items ?? [];
  const homeReviewsLoading = homeLoading && showHomeTestimonials;
  const shouldShowTopBrands = showHomeBrands && (homeLoading || topBrands.length > 0);
  const shouldShowHomeProducts = showHomeProducts && (homeLoading || homeProducts.length > 0);
  const shouldShowHomeReviews = showHomeTestimonials && (homeReviewsLoading || homeReviews.length > 0);
  const shouldShowHomeBlogs = homeBlogsLoading || (homeBlogsEnabled && homeBlogs.length > 0);
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
      <main className="mx-auto w-full max-w-7xl px-3 pb-16 sm:px-4 lg:px-6">
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
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {homeCategories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/categories/${cat.slug}`}
                    className="group flex min-h-44 flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card p-5 text-center transition-colors hover:border-primary/50 hover:bg-muted/30"
                  >
                    <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-muted text-3xl font-bold text-primary ring-1 ring-border transition-colors group-hover:bg-background">
                      <CategoryIcon icon={cat.icon} name={cat.name} className="h-20 w-20" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold group-hover:text-primary">{cat.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{cat.product_count} items</p>
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
                          <CategoryIcon icon={cat.icon} name={cat.name} className="h-16 w-16" />
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
        {shouldShowTopBrands ? (
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
          </section>
        ) : null}
        {renderCollections('top_brands', 'after')}

        {renderCollections('products', 'before')}
        {/* Products */}
        {shouldShowHomeProducts ? (
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
              <ProductListing products={homeProducts} />
              <div className="mt-6 flex justify-end">
                <Link
                  href="/shop"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                >
                  View All Products <ArrowRight size={14} />
                </Link>
              </div>
            </>
          ) : null}
        </section>
        ) : null}
        {renderCollections('products', 'after')}

        {renderCollections('reviews', 'before')}
        {/* Reviews */}
        {shouldShowHomeReviews ? (
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
                    {review.user.avatar ? (
                      <Image
                        src={review.user.avatar}
                        alt={review.user.name}
                        width={36}
                        height={36}
                        unoptimized
                        className="h-9 w-9 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {initials(review.user.name)}
                      </span>
                    )}
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
        ) : null}
        {renderCollections('reviews', 'after')}

        {renderCollections('blog', 'before')}
        {shouldShowHomeBlogs ? (
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
