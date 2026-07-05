"use client";

import { AdminApiService, cleanParams } from "@/features/admin/shared/api";
import type { ApiEnvelope, Option, QueryState } from "@/features/admin/shared/types";
import type { ManagedUser, UserPayload } from "@/features/admin/users/types";

type UserListData = {
  users: ManagedUser[];
  roles: Option[];
};

class UserService extends AdminApiService {
  list(query: Partial<QueryState>) {
    return this.unwrap<UserListData>(this.client.get("/admin/users", { params: cleanParams(query) }));
  }

  create(payload: UserPayload) {
    return this.unwrap<{ user: ManagedUser }>(this.client.post("/admin/users", payload));
  }

  update(id: number, payload: UserPayload) {
    return this.unwrap<{ user: ManagedUser }>(this.client.put(`/admin/users/${id}`, payload));
  }

  delete(id: number) {
    return this.unwrap<Record<string, never>>(this.client.delete(`/admin/users/${id}`));
  }

  bulkDelete(ids: number[]) {
    return this.unwrap<{ deleted: number }>(this.client.delete("/admin/users/bulk", { data: { ids } }));
  }
}

export const userService = new UserService();
export type UserListResponse = ApiEnvelope<UserListData>;
