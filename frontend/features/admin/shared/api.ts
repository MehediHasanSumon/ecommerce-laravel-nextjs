"use client";

import { createAuthAwareClient } from "@/lib/api-client";
import type { AxiosInstance } from "axios";
import type { ApiEnvelope, QueryState } from "@/features/admin/shared/types";

export function cleanParams(query: Partial<QueryState>) {
  return Object.fromEntries(
    Object.entries(query).filter(([, value]) => value !== undefined && value !== ""),
  );
}

export class AdminApiService {
  protected readonly client: AxiosInstance;

  constructor() {
    this.client = createAuthAwareClient({
      baseURL: (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/auth").replace(/\/auth\/?$/, ""),
      refreshPath: "/auth/refresh",
    });
  }

  protected async unwrap<T>(request: Promise<{ data: ApiEnvelope<T> }>) {
    const response = await request;
    return response.data;
  }
}
