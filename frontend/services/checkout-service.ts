"use client";

import { createAuthAwareClient } from "@/lib/api-client";
import { clearSearchAttribution, getSearchAttribution } from "@/lib/search-state";
import type { ApiEnvelope } from "@/features/admin/shared/types";

const apiBaseUrl = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/auth"
).replace(/\/auth\/?$/, "");

const client = createAuthAwareClient({ baseURL: apiBaseUrl });

const GUEST_TOKEN_KEY = "guest-token";

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
  alternativePhone?: string | null;
  landmark?: string | null;
  addressLabel?: string | null;
  addressLine: string;
  isDefaultBilling: boolean;
  isDefaultShipping: boolean;
};

export type PaymentMethod = {
  gateway: string;
  name: string;
  description?: string | null;
  logoUrl?: string | null;
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
  alternativePhone?: string;
  landmark?: string;
  addressLabel?: string;
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
  otp_verification_id?: string;
  search_event_id?: string;
};

export type CheckoutOtpRequirements = {
  required: boolean;
  enabled: boolean;
  otp_length: number;
  expiration_minutes: number;
  resend_cooldown_seconds: number;
  verified?: boolean;
  challenge_id?: string | null;
  expires_at?: string;
  resend_available_at?: string;
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

export type CheckoutMarketingEventIds = {
  beginCheckout: string;
  shippingInfo: string;
  paymentInfo: string;
};

export async function fetchAddresses(): Promise<CustomerAddress[]> {
  const response = await client.get<ApiEnvelope<{ items: CustomerAddress[] }>>("/addresses", {
    headers: {
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

export async function fetchCheckoutOtpRequirements(): Promise<CheckoutOtpRequirements> {
  const response = await client.get<ApiEnvelope<CheckoutOtpRequirements>>("/checkout/mobile-verification", {
    headers: checkoutHeaders(),
  });

  return response.data.data;
}

export async function sendCheckoutOtp(mobile: string): Promise<CheckoutOtpRequirements> {
  const response = await client.post<ApiEnvelope<CheckoutOtpRequirements>>("/checkout/mobile-verification/send", { mobile }, {
    headers: checkoutHeaders(),
  });

  return response.data.data;
}

export async function verifyCheckoutOtp(payload: { challenge_id: string; mobile: string; code: string }) {
  const response = await client.post<ApiEnvelope<{ verified: boolean; challenge_id: string }>>("/checkout/mobile-verification/verify", payload, {
    headers: checkoutHeaders(),
  });

  return response.data.data;
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

export async function placeOrder(payload: PlaceOrderPayload, marketingEventIds?: CheckoutMarketingEventIds): Promise<PlaceOrderResponse> {
  const response = await client.post<ApiEnvelope<PlaceOrderResponse>>("/checkout/place-order", {
    ...payload,
    search_event_id: payload.search_event_id ?? getSearchAttribution(),
  }, {
    headers: {
      ...checkoutHeaders(),
      ...(marketingEventIds ? {
        "X-Marketing-Begin-Checkout-Event-Id": marketingEventIds.beginCheckout,
        "X-Marketing-Shipping-Info-Event-Id": marketingEventIds.shippingInfo,
        "X-Marketing-Payment-Info-Event-Id": marketingEventIds.paymentInfo,
      } : {}),
    },
  });

  clearSearchAttribution();
  return response.data.data;
}
