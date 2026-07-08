"use client";

import { AdminApiService, cleanParams } from "@/features/admin/shared/api";
import type { ApiEnvelope, QueryState } from "@/features/admin/shared/types";
import type { OrderDetail, OrderListItem } from "@/services/order-service";

type OrderStatuses = {
  order: string[];
  payment: string[];
  shipping: string[];
};

type OrderListData = {
  orders: OrderListItem[];
  statuses: OrderStatuses;
};

class OrderManagementService extends AdminApiService {
  list(query: Partial<QueryState> & Record<string, string | number | undefined>) {
    return this.unwrap<OrderListData>(this.client.get("/admin/orders", { params: cleanParams(query) }));
  }

  show(order: string) {
    return this.unwrap<{ order: OrderDetail; statuses: OrderStatuses }>(this.client.get(`/admin/orders/${encodeURIComponent(order)}`));
  }

  update(order: string, payload: { status?: string; payment_status?: string; shipping_status?: string; admin_notes?: string | null; note?: string }) {
    return this.unwrap<{ order: OrderDetail }>(this.client.put(`/admin/orders/${encodeURIComponent(order)}`, payload));
  }
}

export const orderManagementService = new OrderManagementService();
export type OrderManagementListResponse = ApiEnvelope<OrderListData>;
