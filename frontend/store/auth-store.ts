"use client";

import { create } from "zustand";
import { authService } from "@/services/auth-service";
import type {
  ForgotPasswordPayload,
  LoginPayload,
  RegisterPayload,
  ResetPasswordPayload,
  User,
} from "@/types/auth";
import { AppError, toAppError } from "@/lib/errors";
import { useCartStore } from "@/store/cartStore";
import { useWishlistStore } from "@/store/wishlistStore";

type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (payload: LoginPayload) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => Promise<void>;
  forgotPassword: (payload: ForgotPasswordPayload) => Promise<string>;
  resetPassword: (payload: ResetPasswordPayload) => Promise<string>;
  fetchCurrentUser: () => Promise<User | null>;
  clearError: () => void;
};

function messageFrom(error: unknown) {
  return toAppError(error).message;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  async login(payload) {
    set({ isLoading: true, error: null });
    try {
      const user = await authService.login(payload);
      await Promise.all([
        useCartStore.getState().syncAfterAuth().catch(() => undefined),
        useWishlistStore.getState().syncAfterAuth().catch(() => undefined),
      ]);
      set({ user, isAuthenticated: true, isLoading: false });
      return user;
    } catch (error) {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: messageFrom(error),
      });
      throw error;
    }
  },

  async register(payload) {
    set({ isLoading: true, error: null });
    try {
      const user = await authService.register(payload);
      await Promise.all([
        useCartStore.getState().syncAfterAuth().catch(() => undefined),
        useWishlistStore.getState().syncAfterAuth().catch(() => undefined),
      ]);
      set({ user, isAuthenticated: true, isLoading: false });
      return user;
    } catch (error) {
      set({ isLoading: false, error: messageFrom(error) });
      throw error;
    }
  },

  async logout() {
    set({ isLoading: true, error: null });
    try {
      await authService.logout();
    } catch {
      // Local state must be cleared even if the server session already expired.
    } finally {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  async forgotPassword(payload) {
    set({ isLoading: true, error: null });
    try {
      const message = await authService.forgotPassword(payload);
      set({ isLoading: false });
      return message;
    } catch (error) {
      set({ isLoading: false, error: messageFrom(error) });
      throw error;
    }
  },

  async resetPassword(payload) {
    set({ isLoading: true, error: null });
    try {
      const message = await authService.resetPassword(payload);
      set({ user: null, isAuthenticated: false, isLoading: false });
      return message;
    } catch (error) {
      set({ isLoading: false, error: messageFrom(error) });
      throw error;
    }
  },

  async fetchCurrentUser() {
    set({ isLoading: true, error: null });
    try {
      const session = await authService.session();

      if (!session.authenticated) {
        set({ user: null, isAuthenticated: false, isLoading: false });
        return null;
      }

      const user = await authService.me();
      await Promise.all([
        useCartStore.getState().syncAfterAuth().catch(() => undefined),
        useWishlistStore.getState().syncAfterAuth().catch(() => undefined),
      ]);
      set({ user, isAuthenticated: true, isLoading: false });
      return user;
    } catch (error) {
      const appError = toAppError(error);
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error:
          appError.status === 401 || appError.status === 403 ? null : appError.message,
      });

      if (appError.status === 401 || appError.status === 403) {
        return null;
      }

      throw new AppError(appError.message, appError.status, appError.validationErrors);
    }
  },

  clearError() {
    set({ error: null });
  },
}));
