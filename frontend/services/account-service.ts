"use client";

import { createAuthAwareClient } from "@/lib/api-client";
import type { ApiEnvelope, PaginationMeta } from "@/features/admin/shared/types";
import type { OrderListItem } from "@/services/order-service";
import type { Product } from "@/types";

const apiBaseUrl = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/auth"
).replace(/\/auth\/?$/, "");

const client = createAuthAwareClient({ baseURL: apiBaseUrl, refreshPath: "/auth/refresh" });

export type AccountProfile = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  avatar?: string | null;
  memberSince?: string | null;
  membershipLevel?: string | null;
  profileCompletion?: number | null;
};

export type AccountDashboard = {
  profile: AccountProfile;
  stats: {
    totalOrders: number;
    wishlistCount: number;
    cartItems: number;
    totalSpent: number;
    unreadNotifications: number;
    reviewsCount: number;
  };
  recentOrders: OrderListItem[];
  suggestedProducts: Product[];
};

export type AccountNotification = {
  id: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt?: string | null;
};

export type AccountReview = {
  id: number;
  rating: number;
  comment: string;
  verified: boolean;
  status: string;
  createdAt?: string | null;
  replies?: Array<{ id: string; author: string; comment: string; createdAt?: string | null }>;
  product: Product | null;
};

export type AccountSettings = {
  email_notifications: boolean;
  order_updates: boolean;
  promotional_notifications: boolean;
  account_notifications: boolean;
  review_requests: boolean;
  newsletter: boolean;
  sms_notifications: boolean;
  product_recommendations: boolean;
};

export const accountService = {
  async dashboard() {
    const response = await client.get<ApiEnvelope<AccountDashboard>>("/account/dashboard");
    return response.data.data;
  },

  async profile() {
    const response = await client.get<ApiEnvelope<{ profile: AccountProfile }>>("/account/profile");
    return response.data.data.profile;
  },

  async updateProfile(payload: { name: string; email: string; phone?: string; date_of_birth?: string; gender?: string }) {
    const response = await client.put<ApiEnvelope<{ profile: AccountProfile }>>("/account/profile", payload);
    return response.data.data.profile;
  },

  async uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append("avatar", file);
    const response = await client.post<ApiEnvelope<{ profile: AccountProfile }>>("/account/profile/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data.data.profile;
  },

  async changePassword(payload: { current_password: string; password: string; password_confirmation: string }) {
    await client.put<ApiEnvelope<Record<string, never>>>("/account/password", payload);
  },

  async settings() {
    const response = await client.get<ApiEnvelope<{ settings: AccountSettings }>>("/account/settings");
    return response.data.data.settings;
  },

  async updateSettings(payload: AccountSettings) {
    const response = await client.put<ApiEnvelope<{ settings: AccountSettings }>>("/account/settings", payload);
    return response.data.data.settings;
  },

  async notifications() {
    const response = await client.get<ApiEnvelope<{ items: AccountNotification[]; unreadCount: number }>>("/account/notifications");
    return response.data.data;
  },

  async markNotificationsRead() {
    await client.post<ApiEnvelope<Record<string, never>>>("/account/notifications/mark-read");
  },

  async deleteNotification(id: number) {
    await client.delete<ApiEnvelope<Record<string, never>>>(`/account/notifications/${id}`);
  },

  async reviews() {
    const response = await client.get<ApiEnvelope<{ items: AccountReview[] }> & { meta: { pagination?: PaginationMeta } }>("/account/reviews");
    return response.data.data.items;
  },

  async updateReview(id: number, payload: { rating: number; comment: string }) {
    const response = await client.put<ApiEnvelope<{ review: AccountReview }>>(`/account/reviews/${id}`, payload);
    return response.data.data.review;
  },

  async deleteReview(id: number) {
    await client.delete<ApiEnvelope<Record<string, never>>>(`/account/reviews/${id}`);
  },
};
