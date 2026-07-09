"use client";

import axios from "axios";
import type { ApiEnvelope } from "@/features/admin/shared/types";

const apiBaseUrl = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/auth"
).replace(/\/auth\/?$/, "");

export type ContentPage = {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  template: "about" | "faq" | "legal" | "info" | string;
  payload: Record<string, unknown>;
  seo: {
    title?: string | null;
    description?: string | null;
  };
  updated_at: string | null;
};

export async function fetchContentPage(
  slug: string,
  options: { signal?: AbortSignal } = {},
): Promise<ContentPage> {
  const response = await axios.get<ApiEnvelope<{ page: ContentPage }>>(
    `${apiBaseUrl}/content-pages/${encodeURIComponent(slug)}`,
    {
      signal: options.signal,
      withCredentials: true,
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    },
  );

  return response.data.data.page;
}
