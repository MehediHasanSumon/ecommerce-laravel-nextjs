"use client";

import { createAuthAwareClient } from "@/lib/api-client";
import type { ApiEnvelope } from "@/features/admin/shared/types";

const apiBaseUrl = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/auth"
).replace(/\/auth\/?$/, "");

const client = createAuthAwareClient({ baseURL: apiBaseUrl, refreshPath: "/auth/refresh" });

export type ReportRow = {
  label: string;
  secondary?: string | null;
  status?: string | null;
  amount?: string | number | null;
  date?: string | null;
};

export type ReportSeriesPoint = {
  label: string;
  value: number;
  amount?: number | null;
};

export type ReportSummary = {
  label: string;
  value: string | number;
  format: "number" | "money" | string;
};

export type ReportPayload = {
  type: string;
  title: string;
  currency: string;
  filters: { date_from: string; date_to: string; limit: number };
  summary: ReportSummary[];
  series: ReportSeriesPoint[];
  rows: ReportRow[];
};

export async function fetchReport(type: string, params: { date_from?: string; date_to?: string; limit?: number; status?: string; payment_status?: string }) {
  const response = await client.get<ApiEnvelope<{ report: ReportPayload }>>(`/admin/reports/${type}`, { params });
  return response.data.data.report;
}
