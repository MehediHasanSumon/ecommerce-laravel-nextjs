"use client";

import { createAuthAwareClient } from "@/lib/api-client";
import type { ApiEnvelope } from "@/features/admin/shared/types";
import axios from "axios";

const apiBaseUrl = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/auth"
).replace(/\/auth\/?$/, "");

const client = createAuthAwareClient({ baseURL: apiBaseUrl, refreshPath: "/auth/refresh" });

const GUEST_TOKEN_KEY = "luxecart-guest-token";

function checkoutHeaders() {
  const guestToken = typeof window !== "undefined" ? window.localStorage.getItem(GUEST_TOKEN_KEY) : "";

  return {
    "X-Guest-Token": guestToken ?? "",
  };
}

export type CustomerAddress = {
  id: string;
  fullName: string;
  phone: string;
  email?: string | null;
  country: string;
  state: string;
  district: string;
  city: string;
  area?: string | null;
  postalCode?: string | null;
  addressLine: string;
  isDefaultBilling: boolean;
  isDefaultShipping: boolean;
};

export type PaymentMethod = {
  gateway: string;
  name: string;
  description?: string | null;
  sandboxMode: boolean;
  sortOrder: number;
};

export type CheckoutAddressPayload = {
  fullName: string;
  phone: string;
  email?: string;
  country: string;
  state: string;
  district: string;
  city: string;
  area?: string;
  postalCode?: string;
  addressLine: string;
};

export type PlaceOrderPayload = {
  billing_address_id?: number;
  shipping_address_id?: number;
  billing_address?: CheckoutAddressPayload;
  shipping_address?: CheckoutAddressPayload;
  same_as_billing: boolean;
  shipping_method_id: number;
  payment_method: string;
};

export type PlaceOrderResponse = {
  order: {
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    redirectUrl?: string | null;
  };
  payment: {
    status: string;
    redirectUrl?: string | null;
  };
};

export async function fetchAddresses(): Promise<CustomerAddress[]> {
  const response = await axios.get<ApiEnvelope<{ items: CustomerAddress[] }>>(`${apiBaseUrl}/addresses`, {
    withCredentials: true,
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...checkoutHeaders(),
    },
    validateStatus: (status) => (status >= 200 && status < 300) || status === 401,
  });

  if (response.status === 401) {
    return [];
  }

  return response.data.data.items;
}

export async function fetchPaymentMethods(): Promise<PaymentMethod[]> {
  const response = await client.get<ApiEnvelope<{ items: PaymentMethod[] }>>("/checkout/payment-methods", {
    headers: checkoutHeaders(),
  });

  return response.data.data.items;
}

export async function createAddress(payload: CheckoutAddressPayload & { isDefaultBilling?: boolean; isDefaultShipping?: boolean }) {
  const response = await client.post<ApiEnvelope<{ address: CustomerAddress }>>("/addresses", payload, {
    headers: checkoutHeaders(),
  });

  return response.data.data.address;
}

export async function updateAddress(
  id: string,
  payload: CheckoutAddressPayload & { isDefaultBilling?: boolean; isDefaultShipping?: boolean },
) {
  const response = await client.put<ApiEnvelope<{ address: CustomerAddress }>>(`/addresses/${encodeURIComponent(id)}`, payload, {
    headers: checkoutHeaders(),
  });

  return response.data.data.address;
}

export async function deleteAddress(id: string) {
  await client.delete<ApiEnvelope<Record<string, never>>>(`/addresses/${encodeURIComponent(id)}`, {
    headers: checkoutHeaders(),
  });
}

export async function placeOrder(payload: PlaceOrderPayload): Promise<PlaceOrderResponse> {
  const response = await client.post<ApiEnvelope<PlaceOrderResponse>>("/checkout/place-order", payload, {
    headers: checkoutHeaders(),
  });

  return response.data.data;
}
