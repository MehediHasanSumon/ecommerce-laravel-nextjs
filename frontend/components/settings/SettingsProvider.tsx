"use client";

import { useEffect } from "react";
import {
  hydrateRuntimeSettings,
  selectSettingsPending,
  useSettingsStore,
} from "@/store/settings-store";
import type { RuntimeSettings } from "@/types/settings";

export function SettingsProvider({
  children,
  initialSettings = null,
}: {
  children: React.ReactNode;
  initialSettings?: RuntimeSettings | null;
}) {
  const fetchSettings = useSettingsStore((state) => state.fetchSettings);
  const settingsPending = useSettingsStore(selectSettingsPending);

  useEffect(() => {
    if (initialSettings) {
      hydrateRuntimeSettings(initialSettings);
      return;
    }

    void fetchSettings();
  }, [fetchSettings, initialSettings]);

  if (settingsPending && !initialSettings) {
    return <GlobalSettingsSkeleton />;
  }

  return children;
}

function GlobalSettingsSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-muted/50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5">
          <div className="h-4 w-44 animate-pulse rounded bg-muted" />
          <div className="hidden items-center gap-4 md:flex">
            <span className="h-4 w-10 animate-pulse rounded bg-muted" />
            <span className="h-4 w-8 animate-pulse rounded bg-muted" />
            <span className="h-4 w-12 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>
      <div className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
          <div className="flex w-36 items-center gap-2 md:w-48">
            <span className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
            <span className="h-5 w-24 animate-pulse rounded bg-muted" />
          </div>
          <div className="ml-4 hidden items-center gap-2 lg:flex">
            <span className="h-9 w-16 animate-pulse rounded-lg bg-muted" />
            <span className="h-9 w-20 animate-pulse rounded-lg bg-muted" />
            <span className="h-9 w-24 animate-pulse rounded-lg bg-muted" />
          </div>
          <span className="mx-4 hidden h-11 max-w-lg flex-1 animate-pulse rounded-xl bg-muted md:block" />
          <div className="ml-auto flex items-center gap-2">
            <span className="h-9 w-9 animate-pulse rounded-lg bg-muted" />
            <span className="h-9 w-9 animate-pulse rounded-lg bg-muted" />
            <span className="h-9 w-9 animate-pulse rounded-lg bg-muted" />
          </div>
        </div>
      </div>
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="h-[360px] animate-pulse rounded-2xl bg-muted md:h-[460px]" />
        <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="space-y-3 rounded-2xl border border-border p-3">
              <div className="aspect-square animate-pulse rounded-xl bg-muted" />
              <div className="h-4 animate-pulse rounded bg-muted" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
