"use client";

import { AdminApiService, cleanParams } from "@/features/admin/shared/api";
import type { ApiEnvelope, Option, QueryState } from "@/features/admin/shared/types";
import type { ManagedRole, RolePayload } from "@/features/admin/roles/types";

type RoleListData = {
  roles: ManagedRole[];
  permissions: Option[];
};

class RoleService extends AdminApiService {
  list(query: Partial<QueryState>) {
    return this.unwrap<RoleListData>(this.client.get("/admin/roles", { params: cleanParams(query) }));
  }

  create(payload: RolePayload) {
    return this.unwrap<{ role: ManagedRole }>(this.client.post("/admin/roles", payload));
  }

  update(id: number, payload: RolePayload) {
    return this.unwrap<{ role: ManagedRole }>(this.client.put(`/admin/roles/${id}`, payload));
  }

  delete(id: number) {
    return this.unwrap<Record<string, never>>(this.client.delete(`/admin/roles/${id}`));
  }

  bulkDelete(ids: number[]) {
    return this.unwrap<{ deleted: number }>(this.client.delete("/admin/roles/bulk", { data: { ids } }));
  }
}

export const roleService = new RoleService();
export type RoleListResponse = ApiEnvelope<RoleListData>;
