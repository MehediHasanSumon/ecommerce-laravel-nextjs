"use client";

import { AdminApiService, cleanParams } from "@/features/admin/shared/api";
import type { SmsLog, SmsSettingsPayload } from "@/features/admin/sms/types";

class SmsAdminService extends AdminApiService {
  settings() {
    return this.unwrap<SmsSettingsPayload>(this.client.get("/admin/settings/sms"));
  }

  update(payload: SmsSettingsPayload["settings"] & { templates: SmsSettingsPayload["templates"] }) {
    return this.unwrap<SmsSettingsPayload>(this.client.put("/admin/settings/sms", payload));
  }

  test(mobile: string) {
    return this.unwrap<{ log: SmsLog }>(this.client.post("/admin/settings/sms/test", { mobile }));
  }

  logs(query: Record<string, unknown>) {
    return this.unwrap<{ logs: SmsLog[] }>(this.client.get("/admin/sms-logs", { params: cleanParams(query) }));
  }

  log(id: string) {
    return this.unwrap<{ log: SmsLog }>(this.client.get(`/admin/sms-logs/${encodeURIComponent(id)}`));
  }
}

export const smsAdminService = new SmsAdminService();
