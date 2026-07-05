'use client';

import { create } from 'zustand';
import type { Cart, CartItem, Product } from '@/types';
import { cartService, type AddCartItemPayload, type CartApiResponse } from '@/services/cart-service';
import { useAuthStore } from '@/store/auth-store';
import { toAppError } from '@/lib/errors';

const GUEST_TOKEN_KEY = 'luxecart-guest-token';

function browserGuestToken() {
  if (typeof window === 'undefined') {
    return 'server-guest-token';
  }

  const existing = window.localStorage.getItem(GUEST_TOKEN_KEY);
  if (existing) {
    return existing;
  }

  const token = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `guest-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  window.localStorage.setItem(GUEST_TOKEN_KEY, token);

  return token;
}

function ensureGuestToken(stateToken: string, set: (partial: Partial<CartStore>) => void) {
  const token = stateToken && stateToken !== 'server-guest-token' ? stateToken : browserGuestToken();
  if (token !== stateToken) {
    set({ guestToken: token });
  }

  return token;
}

function toCartItem(item: CartApiResponse['items'][number]): CartItem {
  return {
    id: item.id,
    productId: item.productId,
    product: item.product as Product,
    quantity: item.quantity,
    variantId: item.variantId,
    unitPrice: item.unitPrice,
    discountedPrice: item.discountedPrice,
    subtotal: item.subtotal,
    discountTotal: item.discountTotal,
    selectedVariant: item.selectedVariant,
    selectedColor: item.selectedColor ?? undefined,
    selectedSize: item.selectedSize ?? undefined,
    selectedAttributes: item.selectedAttributes,
    selectedOptions: item.selectedOptions,
    selectedSku: item.selectedSku,
    selectedImage: item.selectedImage,
    availability: item.availability,
  };
}

function emptyCart(): Cart {
  return {
    items: [],
    couponCode: '',
    coupon: null,
    notice: null,
    discount: 0,
    summary: {
      subtotal: 0,
      itemDiscount: 0,
      couponDiscount: 0,
      discount: 0,
      estimatedTax: 0,
      shipping: 0,
      shippingOriginal: 0,
      shippingDiscount: 0,
      total: 0,
    },
  };
}

type AddItemInput =
  | Product
  | {
      productId: number;
      productVariantId?: number;
      quantity?: number;
      selectedColor?: string;
      selectedSize?: string;
      selectedAttributes?: Array<{ name: string; value: string; label?: string | null }>;
      selectedOptions?: Record<string, unknown>;
    };

interface CartStore {
  cart: Cart;
  items: CartItem[];
  couponCode: string;
  couponDiscount: number;
  couponMessage: string;
  couponMessageType: 'success' | 'error' | 'info' | null;
  isLoading: boolean;
  isCouponLoading: boolean;
  initialized: boolean;
  guestToken: string;
  initialize: () => Promise<void>;
  refresh: () => Promise<void>;
  syncAfterAuth: () => Promise<void>;
  addItem: (
    product: AddItemInput,
    quantity?: number,
    selectedColor?: string,
    selectedSize?: string
  ) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  applyCoupon: (code: string) => Promise<boolean>;
  removeCoupon: () => Promise<void>;
  getItemCount: () => number;
  getSubtotal: () => number;
  getShipping: () => number;
  getTax: () => number;
  getTotal: () => number;
}

function selectionToPayload(
  input: AddItemInput,
  quantity = 1,
  selectedColor?: string,
  selectedSize?: string,
): AddCartItemPayload {
  if ('productId' in input) {
    return {
      product_id: input.productId,
      product_variant_id: input.productVariantId,
      quantity: input.quantity ?? quantity,
      selected_color: input.selectedColor ?? selectedColor,
      selected_size: input.selectedSize ?? selectedSize,
      selected_attributes: input.selectedAttributes,
      selected_options: input.selectedOptions,
    };
  }

  return {
    product_id: Number(input.id),
    quantity,
    selected_color: selectedColor,
    selected_size: selectedSize,
  };
}

function applyCartState(set: (partial: Partial<CartStore>) => void, cart: CartApiResponse) {
  const mapped = cart.items.filter((item) => item.product).map(toCartItem);
  set({
    cart: {
      items: mapped,
      couponCode: cart.couponCode ?? '',
      coupon: cart.coupon ?? null,
      notice: cart.notice ?? null,
      discount: cart.summary.discount,
      summary: cart.summary,
    },
    items: mapped,
    couponCode: cart.couponCode ?? '',
    couponDiscount: cart.summary.couponDiscount ?? cart.coupon?.discount ?? 0,
    couponMessage: cart.notice?.message ?? '',
    couponMessageType: cart.notice?.type ?? null,
  });
}

export const useCartStore = create<CartStore>()((set, get) => ({
  cart: emptyCart(),
  items: [],
  couponCode: '',
  couponDiscount: 0,
  couponMessage: '',
  couponMessageType: null,
  isLoading: false,
  isCouponLoading: false,
  initialized: false,
  guestToken: '',

  async initialize() {
    if (get().initialized) {
      return;
    }

    set({ isLoading: true });
    try {
      const guestToken = ensureGuestToken(get().guestToken, set);
      if (useAuthStore.getState().isAuthenticated) {
        await get().syncAfterAuth();
      } else {
        const cart = await cartService.getCart(guestToken);
        applyCartState(set, cart);
      }
      set({ initialized: true, isLoading: false });
    } catch {
      set({ initialized: true, isLoading: false });
    }
  },

  async refresh() {
    const guestToken = ensureGuestToken(get().guestToken, set);
    const cart = await cartService.getCart(guestToken);
    applyCartState(set, cart);
  },

  async syncAfterAuth() {
    const guestToken = ensureGuestToken(get().guestToken, set);
    const cart = await cartService.mergeCart(guestToken);
    applyCartState(set, cart);
  },

  async addItem(product, quantity = 1, selectedColor, selectedSize) {
    set({ isLoading: true });
    try {
      const guestToken = ensureGuestToken(get().guestToken, set);
      const cart = await cartService.addItem(guestToken, selectionToPayload(product, quantity, selectedColor, selectedSize));
      applyCartState(set, cart);
    } finally {
      set({ isLoading: false, initialized: true });
    }
  },

  async removeItem(itemId) {
    set({ isLoading: true });
    try {
      const guestToken = ensureGuestToken(get().guestToken, set);
      const cart = await cartService.removeItem(guestToken, itemId);
      applyCartState(set, cart);
    } finally {
      set({ isLoading: false });
    }
  },

  async updateQuantity(itemId, quantity) {
    if (quantity <= 0) {
      await get().removeItem(itemId);
      return;
    }

    set({ isLoading: true });
    try {
      const guestToken = ensureGuestToken(get().guestToken, set);
      const cart = await cartService.updateItem(guestToken, itemId, quantity);
      applyCartState(set, cart);
    } finally {
      set({ isLoading: false });
    }
  },

  async clearCart() {
    set({ isLoading: true });
    try {
      const guestToken = ensureGuestToken(get().guestToken, set);
      const cart = await cartService.clearCart(guestToken);
      applyCartState(set, cart);
    } finally {
      set({ isLoading: false });
    }
  },

  async applyCoupon(code) {
    const normalizedCode = code.trim();
    set({ couponCode: normalizedCode });
    const currentCode = normalizedCode || get().couponCode.trim();
    const finalCode = currentCode.trim();
    if (!finalCode) {
      set({ couponMessage: '', couponMessageType: null });
      return false;
    }

    set({ isCouponLoading: true });
    try {
      const guestToken = ensureGuestToken(get().guestToken, set);
      const cart = await cartService.applyCoupon(guestToken, finalCode);
      applyCartState(set, cart);
      return true;
    } catch (error) {
      const appError = toAppError(error);
      set({ couponMessage: appError.message, couponMessageType: 'error' });
      return false;
    } finally {
      set({ isCouponLoading: false, initialized: true });
    }
  },

  async removeCoupon() {
    set({ isCouponLoading: true });
    try {
      const guestToken = ensureGuestToken(get().guestToken, set);
      const cart = await cartService.removeCoupon(guestToken);
      applyCartState(set, cart);
    } finally {
      set({ isCouponLoading: false, initialized: true });
    }
  },

  getItemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
  getSubtotal: () => get().cart.summary?.subtotal ?? 0,
  getShipping: () => get().cart.summary?.shipping ?? 0,
  getTax: () => get().cart.summary?.estimatedTax ?? 0,
  getTotal: () => get().cart.summary?.total ?? 0,
}));
