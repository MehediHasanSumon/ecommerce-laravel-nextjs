'use client';
import { create } from 'zustand';

interface UIStore {
  isMobileMenuOpen: boolean;
  isSearchOpen: boolean;
  isCartDrawerOpen: boolean;
  isWishlistDrawerOpen: boolean;
  isQuickViewOpen: boolean;
  quickViewProductId: string | null;
  setMobileMenuOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  setCartDrawerOpen: (open: boolean) => void;
  setWishlistDrawerOpen: (open: boolean) => void;
  openQuickView: (productId: string) => void;
  closeQuickView: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  isMobileMenuOpen: false,
  isSearchOpen: false,
  isCartDrawerOpen: false,
  isWishlistDrawerOpen: false,
  isQuickViewOpen: false,
  quickViewProductId: null,

  setMobileMenuOpen: (open) => set({ isMobileMenuOpen: open }),
  setSearchOpen: (open) => set({ isSearchOpen: open }),
  setCartDrawerOpen: (open) => set({ isCartDrawerOpen: open }),
  setWishlistDrawerOpen: (open) => set({ isWishlistDrawerOpen: open }),
  openQuickView: (productId) => set({ isQuickViewOpen: true, quickViewProductId: productId }),
  closeQuickView: () => set({ isQuickViewOpen: false, quickViewProductId: null }),
}));
