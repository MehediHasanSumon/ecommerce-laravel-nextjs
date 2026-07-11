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
    const requestPayload = this.toRequestPayload(payload);
    return this.unwrap<{ blog: ManagedBlog }>(this.client.post("/admin/blogs", requestPayload, requestPayload instanceof FormData ? {
      headers: { "Content-Type": "multipart/form-data" },
    } : undefined));
  }

  update(id: number, payload: BlogPayload) {
    const requestPayload = this.toRequestPayload(payload);
    if (requestPayload instanceof FormData) {
      requestPayload.append("_method", "PUT");
      return this.unwrap<{ blog: ManagedBlog }>(this.client.post(`/admin/blogs/${id}`, requestPayload, {
        headers: { "Content-Type": "multipart/form-data" },
      }));
    }

    return this.unwrap<{ blog: ManagedBlog }>(this.client.put(`/admin/blogs/${id}`, requestPayload));
  }

  delete(id: number) {
    return this.unwrap<Record<string, never>>(this.client.delete(`/admin/blogs/${id}`));
  }

  bulkDelete(ids: number[]) {
    return this.unwrap<{ deleted: number }>(this.client.delete("/admin/blogs/bulk", { data: { ids } }));
  }

  private toRequestPayload(payload: BlogPayload) {
    if (!(payload.featured_image_file instanceof File)) {
      return payload;
    }

    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      if (value instanceof File) {
        formData.append(key, value);
        return;
      }
      if (typeof value === "boolean") {
        formData.append(key, value ? "1" : "0");
        return;
      }
      formData.append(key, String(value));
    });

    return formData;
  }
}

export const blogManagementService = new BlogManagementService();
export type BlogListResponse = ApiEnvelope<BlogListData>;
