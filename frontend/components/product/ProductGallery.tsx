'use client';

import Image from 'next/image';
import { createPortal } from 'react-dom';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Minus, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ProductGalleryProps = {
  images: string[];
  fallbackImage: string;
  productName: string;
  selectedIndex: number;
  onSelectedIndexChange: (index: number) => void;
  badge?: React.ReactNode;
};

const MAX_THUMBNAILS = 4;

export function ProductGallery({
  images,
  fallbackImage,
  productName,
  selectedIndex,
  onSelectedIndexChange,
  badge,
}: ProductGalleryProps) {
  const galleryImages = useMemo(
    () => images.length ? images : [fallbackImage],
    [fallbackImage, images]
  );
  const visibleImages = galleryImages.slice(0, MAX_THUMBNAILS);
  const remainingCount = Math.max(0, galleryImages.length - MAX_THUMBNAILS);
  const [isOpen, setIsOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const select = useCallback((index: number) => {
    const normalized = (index + galleryImages.length) % galleryImages.length;
    onSelectedIndexChange(normalized);
    setZoom(1);
  }, [galleryImages.length, onSelectedIndexChange]);

  const open = useCallback((index: number) => {
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    select(index);
    setIsOpen(true);
  }, [select]);

  const close = useCallback(() => {
    setIsOpen(false);
    setZoom(1);
    window.setTimeout(() => previouslyFocusedRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
      if (event.key === 'ArrowLeft') select(selectedIndex - 1);
      if (event.key === 'ArrowRight') select(selectedIndex + 1);
      if (event.key === '+') setZoom((value) => Math.min(3, value + 0.5));
      if (event.key === '-') setZoom((value) => Math.max(1, value - 0.5));
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [close, isOpen, select, selectedIndex]);

  useEffect(() => {
    if (!galleryImages.length) return;

    const adjacent = [
      galleryImages[(selectedIndex - 1 + galleryImages.length) % galleryImages.length],
      galleryImages[(selectedIndex + 1) % galleryImages.length],
    ];
    adjacent.forEach((src) => {
      const image = new window.Image();
      image.src = src;
    });
  }, [galleryImages, selectedIndex]);

  const lightbox = isOpen ? (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95"
      role="dialog"
      aria-modal="true"
      aria-label={`${productName} image gallery`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      onTouchStart={(event) => {
        const touch = event.changedTouches[0];
        touchStartRef.current = { x: touch.clientX, y: touch.clientY };
      }}
      onTouchEnd={(event) => {
        const start = touchStartRef.current;
        const touch = event.changedTouches[0];
        touchStartRef.current = null;
        if (!start || zoom > 1) return;
        const deltaX = touch.clientX - start.x;
        const deltaY = touch.clientY - start.y;
        if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
          select(selectedIndex + (deltaX < 0 ? 1 : -1));
        }
      }}
    >
      <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-lg bg-black/60 px-3 py-1.5 text-sm font-semibold text-white">
        {selectedIndex + 1} / {galleryImages.length}
      </div>
      <button
        ref={closeButtonRef}
        type="button"
        onClick={close}
        className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80 focus-visible:ring-2 focus-visible:ring-white"
        aria-label="Close image gallery"
      >
        <X size={22} />
      </button>

      {galleryImages.length > 1 ? (
        <>
          <button
            type="button"
            onClick={() => select(selectedIndex - 1)}
            className="absolute left-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80 focus-visible:ring-2 focus-visible:ring-white sm:left-6"
            aria-label="Previous image"
          >
            <ChevronLeft size={25} />
          </button>
          <button
            type="button"
            onClick={() => select(selectedIndex + 1)}
            className="absolute right-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80 focus-visible:ring-2 focus-visible:ring-white sm:right-6"
            aria-label="Next image"
          >
            <ChevronRight size={25} />
          </button>
        </>
      ) : null}

      <div
        className="relative h-[82vh] w-[calc(100vw-5rem)] overflow-auto sm:w-[calc(100vw-9rem)]"
        onMouseDown={(event) => event.stopPropagation()}
        onDoubleClick={() => setZoom((value) => value > 1 ? 1 : 2)}
        onWheel={(event) => {
          if (!event.ctrlKey && zoom === 1 && event.deltaY > 0) return;
          event.preventDefault();
          setZoom((value) => Math.min(3, Math.max(1, value + (event.deltaY < 0 ? 0.25 : -0.25))));
        }}
      >
        <Image
          key={galleryImages[selectedIndex]}
          src={galleryImages[selectedIndex]}
          alt={`${productName} ${selectedIndex + 1}`}
          fill
          unoptimized
          sizes="100vw"
          className="object-contain transition-transform duration-200"
          style={{ transform: `scale(${zoom})` }}
          priority
        />
      </div>

      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-lg bg-black/60 p-1 text-white">
        <button
          type="button"
          onClick={() => setZoom((value) => Math.max(1, value - 0.5))}
          disabled={zoom <= 1}
          className="flex h-9 w-9 items-center justify-center rounded-md transition-colors hover:bg-white/15 disabled:opacity-40"
          aria-label="Zoom out"
        >
          <Minus size={18} />
        </button>
        <span className="w-12 text-center text-xs font-semibold" aria-live="polite">{Math.round(zoom * 100)}%</span>
        <button
          type="button"
          onClick={() => setZoom((value) => Math.min(3, value + 0.5))}
          disabled={zoom >= 3}
          className="flex h-9 w-9 items-center justify-center rounded-md transition-colors hover:bg-white/15 disabled:opacity-40"
          aria-label="Zoom in"
        >
          <Plus size={18} />
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div className="min-w-0 space-y-4">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
        <button
          type="button"
          onClick={() => open(selectedIndex)}
          className="absolute inset-0 z-[1] cursor-zoom-in"
          aria-label={`Open ${productName} image ${selectedIndex + 1} in fullscreen gallery`}
        />
        <Image
          src={galleryImages[selectedIndex] ?? fallbackImage}
          alt={productName}
          fill
          unoptimized
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
          priority
        />
        {badge}
        {galleryImages.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => select(selectedIndex - 1)}
              className="absolute left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 shadow-lg transition-colors hover:bg-background"
              aria-label="Previous image"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => select(selectedIndex + 1)}
              className="absolute right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 shadow-lg transition-colors hover:bg-background"
              aria-label="Next image"
            >
              <ChevronRight size={18} />
            </button>
          </>
        ) : null}
      </div>

      {galleryImages.length > 1 ? (
        <div className="grid grid-cols-4 gap-2 sm:gap-3" aria-label="Product images">
          {visibleImages.map((image, index) => {
            const hasOverlay = index === MAX_THUMBNAILS - 1 && remainingCount > 0;
            const isSelected = selectedIndex === index || (hasOverlay && selectedIndex >= index);
            return (
              <button
                key={`${image}-${index}`}
                type="button"
                onClick={() => hasOverlay ? open(index) : select(index)}
                className={cn(
                  'relative aspect-square overflow-hidden rounded-xl border-2 bg-muted transition-colors',
                  isSelected ? 'border-primary' : 'border-transparent hover:border-muted-foreground/30'
                )}
                aria-label={hasOverlay ? `View ${remainingCount} more images` : `Select image ${index + 1}`}
                aria-current={isSelected ? 'true' : undefined}
              >
                <Image
                  src={image}
                  alt={`${productName} ${index + 1}`}
                  fill
                  unoptimized
                  loading="lazy"
                  sizes="(min-width: 1024px) 12vw, 25vw"
                  className="object-cover"
                />
                {hasOverlay ? (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/65 px-2 text-center text-sm font-bold text-white">
                    +{remainingCount} More
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
      {typeof document !== 'undefined' && lightbox ? createPortal(lightbox, document.body) : null}
    </div>
  );
}
