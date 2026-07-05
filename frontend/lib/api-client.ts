"use client";

import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";
import { routePaths } from "@/constants/routes";

export type RetryConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  _skipRefresh?: boolean;
};

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/auth";
const csrfCookieUrl = process.env.NEXT_PUBLIC_CSRF_COOKIE_URL;

let csrfPromise: Promise<void> | null = null;

type AuthClientOptions = {
  baseURL: string;
  refreshPath?: string;
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

function redirectToLogin() {
  if (typeof window === "undefined") {
    return;
  }

  const path = window.location.pathname;
  if (path !== routePaths.login) {
    window.location.assign(`${routePaths.login}?session=expired`);
  }
}

export function createAuthAwareClient({
  baseURL,
  refreshPath = "/refresh",
}: AuthClientOptions): AxiosInstance {
  let refreshPromise: Promise<void> | null = null;

  const client = axios.create({
    baseURL,
    withCredentials: true,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  });

  client.interceptors.request.use(async (config) => {
    const method = config.method?.toUpperCase();
    if (method && ["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      await ensureCsrfCookie();
    }

    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const original = error.config as RetryConfig | undefined;
      const status = error.response?.status;

      if (
        !original ||
        original._skipRefresh ||
        original._retry ||
        ![401, 419].includes(status ?? 0)
      ) {
        return Promise.reject(error);
      }

      original._retry = true;

      if (!refreshPromise) {
        refreshPromise = client
          .post(refreshPath, undefined, { _skipRefresh: true } as RetryConfig)
          .then(() => undefined)
          .finally(() => {
            refreshPromise = null;
          });
      }

      try {
        await refreshPromise;
        return client(original);
      } catch (refreshError) {
        redirectToLogin();
        return Promise.reject(refreshError);
      }
    },
  );

  return client;
}

export const apiClient: AxiosInstance = createAuthAwareClient({ baseURL });
