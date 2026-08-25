'use client';

import { create } from 'zustand';
import type { Product, WishlistItem } from '@/types';
import { wishlistService, type WishlistApiResponse } from '@/services/wishlist-service';
import { useAuthStore } from '@/store/auth-store';

const GUEST_TOKEN_KEY = 'guest-token';

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

function ensureGuestToken(stateToken: string, set: (partial: Partial<WishlistStore>) => void) {
  const token = stateToken && stateToken !== 'server-guest-token' ? stateToken : browserGuestToken();
  if (token !== stateToken) {
    set({ guestToken: token });
  }

  return token;
}

function toWishlistItem(item: WishlistApiResponse['items'][number]): WishlistItem {
  return {
    id: item.id,
    productId: item.productId,
    product: item.product as Product,
    addedAt: item.addedAt,
    discountedPrice: item.discountedPrice,
    stockStatus: item.stockStatus,
  };
}

interface WishlistStore {
  items: WishlistItem[];
  isLoading: boolean;
  initialized: boolean;
  guestToken: string;
  initialize: () => Promise<void>;
  refresh: () => Promise<void>;
  syncAfterAuth: () => Promise<void>;
  addItem: (product: Product) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  toggleItem: (product: Product) => Promise<void>;
  clearWishlist: () => Promise<void>;
}

function applyWishlistState(set: (partial: Partial<WishlistStore>) => void, wishlist: WishlistApiResponse) {
  set({
    items: wishlist.items.filter((item) => item.product).map(toWishlistItem),
  });
}

export const useWishlistStore = create<WishlistStore>()((set, get) => ({
  items: [],
  isLoading: false,
  initialized: false,
  guestToken: '',

  async initialize() {
    if (get().initialized) {
      return;
    }

    set({ isLoading: true });
    try {
      if (useAuthStore.getState().isAuthenticated) {
        await get().syncAfterAuth();
      } else {
        set({ items: [] });
      }
      set({ initialized: true, isLoading: false });
    } catch {
      set({ initialized: true, isLoading: false });
    }
  },

  async refresh() {
    if (!useAuthStore.getState().isAuthenticated) {
      set({ items: [], initialized: true });
      return;
    }

    const guestToken = ensureGuestToken(get().guestToken, set);
    const wishlist = await wishlistService.getWishlist(guestToken);
    applyWishlistState(set, wishlist);
  },

  async syncAfterAuth() {
    set({ isLoading: true });
    try {
      const guestToken = ensureGuestToken(get().guestToken, set);
      const wishlist = await wishlistService.mergeWishlist(guestToken);
      applyWishlistState(set, wishlist);
    } finally {
      set({ initialized: true, isLoading: false });
    }
  },

  async addItem(product) {
    if (!useAuthStore.getState().isAuthenticated) {
      return;
    }

    set({ isLoading: true });
    try {
      const guestToken = ensureGuestToken(get().guestToken, set);
      const wishlist = await wishlistService.toggle(guestToken, Number(product.id));
      applyWishlistState(set, wishlist);
    } finally {
      set({ isLoading: false, initialized: true });
    }
  },

  async removeItem(itemId) {
    if (!useAuthStore.getState().isAuthenticated) {
      return;
    }

    set({ isLoading: true });
    try {
      const guestToken = ensureGuestToken(get().guestToken, set);
      const wishlist = await wishlistService.removeItem(guestToken, itemId);
      applyWishlistState(set, wishlist);
    } finally {
      set({ isLoading: false });
    }
  },

  isInWishlist: (productId) => get().items.some((item) => item.productId === productId),

  async toggleItem(product) {
    if (!useAuthStore.getState().isAuthenticated) {
      return;
    }

    set({ isLoading: true });
    try {
      const guestToken = ensureGuestToken(get().guestToken, set);
      const wishlist = await wishlistService.toggle(guestToken, Number(product.id));
      applyWishlistState(set, wishlist);
    } finally {
      set({ isLoading: false, initialized: true });
    }
  },

  async clearWishlist() {
    if (!useAuthStore.getState().isAuthenticated) {
      return;
    }

    set({ isLoading: true });
    try {
      const guestToken = ensureGuestToken(get().guestToken, set);
      const wishlist = await wishlistService.clearWishlist(guestToken);
      applyWishlistState(set, wishlist);
    } finally {
      set({ isLoading: false });
    }
  },
}));
