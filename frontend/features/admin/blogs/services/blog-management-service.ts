"use client";

import { AdminApiService, cleanParams } from "@/features/admin/shared/api";
import type { ApiEnvelope, Option, QueryState } from "@/features/admin/shared/types";
import type { BlogPayload, ManagedBlog } from "@/features/admin/blogs/types";

type BlogListData = {
  blogs: ManagedBlog[];
  authors: Option[];
};

class BlogManagementService extends AdminApiService {
  list(query: Partial<QueryState> & { featured?: string }) {
    return this.unwrap<BlogListData>(this.client.get("/admin/blogs", { params: cleanParams(query) }));
  }

  create(payload: BlogPayload) {
    return this.unwrap<{ blog: ManagedBlog }>(this.client.post("/admin/blogs", payload));
  }

  update(id: number, payload: BlogPayload) {
    return this.unwrap<{ blog: ManagedBlog }>(this.client.put(`/admin/blogs/${id}`, payload));
  }

  delete(id: number) {
    return this.unwrap<Record<string, never>>(this.client.delete(`/admin/blogs/${id}`));
  }

  bulkDelete(ids: number[]) {
    return this.unwrap<{ deleted: number }>(this.client.delete("/admin/blogs/bulk", { data: { ids } }));
  }
}

export const blogManagementService = new BlogManagementService();
export type BlogListResponse = ApiEnvelope<BlogListData>;
