"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { QueryState } from "@/features/admin/shared/types";
import { defaultQueryState } from "@/features/admin/shared/utils";

function numberParam(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function useUrlQueryState(defaultSort = "created_at") {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const query = useMemo<QueryState>(() => ({
    ...defaultQueryState,
    sort: searchParams.get("sort") || defaultSort,
    page: numberParam(searchParams.get("page"), 1),
    per_page: numberParam(searchParams.get("per_page"), 10),
    search: searchParams.get("search") || "",
    direction: searchParams.get("direction") === "asc" ? "asc" : "desc",
    status: searchParams.get("status") || "",
    role: searchParams.get("role") || "",
    email_verified: searchParams.get("email_verified") || "",
    created_from: searchParams.get("created_from") || "",
    created_to: searchParams.get("created_to") || "",
    updated_from: searchParams.get("updated_from") || "",
    updated_to: searchParams.get("updated_to") || "",
    payment_status: searchParams.get("payment_status") || "",
    shipping_status: searchParams.get("shipping_status") || "",
    payment_method: searchParams.get("payment_method") || "",
    shipping_method: searchParams.get("shipping_method") || "",
    date_from: searchParams.get("date_from") || "",
    date_to: searchParams.get("date_to") || "",
    amount_min: searchParams.get("amount_min") || "",
    amount_max: searchParams.get("amount_max") || "",
    permission_search: searchParams.get("permission_search") || "",
  }), [defaultSort, searchParams]);

  const setQuery = useCallback((patch: Partial<QueryState>, options: { replace?: boolean } = {}) => {
    const next = { ...query, ...patch };
    const params = new URLSearchParams();

    Object.entries(next).forEach(([key, value]) => {
      if (value && value !== defaultQueryState[key as keyof QueryState]) {
        params.set(key, String(value));
      }
    });

    const url = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    if (options.replace) {
      router.replace(url, { scroll: false });
    } else {
      router.push(url, { scroll: false });
    }
  }, [pathname, query, router]);

  return { query, setQuery };
}
