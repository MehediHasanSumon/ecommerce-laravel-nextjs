"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { routePaths } from "@/constants/routes";
import { useAuthStore } from "@/store/auth-store";

export function useRequireUser() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, fetchCurrentUser } = useAuthStore();

  useEffect(() => {
    let active = true;

    async function load() {
      const currentUser = await fetchCurrentUser();
      if (active && !currentUser) {
        router.replace(routePaths.login);
      }
    }

    if (!isAuthenticated && !user) {
      void load();
    }

    return () => {
      active = false;
    };
  }, [fetchCurrentUser, isAuthenticated, router, user]);

  return { user, isLoading };
}
