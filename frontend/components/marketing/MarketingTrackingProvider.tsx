"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { marketingTracker } from "@/lib/marketing-tracker";
import {
  getMarketingConsent,
  onMarketingConsentChange,
  setMarketingConsent,
} from "@/lib/marketing-consent";
import { useSettingsStore } from "@/store/settings-store";

export function MarketingTrackingProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const config = useSettingsStore((state) => state.settings?.marketing_tracking);
  const previousPage = useRef("");

  useEffect(() => {
    if (!config) return;
    marketingTracker.configure(config);
    window.ecommerceConsent = {
      get: getMarketingConsent,
      set: setMarketingConsent,
    };
    return onMarketingConsentChange(() => marketingTracker.configure(config));
  }, [config]);

  useEffect(() => {
    if (!config) return;
    if (pathname.startsWith("/admin")) return;
    const automaticTrackingEnabled = config.google.enabled
      || (config.meta.enabled && config.meta.automatic_event_tracking);
    if (!automaticTrackingEnabled) return;
    const query = searchParams.toString();
    const page = `${pathname}${query ? `?${query}` : ""}`;
    if (previousPage.current === page) return;
    previousPage.current = page;
    marketingTracker.track("page_view");
    const slug = pathname.split("/").filter(Boolean).at(-1);
    if (pathname.startsWith("/categories/")) {
      marketingTracker.track("view_category", { content_name: slug, content_category: "category" });
    } else if (pathname.startsWith("/brands/")) {
      marketingTracker.track("view_brand", { content_name: slug, content_category: "brand" });
    } else if (pathname.startsWith("/collections/")) {
      marketingTracker.track("view_collection", { content_name: slug, content_category: "collection" });
    } else if (pathname === "/search") {
      marketingTracker.track("search", { search_term: searchParams.get("q") ?? "" });
    } else if (pathname === "/cart") {
      marketingTracker.track("view_cart");
    }
  }, [config, pathname, searchParams]);

  return null;
}
