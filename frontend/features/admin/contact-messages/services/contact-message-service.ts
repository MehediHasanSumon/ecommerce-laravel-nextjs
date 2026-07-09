"use client";

import { createAuthAwareClient } from "@/lib/api-client";
import type { ApiEnvelope, PaginationMeta, SortDirection } from "@/features/admin/shared/types";
import type { ContactMessage, ContactMessageStatus } from "@/features/admin/contact-messages/types";

const apiBaseUrl = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/auth"
).replace(/\/auth\/?$/, "");

const client = createAuthAwareClient({ baseURL: apiBaseUrl, refreshPath: "/auth/refresh" });

type ListResponse = {
  messages: ContactMessage[];
  stats: { total: number; new: number; replied: number; closed: number };
};

export const contactMessageService = {
  async list(params: { page: number; per_page: number; search?: string; status?: string; sort?: string; direction?: SortDirection }) {
    const response = await client.get<ApiEnvelope<ListResponse> & { meta: { pagination?: PaginationMeta } }>("/admin/contact-messages", { params });
    return response.data;
  },

  async update(id: number, payload: { status: ContactMessageStatus; admin_note?: string | null }) {
    const response = await client.put<ApiEnvelope<{ message: ContactMessage }>>(`/admin/contact-messages/${id}`, payload);
    return response.data.data.message;
  },

  async delete(id: number) {
    await client.delete<ApiEnvelope<Record<string, never>>>(`/admin/contact-messages/${id}`);
  },
};
