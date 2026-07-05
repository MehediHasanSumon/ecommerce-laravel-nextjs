"use client";

import { createAuthAwareClient } from "@/lib/api-client";
import type { ApiEnvelope } from "@/features/admin/shared/types";
import type { Product } from "@/types";

const apiBaseUrl = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/auth"
).replace(/\/auth\/?$/, "");

const client = createAuthAwareClient({ baseURL: apiBaseUrl, refreshPath: "/auth/refresh" });

export type CartSelectionAttribute = {
  name: string;
  value: string;
  label?: string | null;
};

export type CartApiItem = {
  id: string;
  productId: string;
  variantId?: string | null;
  quantity: number;
  unitPrice: number;
  discountedPrice?: number | null;
  subtotal: number;
  discountTotal: number;
  selectedVariant?: string | null;
  selectedSize?: string | null;
  selectedColor?: string | null;
  selectedAttributes: CartSelectionAttribute[];
  selectedOptions: Record<string, unknown>;
  selectedSku?: string | null;
  selectedImage?: string | null;
  pricing: {
    basePrice?: number | null;
    compareAtPrice?: number | null;
    discountedPrice?: number | null;
    collectionDiscount?: {
      id: number;
      name: string;
      slug: string;
      type?: string | null;
      value?: number | null;
      ends_at?: string | null;
    } | null;
  };
  tax: {
    tax_class?: string | null;
    estimated_tax_cents?: number;
  };
  product: Product | null;
  availability: {
    inStock: boolean;
    stock: number;
    status?: string | null;
  };
};

export type CartApiResponse = {
  id: string;
  items: CartApiItem[];
  itemCount: number;
  couponCode?: string | null;
  coupon?: {
    code: string;
    name?: string | null;
    discount: number;
    freeShipping: boolean;
    shippingDiscount: number;
  } | null;
  notice?: {
    message: string;
    type: "success" | "info";
    removed?: boolean;
    changed?: boolean;
  } | null;
  summary: {
    subtotal: number;
    itemDiscount?: number;
    couponDiscount?: number;
    discount: number;
    estimatedTax: number;
    shippingOriginal?: number;
    shippingDiscount?: number;
    shipping: number;
    total: number;
  };
  updatedAt?: string | null;
};

export type AddCartItemPayload = {
  product_id: number;
  product_variant_id?: number;
  quantity: number;
  selected_color?: string;
  selected_size?: string;
  selected_attributes?: CartSelectionAttribute[];
  selected_options?: Record<string, unknown>;
};

export type CartSessionMode = "authenticated" | "guest";

function cartHeaders(guestToken: string, mode: CartSessionMode) {
  return {
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
    "X-Guest-Token": guestToken,
    "X-Cart-Mode": mode,
  };
}

export const cartService = {
  async getCart(guestToken: string, mode: CartSessionMode) {
    const { data } = await client.get<ApiEnvelope<{ cart: CartApiResponse }>>("/cart", {
      headers: cartHeaders(guestToken, mode),
    });

    return data.data.cart;
  },

  async addItem(guestToken: string, mode: CartSessionMode, payload: AddCartItemPayload) {
    const { data } = await client.post<ApiEnvelope<{ cart: CartApiResponse }>>("/cart/items", payload, {
      headers: cartHeaders(guestToken, mode),
    });

    return data.data.cart;
  },

  async updateItem(guestToken: string, mode: CartSessionMode, itemId: string, quantity: number) {
    const { data } = await client.put<ApiEnvelope<{ cart: CartApiResponse }>>(`/cart/items/${itemId}`, {
      quantity,
    }, {
      headers: cartHeaders(guestToken, mode),
    });

    return data.data.cart;
  },

  async removeItem(guestToken: string, mode: CartSessionMode, itemId: string) {
    const { data } = await client.delete<ApiEnvelope<{ cart: CartApiResponse }>>(`/cart/items/${itemId}`, {
      headers: cartHeaders(guestToken, mode),
    });

    return data.data.cart;
  },

  async clearCart(guestToken: string, mode: CartSessionMode) {
    const { data } = await client.delete<ApiEnvelope<{ cart: CartApiResponse }>>("/cart/items", {
      headers: cartHeaders(guestToken, mode),
    });

    return data.data.cart;
  },

  async mergeCart(guestToken: string) {
    const { data } = await client.post<ApiEnvelope<{ cart: CartApiResponse }>>("/cart/merge", undefined, {
      headers: cartHeaders(guestToken, "authenticated"),
    });

    return data.data.cart;
  },

  async applyCoupon(guestToken: string, mode: CartSessionMode, code: string) {
    const { data } = await client.post<ApiEnvelope<{ cart: CartApiResponse }>>("/cart/coupon", {
      code,
    }, {
      headers: cartHeaders(guestToken, mode),
    });

    return data.data.cart;
  },

  async removeCoupon(guestToken: string, mode: CartSessionMode) {
    const { data } = await client.delete<ApiEnvelope<{ cart: CartApiResponse }>>("/cart/coupon", {
      headers: cartHeaders(guestToken, mode),
    });

    return data.data.cart;
  },
};
