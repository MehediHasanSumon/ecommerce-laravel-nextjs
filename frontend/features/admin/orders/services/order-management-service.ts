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

  show(order: string, params: { timeline_page?: number; timeline_per_page?: number } = {}) {
    return this.unwrap<{ order: OrderDetail; statuses: OrderStatuses }>(
      this.client.get(`/admin/orders/${encodeURIComponent(order)}`, { params: cleanParams(params) }),
    );
  }

  update(order: string, payload: { status?: string; payment_status?: string; shipping_status?: string; admin_notes?: string | null; note?: string }) {
    return this.unwrap<{ order: OrderDetail }>(this.client.put(`/admin/orders/${encodeURIComponent(order)}`, payload));
  }

  bulkUpdate(payload: { ids: Array<string | number>; status?: string; payment_status?: string; shipping_status?: string; note?: string }) {
    return this.unwrap<{ updated: number }>(this.client.put("/admin/orders/bulk", payload));
  }

  refund(order: string, payload: { amount: number; reason: string; note?: string }) {
    return this.unwrap<{ order: OrderDetail }>(this.client.post(`/admin/orders/${encodeURIComponent(order)}/refund`, payload));
  }

  shippingLog(order: string, payload: { status: string; courier?: string; tracking_number?: string; tracking_url?: string; note?: string }) {
    return this.unwrap<{ order: OrderDetail }>(this.client.post(`/admin/orders/${encodeURIComponent(order)}/shipping-log`, payload));
  }

  invoiceUrl(order: string) {
    return `${this.client.defaults.baseURL}/admin/orders/${encodeURIComponent(order)}/invoice`;
  }

  deliverySlipUrl(order: string) {
    return `${this.client.defaults.baseURL}/admin/orders/${encodeURIComponent(order)}/delivery-slip`;
  }

  async downloadInvoice(order: string) {
    this.downloadFromUrl(this.invoiceUrl(order));
  }

  async downloadDeliverySlip(order: string) {
    this.downloadFromUrl(this.deliverySlipUrl(order));
  }

  private downloadFromUrl(url: string) {
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
}

export const orderManagementService = new OrderManagementService();
export type OrderManagementListResponse = ApiEnvelope<OrderListData>;
