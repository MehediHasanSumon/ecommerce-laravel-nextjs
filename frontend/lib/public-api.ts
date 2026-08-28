import "server-only";

import type { HomePageSections } from "@/services/catalog-service";
import type { RuntimeSettings } from "@/types/settings";

type ApiEnvelope<T> = {
  data: T;
};

const apiBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8000/api/auth"
).replace(/\/auth\/?$/, "");

async function fetchPublicData<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as ApiEnvelope<T>;
    return payload.data;
  } catch {
    return null;
  }
}

export function getRuntimeSettings() {
  return fetchPublicData<RuntimeSettings>("/settings/navigation");
}

export function getHomePageSections() {
  return fetchPublicData<HomePageSections>("/home-page");
}
