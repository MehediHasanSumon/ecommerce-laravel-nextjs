"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { toAppError } from "@/lib/errors";
import type { ApiEnvelope, PaginationMeta, QueryState } from "@/features/admin/shared/types";

export function useManagementList<TData, TItem>({
  query,
  selectItems,
  fetcher,
}: {
  query: QueryState;
  fetcher: (query: Partial<QueryState>) => Promise<ApiEnvelope<TData>>;
  selectItems: (data: TData) => TItem[];
}) {
  const [data, setData] = useState<TData | null>(null);
  const [items, setItems] = useState<TItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setIsFetching(true);
    try {
      const response = await fetcher(query);
      setData(response.data);
      setItems(selectItems(response.data));
      setPagination(response.meta.pagination ?? null);
    } catch (error) {
      const message = toAppError(error).message;
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  }, [fetcher, query, selectItems]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, items, pagination, isLoading, isFetching, error, reload: load };
}
