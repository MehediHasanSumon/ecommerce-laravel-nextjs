import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { protectedRoutes, publicAuthRoutes, routePaths } from "@/constants/routes";

const apiBaseUrl =
  process.env.AUTH_PROXY_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8000/api/auth";
const apiRootUrl = apiBaseUrl.replace(/\/auth\/?$/, "");

type SessionPayload = {
  success?: boolean;
  data?: {
    authenticated?: boolean;
    has_access_token?: boolean;
    has_refresh_token?: boolean;
  };
};

function isRoute(pathname: string, routes: readonly string[]) {
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function safeRedirectTarget(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const search = request.nextUrl.search;
  const target = `${pathname}${search}`;
  return target.startsWith("/") && !target.startsWith("//")
    ? target
    : routePaths.account;
}

function safePublicAuthRedirectTarget(request: NextRequest) {
  const target = request.nextUrl.searchParams.get("redirect");

  if (!target || !target.startsWith("/") || target.startsWith("//")) {
    return routePaths.account;
  }

  try {
    const url = new URL(target, "http://local.test");
    const redirectTarget = `${url.pathname}${url.search}`;
    return isRoute(url.pathname, publicAuthRoutes) ? routePaths.account : redirectTarget;
  } catch {
    return routePaths.account;
  }
}

function appendRefreshCookies(source: Response, target: NextResponse) {
  const headersWithCookies = source.headers as Headers & {
    getSetCookie?: () => string[];
  };
  const cookies =
    headersWithCookies.getSetCookie?.() ??
    (source.headers.get("set-cookie") ? [source.headers.get("set-cookie") as string] : []);

  cookies.forEach((cookie) => {
    target.headers.append("set-cookie", cookie);
  });
}

async function getSession(request: NextRequest) {
  try {
    const response = await fetch(`${apiBaseUrl}/session`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Cookie: request.headers.get("cookie") ?? "",
        "X-Requested-With": "XMLHttpRequest",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as SessionPayload;
    return payload.data ?? null;
  } catch {
    return null;
  }
}

async function refreshSession(request: NextRequest) {
  try {
    const response = await fetch(`${apiBaseUrl}/refresh`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Cookie: request.headers.get("cookie") ?? "",
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      cache: "no-store",
    });

    return response.ok ? response : null;
  } catch {
    return null;
  }
}

async function isBlogEnabled(request: NextRequest) {
  try {
    const response = await fetch(`${apiRootUrl}/settings/navigation`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Cookie: request.headers.get("cookie") ?? "",
        "X-Requested-With": "XMLHttpRequest",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return false;
    }

    const payload = await response.json() as { data?: { module_settings?: Record<string, boolean> } };
    return Boolean(payload.data?.module_settings?.blog);
  } catch {
    return false;
  }
}

async function authenticate(request: NextRequest) {
  const session = await getSession(request);

  if (!session?.authenticated) {
    return { authenticated: false, refreshResponse: null };
  }

  if (session.has_access_token) {
    return { authenticated: true, refreshResponse: null };
  }

  if (!session.has_refresh_token) {
    return { authenticated: false, refreshResponse: null };
  }

  const refreshResponse = await refreshSession(request);
  return {
    authenticated: Boolean(refreshResponse),
    refreshResponse,
  };
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const blogRoute = pathname === "/blogs" || pathname.startsWith("/blogs/");

  if (blogRoute && !await isBlogEnabled(request)) {
    const notFoundUrl = request.nextUrl.clone();
    notFoundUrl.pathname = "/not-found";
    notFoundUrl.search = "";
    return NextResponse.rewrite(notFoundUrl, { status: 404 });
  }

  const protectedRoute = isRoute(pathname, protectedRoutes);
  const publicAuthRoute = isRoute(pathname, publicAuthRoutes);

  if (!protectedRoute && !publicAuthRoute) {
    return NextResponse.next();
  }

  const { authenticated, refreshResponse } = await authenticate(request);

  if (protectedRoute && !authenticated) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = routePaths.login;
    loginUrl.searchParams.set("redirect", safeRedirectTarget(request));
    return NextResponse.redirect(loginUrl);
  }

  if (publicAuthRoute && authenticated) {
    const dashboardUrl = request.nextUrl.clone();
    const redirectTarget = safePublicAuthRedirectTarget(request);
    dashboardUrl.pathname = redirectTarget.split("?")[0] || routePaths.account;
    dashboardUrl.search = redirectTarget.includes("?") ? redirectTarget.slice(redirectTarget.indexOf("?")) : "";
    const response = NextResponse.redirect(dashboardUrl);
    if (refreshResponse) {
      appendRefreshCookies(refreshResponse, response);
    }
    return response;
  }

  const response = NextResponse.next();
  if (refreshResponse) {
    appendRefreshCookies(refreshResponse, response);
  }
  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/account/:path*",
    "/wishlist/:path*",
    "/checkout/:path*",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/blogs/:path*",
  ],
};
