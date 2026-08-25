'use client';

import { create } from 'zustand';
import type { Cart, CartItem, Product } from '@/types';
import {
  cartService,
  type AddCartItemPayload,
  type CartApiResponse,
  type CartSessionMode,
} from '@/services/cart-service';
import { useAuthStore } from '@/store/auth-store';
import { firstValidationMessage, toAppError } from '@/lib/errors';

const GUEST_TOKEN_KEY = 'guest-token';
const CART_STORAGE_PREFIXES = ['cart', 'app-cart'];

let cartInitializePromise: Promise<void> | null = null;

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

function emptyCartState(): Pick<
  CartStore,
  'cart' | 'items' | 'couponCode' | 'couponDiscount' | 'couponMessage' | 'couponMessageType'
> {
  return {
    cart: emptyCart(),
    items: [],
    couponCode: '',
    couponDiscount: 0,
    couponMessage: '',
    couponMessageType: null,
  };
}

function activeCartMode(): CartSessionMode {
  return useAuthStore.getState().isAuthenticated ? 'authenticated' : 'guest';
}

function clearCartStorage() {
  if (typeof window === 'undefined') {
    return;
  }

  for (const storage of [window.localStorage, window.sessionStorage]) {
    for (let index = storage.length - 1; index >= 0; index -= 1) {
      const key = storage.key(index);
      if (!key || key === GUEST_TOKEN_KEY) {
        continue;
      }

      if (CART_STORAGE_PREFIXES.some((prefix) => key.toLowerCase().startsWith(prefix))) {
        storage.removeItem(key);
      }
    }
  }
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
  requestVersion: number;
  itemRequestVersions: Record<string, number>;
  initialize: () => Promise<void>;
  refresh: () => Promise<void>;
  syncAfterAuth: () => Promise<void>;
  resetAfterLogout: (options?: { reloadGuest?: boolean }) => Promise<void>;
  addItem: (
    product: AddItemInput,
    quantity?: number,
    selectedColor?: string,
    selectedSize?: string
  ) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  applyCoupon: (code: string, shippingMethodId?: number) => Promise<boolean>;
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

function applyOptimisticQuantity(
  set: (partial: Partial<CartStore>) => void,
  state: CartStore,
  itemId: string,
  quantity: number,
) {
  const item = state.items.find((cartItem) => cartItem.id === itemId);
  if (!item) {
    return;
  }

  const previousQuantity = item.quantity;
  const nextItems = state.items.map((cartItem) => {
    if (cartItem.id !== itemId) {
      return cartItem;
    }

    const unitPrice = cartItem.discountedPrice ?? cartItem.unitPrice ?? cartItem.product.price;

    return {
      ...cartItem,
      quantity,
      subtotal: unitPrice * quantity,
    };
  });

  const unitPrice = item.discountedPrice ?? item.unitPrice ?? item.product.price;
  const subtotalDelta = unitPrice * (quantity - previousQuantity);
  const summary = state.cart.summary
    ? {
        ...state.cart.summary,
        subtotal: Math.max(0, state.cart.summary.subtotal + subtotalDelta),
        total: Math.max(0, state.cart.summary.total + subtotalDelta),
      }
    : state.cart.summary;

  set({
    items: nextItems,
    cart: {
      ...state.cart,
      items: nextItems,
      summary,
    },
  });
}

export const useCartStore = create<CartStore>()((set, get) => ({
  ...emptyCartState(),
  isLoading: false,
  isCouponLoading: false,
  initialized: false,
  guestToken: '',
  requestVersion: 0,
  itemRequestVersions: {},

  async initialize() {
    if (get().initialized) {
      return;
    }

    if (cartInitializePromise) {
      return cartInitializePromise;
    }

    cartInitializePromise = (async () => {
      const requestVersion = get().requestVersion;
      set({ isLoading: true });
      try {
        const guestToken = ensureGuestToken(get().guestToken, set);
        if (activeCartMode() === 'authenticated') {
          await get().syncAfterAuth();
        } else {
          const cart = await cartService.getCart(guestToken, 'guest');
          if (get().requestVersion === requestVersion && activeCartMode() === 'guest') {
            applyCartState(set, cart);
          }
        }
        if (get().requestVersion === requestVersion) {
          set({ initialized: true, isLoading: false });
        }
      } catch {
        if (get().requestVersion === requestVersion) {
          set({ initialized: true, isLoading: false });
        }
      } finally {
        cartInitializePromise = null;
      }
    })();

    return cartInitializePromise;
  },

  async refresh() {
    const requestVersion = get().requestVersion;
    const guestToken = ensureGuestToken(get().guestToken, set);
    const mode = activeCartMode();
    const cart = await cartService.getCart(guestToken, mode);
    if (get().requestVersion === requestVersion && activeCartMode() === mode) {
      applyCartState(set, cart);
    }
  },

  async syncAfterAuth() {
    const requestVersion = get().requestVersion;
    const guestToken = ensureGuestToken(get().guestToken, set);
    set({ isLoading: true });
    try {
      const cart = await cartService.mergeCart(guestToken);
      if (get().requestVersion === requestVersion && activeCartMode() === 'authenticated') {
        applyCartState(set, cart);
      }
    } finally {
      if (get().requestVersion === requestVersion) {
        set({ initialized: true, isLoading: false });
      }
    }
  },

  async resetAfterLogout(options = {}) {
    const guestToken = ensureGuestToken(get().guestToken, set);
    clearCartStorage();
    set({
      ...emptyCartState(),
      guestToken,
      initialized: true,
      isLoading: false,
      isCouponLoading: false,
      requestVersion: get().requestVersion + 1,
    });

    if (!options.reloadGuest) {
      return;
    }

    const requestVersion = get().requestVersion;
    set({ isLoading: true });
    try {
      const cart = await cartService.getCart(guestToken, 'guest');
      if (get().requestVersion === requestVersion && activeCartMode() === 'guest') {
        applyCartState(set, cart);
      }
    } finally {
      if (get().requestVersion === requestVersion) {
        set({ isLoading: false, initialized: true });
      }
    }
  },

  async addItem(product, quantity = 1, selectedColor, selectedSize) {
    const requestVersion = get().requestVersion;
    set({ isLoading: true });
    try {
      const guestToken = ensureGuestToken(get().guestToken, set);
      const mode = activeCartMode();
      const cart = await cartService.addItem(guestToken, mode, selectionToPayload(product, quantity, selectedColor, selectedSize));
      if (get().requestVersion === requestVersion && activeCartMode() === mode) {
        applyCartState(set, cart);
      }
    } finally {
      if (get().requestVersion === requestVersion) {
        set({ isLoading: false, initialized: true });
      }
    }
  },

  async removeItem(itemId) {
    const requestVersion = get().requestVersion;
    const removedItem = get().items.find((item) => item.id === itemId);
    set({ isLoading: true });
    try {
      const guestToken = ensureGuestToken(get().guestToken, set);
      const mode = activeCartMode();
      const cart = await cartService.removeItem(guestToken, mode, itemId, removedItem ? {
        id: removedItem.id,
        productId: removedItem.productId,
        variantId: removedItem.variantId,
        quantity: removedItem.quantity,
        unitPrice: removedItem.unitPrice ?? removedItem.product.price,
        discountedPrice: removedItem.discountedPrice,
        subtotal: removedItem.subtotal ?? removedItem.product.price * removedItem.quantity,
        discountTotal: removedItem.discountTotal ?? 0,
        selectedVariant: removedItem.selectedVariant,
        selectedSize: removedItem.selectedSize,
        selectedColor: removedItem.selectedColor,
        selectedAttributes: removedItem.selectedAttributes ?? [],
        selectedOptions: removedItem.selectedOptions ?? {},
        selectedSku: removedItem.selectedSku,
        selectedImage: removedItem.selectedImage,
        pricing: {},
        tax: {},
        product: removedItem.product,
        availability: removedItem.availability ?? { inStock: true, stock: removedItem.product.stock },
      } : undefined);
      if (get().requestVersion === requestVersion && activeCartMode() === mode) {
        applyCartState(set, cart);
      }
    } finally {
      if (get().requestVersion === requestVersion) {
        set({ isLoading: false });
      }
    }
  },

  async updateQuantity(itemId, quantity) {
    if (quantity <= 0) {
      await get().removeItem(itemId);
      return;
    }

    const requestVersion = get().requestVersion;
    const itemRequestVersion = (get().itemRequestVersions[itemId] ?? 0) + 1;
    const previousCart = get().cart;
    const previousItems = get().items;

    applyOptimisticQuantity(set, get(), itemId, quantity);
    set({
      itemRequestVersions: {
        ...get().itemRequestVersions,
        [itemId]: itemRequestVersion,
      },
    });

    try {
      const guestToken = ensureGuestToken(get().guestToken, set);
      const mode = activeCartMode();
      const cart = await cartService.updateItem(guestToken, mode, itemId, quantity);
      if (
        get().requestVersion === requestVersion &&
        get().itemRequestVersions[itemId] === itemRequestVersion &&
        activeCartMode() === mode
      ) {
        applyCartState(set, cart);
      }
    } catch (error) {
      if (
        get().requestVersion === requestVersion &&
        get().itemRequestVersions[itemId] === itemRequestVersion
      ) {
        set({ cart: previousCart, items: previousItems });
      }
      throw error;
    } finally {
      if (
        get().requestVersion === requestVersion &&
        get().itemRequestVersions[itemId] === itemRequestVersion
      ) {
        set((state) => {
          const itemRequestVersions = { ...state.itemRequestVersions };
          delete itemRequestVersions[itemId];

          return { itemRequestVersions };
        });
      }
    }
  },

  async clearCart() {
    const requestVersion = get().requestVersion;
    set({ isLoading: true });
    try {
      const guestToken = ensureGuestToken(get().guestToken, set);
      const mode = activeCartMode();
      const cart = await cartService.clearCart(guestToken, mode);
      if (get().requestVersion === requestVersion && activeCartMode() === mode) {
        applyCartState(set, cart);
      }
    } finally {
      if (get().requestVersion === requestVersion) {
        set({ isLoading: false });
      }
    }
  },

  async applyCoupon(code, shippingMethodId) {
    const normalizedCode = code.trim();
    set({ couponCode: normalizedCode });
    const currentCode = normalizedCode || get().couponCode.trim();
    const finalCode = currentCode.trim();
    if (!finalCode) {
      set({ couponMessage: '', couponMessageType: null });
      return false;
    }

    const requestVersion = get().requestVersion;
    set({ isCouponLoading: true });
    try {
      const guestToken = ensureGuestToken(get().guestToken, set);
      const mode = activeCartMode();
      const cart = await cartService.applyCoupon(guestToken, mode, finalCode, shippingMethodId);
      if (get().requestVersion === requestVersion && activeCartMode() === mode) {
        applyCartState(set, cart);
      }
      return true;
    } catch (error) {
      const appError = toAppError(error);
      set({
        couponMessage: firstValidationMessage(appError.validationErrors) ?? appError.message,
        couponMessageType: 'error',
      });
      return false;
    } finally {
      if (get().requestVersion === requestVersion) {
        set({ isCouponLoading: false, initialized: true });
      }
    }
  },

  async removeCoupon() {
    const requestVersion = get().requestVersion;
    set({ isCouponLoading: true });
    try {
      const guestToken = ensureGuestToken(get().guestToken, set);
      const mode = activeCartMode();
      const cart = await cartService.removeCoupon(guestToken, mode);
      if (get().requestVersion === requestVersion && activeCartMode() === mode) {
        applyCartState(set, cart);
      }
    } finally {
      if (get().requestVersion === requestVersion) {
        set({ isCouponLoading: false, initialized: true });
      }
    }
  },

  getItemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
  getSubtotal: () => get().cart.summary?.subtotal ?? 0,
  getShipping: () => get().cart.summary?.shipping ?? 0,
  getTax: () => get().cart.summary?.estimatedTax ?? 0,
  getTotal: () => get().cart.summary?.total ?? 0,
}));
