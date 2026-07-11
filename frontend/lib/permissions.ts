"use client";

import { useAuthStore } from "@/store/auth-store";

export function hasPermission(permission: string): boolean {
  const { isAuthenticated, user } = useAuthStore.getState();

  return Boolean(isAuthenticated && user?.permissions.includes(permission));
}
