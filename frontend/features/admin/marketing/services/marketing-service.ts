"use client";

import { AdminApiService, cleanParams } from "@/features/admin/shared/api";
import type {
  GoogleAnalyticsSettings,
  MarketingAnalytics,
  MarketingConnectionResult,
  MarketingRuntimeStatus,
  MarketingTrackingEvent,
  MetaPixelSettings,
} from "@/features/admin/marketing/types";

class MarketingService extends AdminApiService {
  metaSettings() {
    return this.unwrap<{ settings: MetaPixelSettings }>(
      this.client.get("/admin/settings/meta-pixel"),
    );
  }

  updateMeta(settings: MetaPixelSettings) {
    return this.unwrap<{ settings: MetaPixelSettings }>(
      this.client.put("/admin/settings/meta-pixel", settings),
    );
  }

  testMeta() {
    return this.unwrap<{ result: MarketingConnectionResult }>(
      this.client.post("/admin/settings/meta-pixel/test"),
    );
  }

  googleSettings() {
    return this.unwrap<{ settings: GoogleAnalyticsSettings }>(
      this.client.get("/admin/settings/google-analytics"),
    );
  }

  updateGoogle(settings: GoogleAnalyticsSettings) {
    return this.unwrap<{ settings: GoogleAnalyticsSettings }>(
      this.client.put("/admin/settings/google-analytics", settings),
    );
  }

  testGoogle() {
    return this.unwrap<{ result: MarketingConnectionResult }>(
      this.client.post("/admin/settings/google-analytics/test"),
    );
  }

  analytics(days = 30) {
    return this.unwrap<{ analytics: MarketingAnalytics }>(
      this.client.get("/admin/marketing-analytics", { params: { days } }),
    );
  }

  logs(params: Record<string, unknown>) {
    return this.unwrap<{ events: MarketingTrackingEvent[] }>(
      this.client.get("/admin/marketing-analytics/logs", { params: cleanParams(params) }),
    );
  }

  status() {
    return this.unwrap<{ tracking: MarketingRuntimeStatus }>(
      this.client.get("/admin/marketing-analytics/status"),
    );
  }
}

export const marketingService = new MarketingService();
