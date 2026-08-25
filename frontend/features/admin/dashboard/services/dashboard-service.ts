"use client";

import { AdminApiService, cleanParams } from "@/features/admin/shared/api";

export type DashboardPreset =
  | "today"
  | "yesterday"
  | "last_7_days"
  | "last_30_days"
  | "last_90_days"
  | "this_month"
  | "this_year"
  | "last_12_months"
  | "custom";

export type DashboardQuery = {
  preset?: DashboardPreset;
  date_from?: string;
  date_to?: string;
};

export type DashboardCard = {
  key: string;
  title: string;
  value: number;
  format: "money" | "number";
  previous_value: number;
  change_percent: number;
  trend: "up" | "down" | "flat";
  details: Array<{ label: string; value: number; format: "money" | "number" }>;
};

export type DashboardPoint = {
  label: string;
  value: number;
  count?: number;
  quantity?: number;
};

export type DashboardData = {
  filters: { preset: DashboardPreset; date_from: string; date_to: string };
  currency: string;
  cards: DashboardCard[];
  tables: {
    recent_orders: Array<{
      id: string;
      order_number: string;
      customer: string;
      payment_method: string;
      payment_status: string;
      order_status: string;
      total: number;
      date: string | null;
    }>;
  };
};

class DashboardService extends AdminApiService {
  show(query: DashboardQuery) {
    return this.unwrap<{ dashboard: DashboardData }>(
      this.client.get("/admin/dashboard", { params: cleanParams(query) }),
    );
  }
}

export const dashboardService = new DashboardService();
