"use client";

import { create } from "zustand";
import { accountService, type AccountNotification } from "@/services/account-service";

type NotificationStatus = "all" | "read" | "unread";

type NotificationState = {
  items: AccountNotification[];
  unreadCount: number;
  isLoading: boolean;
  isLoaded: boolean;
  loadedKey: string | null;
  error: string | null;
  fetchNotifications: (params?: { page?: number; per_page?: number; search?: string; status?: NotificationStatus; type?: string; force?: boolean }) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  receiveRealtime: (notification: AccountNotification) => void;
  markRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
  bulkDelete: (ids: number[]) => Promise<void>;
  reset: () => void;
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
  items: [],
  unreadCount: 0,
  isLoading: false,
  isLoaded: false,
  loadedKey: null,
  error: null,

  async fetchNotifications(params) {
    const { force, ...query } = params ?? {};
    const loadedKey = JSON.stringify(query);
    if (get().isLoaded && get().loadedKey === loadedKey && !force) return;

    set({ isLoading: true, error: null });
    try {
      const data = await accountService.notifications(params);
      set({ items: data.items, unreadCount: data.unreadCount, isLoading: false, isLoaded: true, loadedKey });
    } catch (error) {
      set({ isLoading: false, error: error instanceof Error ? error.message : "Could not load notifications." });
    }
  },

  async fetchUnreadCount() {
    try {
      set({ unreadCount: await accountService.unreadNotificationCount() });
    } catch {
      set({ unreadCount: 0 });
    }
  },

  receiveRealtime(notification) {
    set((state) => {
      if (state.items.some((item) => item.id === notification.id)) return state;
      return {
        items: [notification, ...state.items].slice(0, 20),
        unreadCount: notification.read ? state.unreadCount : state.unreadCount + 1,
        isLoaded: true,
      };
    });
  },

  async markRead(id) {
    const previous = get();
    const target = previous.items.find((item) => item.id === id);
    if (!target || target.read) return;

    set((state) => ({
      items: state.items.map((item) => item.id === id ? { ...item, read: true, readAt: new Date().toISOString() } : item),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));

    try {
      const data = await accountService.markNotificationRead(id);
      set((state) => ({
        items: state.items.map((item) => item.id === id ? data.notification : item),
        unreadCount: data.unreadCount,
      }));
    } catch {
      set({ items: previous.items, unreadCount: previous.unreadCount });
    }
  },

  async markAllRead() {
    const previous = get();
    set((state) => ({
      items: state.items.map((item) => ({ ...item, read: true, readAt: item.readAt ?? new Date().toISOString() })),
      unreadCount: 0,
    }));
    try {
      await accountService.markNotificationsRead();
    } catch {
      set({ items: previous.items, unreadCount: previous.unreadCount });
    }
  },

  async deleteNotification(id) {
    const previous = get();
    set((state) => {
      const deleted = state.items.find((item) => item.id === id);
      return {
        items: state.items.filter((item) => item.id !== id),
        unreadCount: deleted && !deleted.read ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
      };
    });
    try {
      await accountService.deleteNotification(id);
    } catch {
      set({ items: previous.items, unreadCount: previous.unreadCount });
    }
  },

  async bulkDelete(ids) {
    const previous = get();
    set((state) => ({ items: state.items.filter((item) => !ids.includes(item.id)) }));
    try {
      const data = await accountService.bulkDeleteNotifications(ids);
      set({ unreadCount: data.unreadCount });
    } catch {
      set({ items: previous.items, unreadCount: previous.unreadCount });
    }
  },

  reset() {
    set({ items: [], unreadCount: 0, isLoading: false, isLoaded: false, loadedKey: null, error: null });
  },
}));
