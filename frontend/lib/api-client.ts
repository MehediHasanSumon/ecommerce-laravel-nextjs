"use client";

import axios, { type AxiosInstance } from "axios";
import { getMarketingConsent } from "@/lib/marketing-consent";

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/auth";
const csrfCookieUrl = process.env.NEXT_PUBLIC_CSRF_COOKIE_URL;
const authInvalidatedEvent = "auth-invalidated";

let csrfPromise: Promise<void> | null = null;

type AuthClientOptions = {
  baseURL: string;
};

async function ensureCsrfCookie() {
  if (!csrfCookieUrl || csrfPromise) {
    return csrfPromise;
  }

  csrfPromise = axios
    .get(csrfCookieUrl, {
      withCredentials: true,
      headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
    })
    .then(() => undefined)
    .catch(() => undefined)
    .finally(() => {
      csrfPromise = null;
    });

  return csrfPromise;
}

export function createAuthAwareClient({ baseURL }: AuthClientOptions): AxiosInstance {
  const client = axios.create({
    baseURL,
    withCredentials: true,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });

  client.interceptors.request.use(async (config) => {
    config.headers.set("X-Marketing-Consent", getMarketingConsent());
    const method = config.method?.toUpperCase();
    if (method && ["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      await ensureCsrfCookie();
    }

    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;

      if (typeof window !== "undefined" && (status === 401 || status === 419)) {
        window.dispatchEvent(new CustomEvent(authInvalidatedEvent));
      }

      return Promise.reject(error);
    },
  );

  return client;
}

export const apiClient: AxiosInstance = createAuthAwareClient({ baseURL });
