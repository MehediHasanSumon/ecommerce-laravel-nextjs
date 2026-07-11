"use client";

import { useEffect } from "react";
import { getReverbClient } from "@/lib/reverb-client";
import { useAuthStore } from "@/store/auth-store";
import { useNotificationStore } from "@/store/notification-store";
import type { AccountNotification } from "@/services/account-service";

export function RealtimeNotifications() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const fetchNotifications = useNotificationStore((state) => state.fetchNotifications);
  const receiveRealtime = useNotificationStore((state) => state.receiveRealtime);
  const reset = useNotificationStore((state) => state.reset);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      reset();
      return;
    }

    void fetchNotifications({ per_page: 10, force: true });
    const echo = getReverbClient();
    const channel = echo?.private(`user.${user.id}`);
    channel?.listen(".notification.created", (notification: AccountNotification) => receiveRealtime(notification));

    return () => {
      echo?.leave(`user.${user.id}`);
    };
  }, [fetchNotifications, isAuthenticated, receiveRealtime, reset, user]);

  return null;
}
