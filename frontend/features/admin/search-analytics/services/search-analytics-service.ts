"use client";

import { createAuthAwareClient } from "@/lib/api-client";
import type { ApiEnvelope, PaginationMeta } from "@/features/admin/shared/types";

const apiBaseUrl = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/auth"
).replace(/\/auth\/?$/, "");
const client = createAuthAwareClient({ baseURL: apiBaseUrl });

export type SearchAnalyticsSummary = {
  key: string;
  label: string;
  value: number;
  format: "number" | "percent";
};

export type SearchAnalyticsTerm = {
  id: string;
  keyword: string;
  search_count: number;
  zero_result_count: number;
  unique_user_count: number;
  click_count: number;
  conversion_count: number;
  last_searched_at?: string | null;
};

export type RankedSearchTerm = {
  keyword: string;
  search_count: number;
  zero_result_count: number;
  click_count: number;
  conversion_count: number;
  last_searched_at?: string | null;
};

export type SearchAnalytics = {
  filters: { date_from: string; date_to: string };
  summary: SearchAnalyticsSummary[];
  series: Array<{ label: string; value: number }>;
  most_searched: RankedSearchTerm[];
  zero_results: RankedSearchTerm[];
  top_converting: RankedSearchTerm[];
  trending: RankedSearchTerm[];
  recent: Array<{ keyword: string; results: number; searched_at?: string | null }>;
  top_categories: Array<{ label: string; value: number }>;
  top_brands: Array<{ label: string; value: number }>;
  top_collections: Array<{ label: string; value: number }>;
};

export type SearchAnalyticsResponse = {
  analytics: SearchAnalytics;
  items: SearchAnalyticsTerm[];
  pagination: PaginationMeta;
};

export async function fetchSearchAnalytics(params: {
  date_from?: string;
  date_to?: string;
  search?: string;
  type?: string;
  sort?: string;
  direction?: string;
  page?: number;
  per_page?: number;
  limit?: number;
}): Promise<SearchAnalyticsResponse> {
  const response = await client.get<ApiEnvelope<{ analytics: SearchAnalytics; items: SearchAnalyticsTerm[] }>>(
    "/admin/search-analytics",
    { params },
  );

  return {
    analytics: response.data.data.analytics,
    items: response.data.data.items,
    pagination: response.data.meta.pagination ?? {
      current_page: 1,
      last_page: 1,
      per_page: params.per_page ?? 20,
      total: response.data.data.items.length,
      from: response.data.data.items.length ? 1 : null,
      to: response.data.data.items.length || null,
    },
  };
}
