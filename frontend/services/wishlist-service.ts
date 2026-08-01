"use client";

import { createAuthAwareClient } from "@/lib/api-client";
import type { ApiEnvelope } from "@/features/admin/shared/types";
import type { Product } from "@/types";
import { marketingEventHeaders, marketingTracker } from "@/lib/marketing-tracker";

const apiBaseUrl = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/auth"
).replace(/\/auth\/?$/, "");

const client = createAuthAwareClient({ baseURL: apiBaseUrl });

export type WishlistApiItem = {
  id: string;
  productId: string;
  addedAt: string;
  discountedPrice?: number | null;
  stockStatus: string;
  product: Product | null;
};

export type WishlistApiResponse = {
  id: string;
  items: WishlistApiItem[];
  count: number;
  updatedAt?: string | null;
};

function guestHeaders(guestToken: string) {
  return {
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
    "X-Guest-Token": guestToken,
  };
}

export const wishlistService = {
  async getWishlist(guestToken: string) {
    const { data } = await client.get<ApiEnvelope<{ wishlist: WishlistApiResponse }>>("/wishlist", {
      headers: guestHeaders(guestToken),
    });

    return data.data.wishlist;
  },

  async toggle(guestToken: string, productId: number) {
    const eventId = marketingTracker.createEventId("add-to-wishlist");
    const { data } = await client.post<ApiEnvelope<{ wishlist: WishlistApiResponse }>>("/wishlist/toggle", {
      product_id: productId,
    }, {
      headers: { ...guestHeaders(guestToken), ...marketingEventHeaders(eventId) },
    });
    const item = data.data.wishlist.items.find((candidate) => Number(candidate.productId) === productId);
    if (item?.product) {
      marketingTracker.track("add_to_wishlist", {
        ecommerce: {
          value: item.discountedPrice ?? item.product.price,
          items: [{
            item_id: item.product.sku ?? item.productId,
            item_name: item.product.name,
            item_brand: item.product.brand,
            item_category: item.product.category,
            price: item.discountedPrice ?? item.product.price,
            quantity: 1,
          }],
        },
      }, { eventId, serverMirror: false, serverTracked: true });
    }

    return data.data.wishlist;
  },

  async removeItem(guestToken: string, itemId: string) {
    const { data } = await client.delete<ApiEnvelope<{ wishlist: WishlistApiResponse }>>(`/wishlist/items/${itemId}`, {
      headers: guestHeaders(guestToken),
    });

    return data.data.wishlist;
  },

  async clearWishlist(guestToken: string) {
    const { data } = await client.delete<ApiEnvelope<{ wishlist: WishlistApiResponse }>>("/wishlist/items", {
      headers: guestHeaders(guestToken),
    });

    return data.data.wishlist;
  },

  async mergeWishlist(guestToken: string) {
    const { data } = await client.post<ApiEnvelope<{ wishlist: WishlistApiResponse }>>("/wishlist/merge", undefined, {
      headers: guestHeaders(guestToken),
    });

    return data.data.wishlist;
  },
};
