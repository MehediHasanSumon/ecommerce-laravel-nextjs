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
  };
};

type MePayload = {
  success?: boolean;
  data?: {
    user?: {
      permissions?: string[];
    };
  };
};

const permissionRouteRequirements: Array<{ route: string; permission: string }> = [
  { route: routePaths.adminUsers, permission: "can_view_user" },
  { route: routePaths.adminRoles, permission: "can_view_role" },
  { route: routePaths.adminPermissions, permission: "can_view_permission" },
  { route: routePaths.adminOrders, permission: "can_view_order" },
  { route: routePaths.adminProducts, permission: "can_view_product" },
  { route: routePaths.adminBrands, permission: "can_view_brand" },
  { route: routePaths.adminCategories, permission: "can_view_category" },
  { route: routePaths.adminAttributes, permission: "can_view_attribute" },
  { route: routePaths.adminAttributeValues, permission: "can_view_attribute_value" },
  { route: routePaths.adminTags, permission: "can_view_tag" },
  { route: routePaths.adminReviews, permission: "can_view_review" },
  { route: routePaths.adminCollections, permission: "can_view_collection" },
  { route: routePaths.adminCurrencies, permission: "can_view_currency" },
  { route: routePaths.adminDiscounts, permission: "can_view_discount" },
  { route: routePaths.adminWarehouses, permission: "can_view_warehouse" },
  { route: routePaths.adminSettingsShippingZones, permission: "can_view_shipping_zone" },
  { route: routePaths.adminSettingsShippingMethods, permission: "can_view_shipping_method" },
  { route: routePaths.adminBlogs, permission: "can_view_blog" },
  { route: routePaths.adminContactMessages, permission: "can_view_contact_message" },
];

function requiredPermissionForPath(pathname: string) {
  if (pathname === routePaths.adminProductCreate) {
    return "can_create_product";
  }

  if (/^\/admin\/products\/[^/]+\/edit$/.test(pathname)) {
    return "can_edit_product";
  }

  if (pathname === `${routePaths.adminCollections}/create`) {
    return "can_create_collection";
  }

  if (/^\/admin\/collections\/[^/]+\/edit$/.test(pathname)) {
    return "can_edit_collection";
  }

  return permissionRouteRequirements.find(({ route }) => isRoute(pathname, [route]))?.permission ?? null;
}

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

function appendSetCookies(source: Response, target: NextResponse) {
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
    return { session: payload.data ?? null, response };
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

async function userHasPermission(request: NextRequest, permission: string) {
  try {
    const response = await fetch(`${apiBaseUrl}/me`, {
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

    const payload = await response.json() as MePayload;
    return Boolean(payload.data?.user?.permissions?.includes(permission));
  } catch {
    return false;
  }
}

async function authenticate(request: NextRequest) {
  const result = await getSession(request);
  const session = result?.session ?? null;

  return {
    authenticated: Boolean(session?.authenticated && session.has_access_token),
    sessionResponse: result?.response ?? null,
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

  const { authenticated, sessionResponse } = await authenticate(request);

  if (protectedRoute && !authenticated) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = routePaths.login;
    loginUrl.searchParams.set("redirect", safeRedirectTarget(request));
    return NextResponse.redirect(loginUrl);
  }

  const requiredPermission = requiredPermissionForPath(pathname);

  if (protectedRoute && requiredPermission && !await userHasPermission(request, requiredPermission)) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = routePaths.home;
    homeUrl.search = "";
    const response = NextResponse.redirect(homeUrl);
    if (sessionResponse) {
      appendSetCookies(sessionResponse, response);
    }
    return response;
  }

  if (publicAuthRoute && authenticated) {
    const dashboardUrl = request.nextUrl.clone();
    const redirectTarget = safePublicAuthRedirectTarget(request);
    dashboardUrl.pathname = redirectTarget.split("?")[0] || routePaths.account;
    dashboardUrl.search = redirectTarget.includes("?") ? redirectTarget.slice(redirectTarget.indexOf("?")) : "";
    const response = NextResponse.redirect(dashboardUrl);
    if (sessionResponse) {
      appendSetCookies(sessionResponse, response);
    }
    return response;
  }

  const response = NextResponse.next();
  if (sessionResponse) {
    appendSetCookies(sessionResponse, response);
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
