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

export type CreateOrderProduct = {
  id: number;
  name: string;
  sku: string | null;
  price: number;
  stock: number;
  primary_variant_id: number | null;
  variants: Array<{ id: number; label: string; sku: string | null; price: number; stock: number; is_primary: boolean }>;
};

export type CreateOrderOptions = {
  registered_customers: Array<{ id: number; name: string; email: string; phone: string | null }>;
  guest_customers: Array<{ id: number; name: string; email: string | null; phone: string; billing_address: Record<string, string | null> | null; shipping_address: Record<string, string | null> | null }>;
  shipping_methods: Array<{ id: number; name: string; rate: number }>;
  payment_methods: Array<{ gateway: string; name: string }>;
  statuses: { order: string[]; payment: string[] };
};

class OrderManagementService extends AdminApiService {
  list(query: Partial<QueryState> & Record<string, string | number | undefined>) {
    return this.unwrap<OrderListData>(this.client.get("/admin/orders", { params: cleanParams(query) }));
  }

  createOptions() {
    return this.unwrap<CreateOrderOptions>(this.client.get("/admin/orders/create-options"));
  }

  create(payload: Record<string, unknown>) {
    return this.unwrap<{ order: OrderDetail }>(this.client.post("/admin/orders", payload));
  }

  searchProducts(search = "", ids: number[] = []) {
    return this.unwrap<{ products: CreateOrderProduct[] }>(this.client.get("/admin/orders/product-search", {
      params: cleanParams({ search, ids: ids.length ? ids : undefined }),
    }));
  }

  fullUpdate(order: string, payload: Record<string, unknown>) {
    return this.unwrap<{ order: OrderDetail }>(this.client.put(`/admin/orders/${encodeURIComponent(order)}/full`, payload));
  }

  show(order: string, params: { timeline_page?: number; timeline_per_page?: number } = {}) {
    return this.unwrap<{ order: OrderDetail; statuses: OrderStatuses }>(
      this.client.get(`/admin/orders/${encodeURIComponent(order)}`, { params: cleanParams(params) }),
    );
  }

  update(order: string, payload: { status?: string; payment_status?: string; shipping_status?: string; admin_notes?: string | null; customer_notes?: string | null; delivery_notes?: string | null; note?: string }) {
    return this.unwrap<{ order: OrderDetail }>(this.client.put(`/admin/orders/${encodeURIComponent(order)}`, payload));
  }

  delete(order: string) {
    return this.unwrap<Record<string, never>>(this.client.delete(`/admin/orders/${encodeURIComponent(order)}`));
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
