"use client";

import { createAuthAwareClient } from "@/lib/api-client";
import type { ApiEnvelope, PaginationMeta } from "@/features/admin/shared/types";

const apiBaseUrl = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/auth"
).replace(/\/auth\/?$/, "");

const client = createAuthAwareClient({ baseURL: apiBaseUrl });

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
    productId?: number | null;
    variantId?: number | null;
    productName: string;
    productSlug?: string | null;
    image?: string | null;
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
  refunds?: Array<{ id: number; amount: number; status: string; reason?: string | null; note?: string | null; processedAt?: string | null }>;
  shippingLogs?: Array<{ id: number; status: string; courier?: string | null; trackingNumber?: string | null; trackingUrl?: string | null; note?: string | null; createdAt?: string | null }>;
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

export async function cancelOrder(orderNumber: string) {
  const response = await client.post<ApiEnvelope<{ order: OrderDetail }>>(`/orders/${encodeURIComponent(orderNumber)}/cancel`, undefined, {
    headers: guestHeaders(),
  });
  return response.data.data.order;
}

export function orderInvoiceUrl(orderNumber: string) {
  return `${apiBaseUrl}/orders/${encodeURIComponent(orderNumber)}/invoice`;
}

export async function downloadOrderInvoice(orderNumber: string) {
  const response = await client.get<Blob>(`/orders/${encodeURIComponent(orderNumber)}/invoice`, {
    headers: guestHeaders(),
    responseType: "blob",
  });
  saveBlob(response.data, `invoice-${orderNumber}.pdf`);
}

export function paymentInvoiceUrl(orderNumber: string) {
  const query = new URLSearchParams({ order: orderNumber });
  return `${apiBaseUrl}/payment/invoice?${query.toString()}`;
}

export async function downloadPaymentInvoice(orderNumber: string) {
  const response = await client.get<Blob>("/payment/invoice", {
    params: { order: orderNumber },
    headers: guestHeaders(),
    responseType: "blob",
  });
  saveBlob(response.data, `invoice-${orderNumber}.pdf`);
}

function saveBlob(blob: Blob, filename: string) {
  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
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
