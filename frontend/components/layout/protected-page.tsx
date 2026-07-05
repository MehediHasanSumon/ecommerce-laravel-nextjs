"use client";

import type { ReactNode } from "react";
import { PageLoader } from "@/components/ui/skeleton";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { useRequireUser } from "@/hooks/use-require-user";

export function ProtectedPage({ children }: { children: ReactNode }) {
  const { user, isLoading } = useRequireUser();

  if (isLoading || !user) {
    return <PageLoader />;
  }

  return <DashboardShell user={user}>{children}</DashboardShell>;
}
