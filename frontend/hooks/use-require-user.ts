"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { routePaths } from "@/constants/routes";
import { useAuthStore } from "@/store/auth-store";

export function useRequireUser() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, initialized, fetchCurrentUser } = useAuthStore();

  useEffect(() => {
    if (!initialized) {
      void fetchCurrentUser().catch(() => undefined);
    }
  }, [fetchCurrentUser, initialized]);

  useEffect(() => {
    if (initialized && !isLoading && !isAuthenticated && !user) {
      router.replace(routePaths.login);
    }
  }, [initialized, isAuthenticated, isLoading, router, user]);

  return { user, isLoading: isLoading || !initialized };
}
