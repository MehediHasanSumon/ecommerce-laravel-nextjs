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
  brand_enabled: boolean;
  currency: string;
  cards: DashboardCard[];
  security?: {
    blocked_today: number;
    blocked_this_week: number;
    blocked_this_month: number;
    currently_blocked: number;
    automatic_blocks: number;
    manual_blocks: number;
    top_countries: Array<{ country: string; total: number }>;
    top_reasons: Array<{ reason: string; total: number }>;
  };
  sales: {
    series: DashboardPoint[];
    summary: { revenue: number; orders: number; average_order_value: number };
  };
  charts: {
    revenue: DashboardPoint[];
    orders: DashboardPoint[];
    payment_methods: DashboardPoint[];
    collections: DashboardPoint[];
  };
  tables: {
    best_selling_products: Array<{ id: number | null; name: string; sku: string | null; image: string | null; sold_quantity: number; revenue: number }>;
    top_categories: Array<{ name: string; sold_quantity: number; revenue: number }>;
    top_brands: Array<{ name: string; sales: number; revenue: number }>;
    recent_orders: Array<{ id: string; order_number: string; customer: string; payment_method: string; payment_status: string; order_status: string; total: number; date: string | null }>;
    low_stock_products: Array<{ id: number; name: string; sku: string | null; current_stock: number; minimum_stock: number; status: string }>;
    out_of_stock_products: Array<{ id: number; name: string; sku: string | null; current_stock: number; minimum_stock: number; status: string }>;
    latest_customers: Array<{ id: number; name: string; email: string; avatar: string; registered_at: string | null }>;
    recent_reviews: Array<{ id: number; product: string; customer: string; rating: number; review: string; status: string; date: string | null }>;
    activity: Array<{ type: string; title: string; description: string; date: string | null }>;
  };
  notifications: Array<{ key: string; label: string; value: number }>;
  reports: Array<{ label: string; value: number; format: "money" | "number" }>;
};

class DashboardService extends AdminApiService {
  show(query: DashboardQuery) {
    return this.unwrap<{ dashboard: DashboardData }>(
      this.client.get("/admin/dashboard", { params: cleanParams(query) }),
    );
  }
}

export const dashboardService = new DashboardService();
