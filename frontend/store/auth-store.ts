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

const AUTH_LOGOUT_EVENT_KEY = "luxecart-auth-logout";
const AUTH_USER_CACHE_KEY = "luxecart-auth-user";
const AUTH_INVALIDATED_EVENT_KEY = "luxecart-auth-invalidated";

let currentUserPromise: Promise<User | null> | null = null;

function broadcastLogout() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUTH_LOGOUT_EVENT_KEY, String(Date.now()));
}

type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  initialized: boolean;
  error: string | null;
  login: (payload: LoginPayload) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => Promise<void>;
  forgotPassword: (payload: ForgotPasswordPayload) => Promise<string>;
  resetPassword: (payload: ResetPasswordPayload) => Promise<string>;
  fetchCurrentUser: () => Promise<User | null>;
  setUser: (user: User | null) => void;
  clearError: () => void;
};

function messageFrom(error: unknown) {
  return toAppError(error).message;
}

function normalizeUser(user: User): User {
  return {
    ...user,
    roles: Array.isArray(user.roles) ? user.roles : [],
    permissions: Array.isArray(user.permissions) ? user.permissions : [],
  };
}

function readCachedUser(): User | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(AUTH_USER_CACHE_KEY);
    return raw ? normalizeUser(JSON.parse(raw) as User) : null;
  } catch {
    window.sessionStorage.removeItem(AUTH_USER_CACHE_KEY);
    return null;
  }
}

function writeCachedUser(user: User | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (user) {
    window.sessionStorage.setItem(AUTH_USER_CACHE_KEY, JSON.stringify(normalizeUser(user)));
    return;
  }

  window.sessionStorage.removeItem(AUTH_USER_CACHE_KEY);
}

const cachedUser = readCachedUser();

export const useAuthStore = create<AuthState>((set) => ({
  user: cachedUser,
  isAuthenticated: Boolean(cachedUser),
  isLoading: false,
  initialized: false,
  error: null,

  async login(payload) {
    set({ isLoading: true, error: null });
    try {
      await useCartStore.getState().resetAfterLogout();
      const user = await authService.login(payload);
      writeCachedUser(user);
      set({ user, isAuthenticated: true });
      await Promise.all([
        useCartStore.getState().syncAfterAuth().catch(() => undefined),
        useWishlistStore.getState().syncAfterAuth().catch(() => undefined),
      ]);
      set({ user, isAuthenticated: true, isLoading: false, initialized: true });
      return user;
    } catch (error) {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        initialized: true,
        error: messageFrom(error),
      });
      throw error;
    }
  },

  async register(payload) {
    set({ isLoading: true, error: null });
    try {
      await useCartStore.getState().resetAfterLogout();
      const user = await authService.register(payload);
      writeCachedUser(user);
      set({ user, isAuthenticated: true });
      await Promise.all([
        useCartStore.getState().syncAfterAuth().catch(() => undefined),
        useWishlistStore.getState().syncAfterAuth().catch(() => undefined),
      ]);
      set({ user, isAuthenticated: true, isLoading: false, initialized: true });
      return user;
    } catch (error) {
      set({ isLoading: false, initialized: true, error: messageFrom(error) });
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
      writeCachedUser(null);
      set({ user: null, isAuthenticated: false, isLoading: false, initialized: true });
      await useCartStore.getState().resetAfterLogout({ reloadGuest: true });
      broadcastLogout();
    }
  },

  async forgotPassword(payload) {
    set({ isLoading: true, error: null });
    try {
      const message = await authService.forgotPassword(payload);
      set({ isLoading: false, initialized: true });
      return message;
    } catch (error) {
      set({ isLoading: false, initialized: true, error: messageFrom(error) });
      throw error;
    }
  },

  async resetPassword(payload) {
    set({ isLoading: true, error: null });
    try {
      const message = await authService.resetPassword(payload);
      writeCachedUser(null);
      set({ user: null, isAuthenticated: false, isLoading: false, initialized: true });
      return message;
    } catch (error) {
      set({ isLoading: false, initialized: true, error: messageFrom(error) });
      throw error;
    }
  },

  async fetchCurrentUser() {
    if (currentUserPromise) {
      return currentUserPromise;
    }

    set({ isLoading: true, error: null });

    currentUserPromise = (async () => {
      const session = await authService.session();

      if (!session.authenticated) {
        writeCachedUser(null);
        set({ user: null, isAuthenticated: false, isLoading: false, initialized: true });
        await useCartStore.getState().resetAfterLogout({ reloadGuest: true });
        return null;
      }

      const user = await authService.me();
      writeCachedUser(user);
      set({ user, isAuthenticated: true });
      await Promise.all([
        useCartStore.getState().syncAfterAuth().catch(() => undefined),
        useWishlistStore.getState().syncAfterAuth().catch(() => undefined),
      ]);
      set({ user, isAuthenticated: true, isLoading: false, initialized: true });
      return user;
    })();

    try {
      return await currentUserPromise;
    } catch (error) {
      const appError = toAppError(error);
      writeCachedUser(null);
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        initialized: true,
        error:
          appError.status === 401 || appError.status === 403 ? null : appError.message,
      });

      if (appError.status === 401 || appError.status === 403) {
        await useCartStore.getState().resetAfterLogout({ reloadGuest: true });
        return null;
      }

      throw new AppError(appError.message, appError.status, appError.validationErrors);
    } finally {
      currentUserPromise = null;
    }
  },

  setUser(user) {
    writeCachedUser(user);
    set({
      user,
      isAuthenticated: Boolean(user),
      initialized: true,
      error: null,
    });
  },

  clearError() {
    set({ error: null });
  },
}));

if (typeof window !== "undefined") {
  function clearAuthenticatedState() {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      initialized: true,
      error: null,
    });
    writeCachedUser(null);
    void useCartStore.getState().resetAfterLogout({ reloadGuest: true });
  }

  window.addEventListener("storage", (event) => {
    if (event.key !== AUTH_LOGOUT_EVENT_KEY || !event.newValue) {
      return;
    }

    clearAuthenticatedState();
  });

  window.addEventListener(AUTH_INVALIDATED_EVENT_KEY, () => {
    clearAuthenticatedState();
  });
}
