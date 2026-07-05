'use client';
import { useState } from 'react';
import { X, Truck, Tag, Sparkles } from 'lucide-react';
import { selectCurrencyFingerprint, selectSettingsPending, useSettingsStore } from '@/store/settings-store';
import { formatPrice } from '@/utils/format';

const ANNOUNCEMENTS = [
  { icon: Truck, text: () => `Free shipping on orders over ${formatPrice(75)}! Limited time offer.` },
  { icon: Tag, text: () => 'Use code LUXE20 for 20% off your first order!' },
  { icon: Sparkles, text: () => 'New arrivals just dropped — Shop the latest collection.' },
];

export function AnnouncementBar() {
  const [isVisible, setIsVisible] = useState(true);
  const [currentIndex] = useState(0);
  const settingsPending = useSettingsStore(selectSettingsPending);
  useSettingsStore(selectCurrencyFingerprint);

  if (!isVisible) return null;

  if (settingsPending) {
    return (
      <div className="bg-primary px-4 py-2">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2">
          <span className="h-4 w-64 animate-pulse rounded bg-primary-foreground/20" />
        </div>
      </div>
    );
  }

  const announcement = ANNOUNCEMENTS[currentIndex];
  const Icon = announcement.icon;

  return (
    <div className="bg-primary text-primary-foreground py-2 px-4 relative">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-sm font-medium">
        <Icon size={14} className="shrink-0" />
        <span>{announcement.text()}</span>
        <a
          href="/shop"
          className="underline underline-offset-2 hover:no-underline ml-1 font-semibold"
        >
          Shop Now →
        </a>
      </div>
      <button
        onClick={() => setIsVisible(false)}
        className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70 transition-opacity"
        aria-label="Close announcement"
      >
        <X size={14} />
      </button>
    </div>
  );
}

