"use client";

import { AdminApiService, cleanParams } from "@/features/admin/shared/api";
import type { ApiEnvelope, QueryState } from "@/features/admin/shared/types";
import type { ManagedPermission, PermissionPayload } from "@/features/admin/permissions/types";

type PermissionListData = {
  permissions: ManagedPermission[];
};

class PermissionService extends AdminApiService {
  list(query: Partial<QueryState>) {
    return this.unwrap<PermissionListData>(this.client.get("/admin/permissions", { params: cleanParams(query) }));
  }

  create(payload: PermissionPayload) {
    return this.unwrap<{ permission: ManagedPermission }>(this.client.post("/admin/permissions", payload));
  }

  update(id: number, payload: PermissionPayload) {
    return this.unwrap<{ permission: ManagedPermission }>(this.client.put(`/admin/permissions/${id}`, payload));
  }

  delete(id: number) {
    return this.unwrap<Record<string, never>>(this.client.delete(`/admin/permissions/${id}`));
  }

  bulkDelete(ids: number[]) {
    return this.unwrap<{ deleted: number }>(this.client.delete("/admin/permissions/bulk", { data: { ids } }));
  }
}

export const permissionService = new PermissionService();
export type PermissionListResponse = ApiEnvelope<PermissionListData>;
