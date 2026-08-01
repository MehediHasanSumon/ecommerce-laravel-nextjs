"use client";

import { AdminApiService, cleanParams } from "@/features/admin/shared/api";
import type {
  FraudAnalytics,
  FraudCheck,
  FraudGeneralSettings,
  FraudProviderMetadata,
  FraudProviderSetting,
} from "@/features/admin/fraud/types";

type FraudSettingsData = {
  settings: FraudGeneralSettings;
  providers: FraudProviderSetting[];
  metadata: Record<string, FraudProviderMetadata>;
};

class FraudService extends AdminApiService {
  settings() {
    return this.unwrap<FraudSettingsData>(this.client.get("/admin/settings/fraud-detection"));
  }

  updateSettings(settings: FraudGeneralSettings, providers: FraudProviderSetting[]) {
    return this.unwrap<FraudSettingsData>(
      this.client.put("/admin/settings/fraud-detection", { settings, providers }),
    );
  }

  testConnection(provider: string) {
    return this.unwrap<{ result: Record<string, unknown> }>(
      this.client.post(`/admin/settings/fraud-detection/${encodeURIComponent(provider)}/test`),
    );
  }

  check(payload: Record<string, unknown>) {
    return this.unwrap<{ check: FraudCheck }>(this.client.post("/admin/fraud-checks", payload));
  }

  history(params: Record<string, unknown>) {
    return this.unwrap<{ checks: FraudCheck[] }>(
      this.client.get("/admin/fraud-checks", { params: cleanParams(params) }),
    );
  }

  show(check: string) {
    return this.unwrap<{ check: FraudCheck }>(
      this.client.get(`/admin/fraud-checks/${encodeURIComponent(check)}`),
    );
  }

  bulk(subjects: Array<{ type: "order" | "registered" | "guest"; id: string | number }>, bypassCache = false) {
    return this.unwrap<{ queued: number }>(
      this.client.post("/admin/fraud-checks/bulk", { subjects, bypass_cache: bypassCache }),
    );
  }

  clearCache(payload: Record<string, unknown> = {}) {
    return this.unwrap<{ cleared: number }>(this.client.post("/admin/fraud-checks/clear-cache", payload));
  }

  approveOrder(order: string) {
    return this.unwrap<{ order: Record<string, unknown> }>(
      this.client.post(`/admin/orders/${encodeURIComponent(order)}/fraud-approval`),
    );
  }

  analytics(days = 30) {
    return this.unwrap<{ analytics: FraudAnalytics }>(
      this.client.get("/admin/fraud-analytics", { params: { days } }),
    );
  }
}

export const fraudService = new FraudService();
