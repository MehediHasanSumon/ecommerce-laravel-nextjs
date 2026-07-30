"use client";

import { AdminApiService, cleanParams } from "@/features/admin/shared/api";
import type { IpBlock, IpBlockAnalytics, IpBlockPayload, SecuritySettingsPayload } from "@/features/admin/ip-blocks/types";

export type IpBlockQuery = {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  type?: string;
  reason?: string;
  country?: string;
  date_from?: string;
  date_to?: string;
  sort?: string;
  direction?: "asc" | "desc";
};

class IpBlockService extends AdminApiService {
  list(query: IpBlockQuery) {
    return this.unwrap<{ ip_blocks: IpBlock[] }>(this.client.get("/admin/ip-blocks", { params: cleanParams(query) }));
  }

  show(id: string | number) {
    return this.unwrap<{ ip_block: IpBlock }>(this.client.get(`/admin/ip-blocks/${id}`));
  }

  create(payload: IpBlockPayload) {
    return this.unwrap<{ ip_block: IpBlock }>(this.client.post("/admin/ip-blocks", payload));
  }

  update(id: string | number, payload: IpBlockPayload) {
    return this.unwrap<{ ip_block: IpBlock }>(this.client.put(`/admin/ip-blocks/${id}`, payload));
  }

  delete(id: string | number) {
    return this.unwrap<Record<string, never>>(this.client.delete(`/admin/ip-blocks/${id}`));
  }

  bulk(ids: number[], action: "block" | "unblock" | "delete" | "activate" | "deactivate", reason?: string) {
    return this.unwrap<{ processed: number }>(this.client.post("/admin/ip-blocks/bulk", { ids, action, reason }));
  }

  deleteExpired() {
    return this.unwrap<{ deleted: number }>(this.client.post("/admin/ip-blocks/delete-expired"));
  }

  analytics() {
    return this.unwrap<{ analytics: IpBlockAnalytics }>(this.client.get("/admin/ip-blocks/analytics"));
  }

  securitySettings() {
    return this.unwrap<SecuritySettingsPayload>(this.client.get("/admin/settings/security"));
  }

  updateSecuritySettings(payload: SecuritySettingsPayload) {
    return this.unwrap<SecuritySettingsPayload>(this.client.put("/admin/settings/security", payload));
  }
}

export const ipBlockService = new IpBlockService();
