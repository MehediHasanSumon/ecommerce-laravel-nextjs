"use client";

import { createAuthAwareClient } from "@/lib/api-client";
import type { ApiEnvelope } from "@/features/admin/shared/types";

const client = createAuthAwareClient({
  baseURL: (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/auth").replace(/\/auth\/?$/, ""),
});

export type TrackedOrder = {
  orderId: string;
  orderDate: string | null;
  status: string;
  paymentStatus: string;
  shippingStatus: string;
  paymentMethod: string;
  customer: { name: string; phone: string | null };
  shipping: {
    recipientName: string | null;
    phone: string | null;
    address: string;
    method: string | null;
    estimatedDelivery: string | null;
    courier: string | null;
    trackingNumber: string | null;
    trackingUrl: string | null;
    deliveryNotes: string | null;
  };
  items: Array<{
    name: string;
    slug: string | null;
    image: string | null;
    variant: string | null;
    sku: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  summary: {
    subtotal: number;
    discount: number;
    couponDiscount: number;
    tax: number;
    shipping: number;
    total: number;
  };
  timeline: Array<{
    key: string;
    label: string;
    state: "completed" | "current" | "pending" | "exception";
  }>;
};

export async function trackOrder(payload: { order_id: string; mobile_number: string }) {
  const response = await client.post<ApiEnvelope<{ order: TrackedOrder }>>("/order-tracking", payload);
  return response.data.data.order;
}
