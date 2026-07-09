"use client";

import { createAuthAwareClient } from "@/lib/api-client";
import type { ApiEnvelope, PaginationMeta } from "@/features/admin/shared/types";

const apiBaseUrl = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/auth"
).replace(/\/auth\/?$/, "");

const client = createAuthAwareClient({ baseURL: apiBaseUrl, refreshPath: "/auth/refresh" });

const GUEST_TOKEN_KEY = "luxecart-guest-token";

function guestHeaders() {
  const guestToken = typeof window !== "undefined" ? window.localStorage.getItem(GUEST_TOKEN_KEY) : "";
  return { "X-Guest-Token": guestToken ?? "" };
}

export type OrderSummary = {
  subtotal: number;
  itemDiscount: number;
  couponDiscount: number;
  shipping: number;
  tax: number;
  total: number;
};

export type OrderListItem = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  shippingStatus: string;
  paymentMethod: string;
  shippingMethod?: string | null;
  currency: string;
  customer?: { id?: number | null; name?: string | null; email?: string | null };
  itemsCount?: number;
  summary: OrderSummary;
  placedAt?: string | null;
};

export type OrderDetail = OrderListItem & {
  customer: { id?: number | null; name?: string | null; email?: string | null; phone?: string | null };
  billingAddress: Record<string, string | null>;
  shippingAddress: Record<string, string | null>;
  adminNotes?: string | null;
  customerNotes?: string | null;
  items: Array<{
    id: number;
    productName: string;
    sku?: string | null;
    quantity: number;
    unitPrice: number;
    discountedPrice?: number | null;
    lineSubtotal: number;
    lineDiscount: number;
    selection?: Record<string, unknown> | null;
  }>;
  payment: {
    gateway?: string | null;
    transactionId?: string | null;
    paymentId?: string | null;
    status?: string | null;
    paidAt?: string | null;
    failureMessage?: string | null;
  };
  timeline: Array<{
    id: number;
    type: string;
    fromStatus?: string | null;
    toStatus: string;
    title: string;
    note?: string | null;
    createdAt?: string | null;
  }>;
};

export async function fetchOrders(params: Record<string, string | number | undefined> = {}): Promise<OrderListResponse> {
  const response = await client.get<OrderListResponse>("/orders", {
    params,
    headers: guestHeaders(),
  });
  return response.data;
}

export async function fetchOrder(orderNumber: string) {
  const response = await client.get<ApiEnvelope<{ order: OrderDetail }>>(`/orders/${encodeURIComponent(orderNumber)}`, {
    headers: guestHeaders(),
  });
  return response.data.data.order;
}

export async function fetchPaymentResult(orderNumber: string) {
  const response = await client.get<ApiEnvelope<{ order: OrderDetail }>>("/payment/result", {
    params: { order: orderNumber },
    headers: guestHeaders(),
  });
  return response.data.data.order;
}

export type OrderListResponse = ApiEnvelope<{ orders: OrderListItem[] }> & {
  meta: { pagination?: PaginationMeta };
};
