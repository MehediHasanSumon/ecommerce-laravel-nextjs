'use client';
import { useState } from 'react';
import { X, Megaphone } from 'lucide-react';
import { selectHomePageSettings, selectSettingsPending, useSettingsStore } from '@/store/settings-store';

export function AnnouncementBar() {
  const [isVisible, setIsVisible] = useState(true);
  const settingsPending = useSettingsStore(selectSettingsPending);
  const homeSettings = useSettingsStore(selectHomePageSettings);
  const announcement = homeSettings.announcement_bar;

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

  if (!announcement.enabled || !announcement.text.trim()) {
    return null;
  }

  const linkText = announcement.link_text.trim();
  const linkUrl = announcement.link_url.trim();

  return (
    <div className="relative bg-primary px-4 py-2 pr-9 text-primary-foreground">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-xs font-medium sm:text-sm">
        <Megaphone size={14} className="shrink-0" />
        <span className="min-w-0">{announcement.text}</span>
        {linkText && linkUrl ? (
          <a
            href={linkUrl}
            className="whitespace-nowrap font-semibold underline underline-offset-2 hover:no-underline sm:ml-1"
          >
            {linkText} →
          </a>
        ) : null}
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

