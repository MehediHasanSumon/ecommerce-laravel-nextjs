'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ProductCard } from '@/components/product/ProductCard';
import { selectProductCardSettings, useSettingsStore } from '@/store/settings-store';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';

type ProductListingProps = {
  products: Product[];
  className?: string;
  cardClassName?: string;
  columns?: 2 | 3 | 4;
  onProductOpen?: (product: Product) => void;
};

export function ProductListing({ products, className, cardClassName, columns = 4, onProductOpen }: ProductListingProps) {
  const settings = useSettingsStore(selectProductCardSettings);
  const viewportRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const dragRef = useRef<{ pointerId: number; startX: number; startScroll: number } | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [paused, setPaused] = useState(false);

  const scrollTo = useCallback((target: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const start = viewport.scrollLeft;
    const distance = target - start;
    const duration = settings.slider.transition_speed;
    const startedAt = performance.now();

    const animate = (time: number) => {
      const progress = Math.min(1, (time - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      viewport.scrollLeft = start + distance * eased;
      if (progress < 1) animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [settings.slider.transition_speed]);

  const slideSize = useCallback(() => {
    const viewport = viewportRef.current;
    const firstSlide = viewport?.firstElementChild as HTMLElement | null;
    return firstSlide ? firstSlide.offsetWidth + settings.slider.space_between : viewport?.clientWidth ?? 0;
  }, [settings.slider.space_between]);

  const move = useCallback((direction: -1 | 1) => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const max = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    let target = viewport.scrollLeft + direction * slideSize();
    if (settings.slider.loop && target > max - 1) target = 0;
    if (settings.slider.loop && target < 0) target = max;
    scrollTo(Math.max(0, Math.min(max, target)));
  }, [scrollTo, settings.slider.loop, slideSize]);

  useEffect(() => {
    if (settings.layout !== 'swipe' || !settings.slider.autoplay || paused || products.length < 2) {
      return;
    }

    const timer = window.setInterval(() => move(1), settings.slider.autoplay_delay);
    return () => window.clearInterval(timer);
  }, [move, paused, products.length, settings.layout, settings.slider.autoplay, settings.slider.autoplay_delay]);

  useEffect(() => () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
  }, []);

  if (settings.layout === 'list') {
    return (
      <div className={cn('grid grid-cols-1 gap-4 lg:grid-cols-2', className)}>
        {products.map((product) => (
          <ProductCard key={product.id} product={product} layout="list" className={cardClassName} onOpen={onProductOpen} />
        ))}
      </div>
    );
  }

  if (settings.layout === 'grid') {
    const gridColsClass = columns === 4
      ? 'grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4'
      : columns === 2
      ? 'grid-cols-1 min-[380px]:grid-cols-2'
      : 'grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3';

    return (
      <div className={cn('grid gap-3.5 sm:gap-5 xl:gap-6', gridColsClass, className)}>
        {products.map((product) => (
          <ProductCard key={product.id} product={product} className={cardClassName} onOpen={onProductOpen} />
        ))}
      </div>
    );
  }

  const sliderStyle = {
    '--product-slider-gap': `${settings.slider.space_between}px`,
    '--product-slider-mobile': settings.slider.mobile_slides,
    '--product-slider-tablet': settings.slider.tablet_slides,
    '--product-slider-desktop': settings.slider.desktop_slides,
  } as React.CSSProperties;

  return (
    <div
      className={cn('relative', className)}
      onMouseEnter={() => settings.slider.pause_on_hover && setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        ref={viewportRef}
        className={cn(
          'product-slider flex overflow-x-auto overscroll-x-contain pb-2',
          settings.slider.center_mode ? 'snap-x snap-mandatory' : 'snap-x snap-proximity',
          !settings.slider.touch_swipe && 'touch-pan-y',
          settings.slider.mouse_drag && 'cursor-grab active:cursor-grabbing',
        )}
        style={sliderStyle}
        tabIndex={0}
        role="region"
        aria-label="Products carousel"
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') move(-1);
          if (event.key === 'ArrowRight') move(1);
        }}
        onScroll={(event) => {
          const size = slideSize();
          if (size > 0) setActiveSlide(Math.round(event.currentTarget.scrollLeft / size));
        }}
        onPointerDown={(event) => {
          const dragEnabled = event.pointerType === 'touch'
            ? settings.slider.touch_swipe
            : settings.slider.mouse_drag;
          if (!dragEnabled) return;
          dragRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startScroll: event.currentTarget.scrollLeft,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag || drag.pointerId !== event.pointerId) return;
          event.currentTarget.scrollLeft = drag.startScroll - (event.clientX - drag.startX);
        }}
        onPointerUp={(event) => {
          if (dragRef.current?.pointerId === event.pointerId) {
            dragRef.current = null;
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
        onPointerCancel={() => {
          dragRef.current = null;
        }}
      >
        {products.map((product) => (
          <div
            key={product.id}
            className={cn('product-slider-slide min-w-0 shrink-0', settings.slider.center_mode ? 'snap-center' : 'snap-start')}
          >
            <ProductCard product={product} className={cn('h-full', cardClassName)} onOpen={onProductOpen} />
          </div>
        ))}
      </div>

      {settings.slider.navigation && products.length > 1 ? (
        <>
          <button
            type="button"
            onClick={() => move(-1)}
            className="absolute left-2 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/95 shadow-md transition-colors hover:bg-muted sm:flex"
            aria-label="Previous products"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            className="absolute right-2 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/95 shadow-md transition-colors hover:bg-muted sm:flex"
            aria-label="Next products"
          >
            <ChevronRight size={18} />
          </button>
        </>
      ) : null}

      {settings.slider.pagination && products.length > 1 ? (
        <div className="mt-3 flex justify-center gap-1.5" aria-label="Product carousel pagination">
          {products.map((product, index) => (
            <button
              key={product.id}
              type="button"
              onClick={() => scrollTo(index * slideSize())}
              aria-label={`Go to product ${index + 1}`}
              aria-current={activeSlide === index}
              className={cn('h-2 w-2 rounded-full bg-muted-foreground/30 transition-colors', activeSlide === index && 'bg-primary')}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
