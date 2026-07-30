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
    user?: {
      permissions?: string[];
    } | null;
  };
};

type AdminNavigationPayload = {
  success?: boolean;
  data?: {
    navigation?: Array<{
      items?: Array<{
        href?: string;
      }>;
    }>;
  };
};

type AdminLandingResult =
  | { status: "accessible"; href: string }
  | { status: "forbidden" }
  | { status: "unauthenticated" };

const permissionRouteRequirements: Array<{ route: string; permission: string }> = [
  { route: routePaths.dashboard, permission: "can_view_dashboard" },
  { route: routePaths.adminUsers, permission: "can_view_user" },
  { route: routePaths.adminRoles, permission: "can_view_role" },
  { route: routePaths.adminPermissions, permission: "can_view_permission" },
  { route: routePaths.adminOrders, permission: "can_view_order" },
  { route: routePaths.adminShipments, permission: "can_view_courier_shipment" },
  { route: routePaths.adminCustomers, permission: "can_view_customer" },
  { route: routePaths.adminProducts, permission: "can_view_product" },
  { route: routePaths.adminBrands, permission: "can_view_brand" },
  { route: routePaths.adminCategories, permission: "can_view_category" },
  { route: routePaths.adminAttributes, permission: "can_view_attribute" },
  { route: routePaths.adminAttributeValues, permission: "can_view_attribute_value" },
  { route: routePaths.adminTags, permission: "can_view_tag" },
  { route: routePaths.adminReviews, permission: "can_view_review" },
  { route: routePaths.adminComments, permission: "can_view_comment" },
  { route: routePaths.adminCollections, permission: "can_view_collection" },
  { route: routePaths.adminCurrencies, permission: "can_view_currency" },
  { route: routePaths.adminDiscounts, permission: "can_view_discount" },
  { route: routePaths.adminSettingsShippingZones, permission: "can_view_shipping_zone" },
  { route: routePaths.adminSettingsShippingMethods, permission: "can_view_shipping_method" },
  { route: routePaths.adminSettingsCouriers, permission: "can_view_courier_setting" },
  { route: routePaths.adminSettingsCompany, permission: "can_view_company_setting" },
  { route: routePaths.adminSettingsHeroSection, permission: "can_view_hero_section" },
  { route: routePaths.adminSettingsHomePage, permission: "can_view_home_page_setting" },
  { route: routePaths.adminSettingsHomeFeatureCards, permission: "can_view_home_feature_card_setting" },
  { route: routePaths.adminSettingsBlog, permission: "can_view_blog_setting" },
  { route: routePaths.adminSettingsStore, permission: "can_view_store_setting" },
  { route: routePaths.adminSettingsPayment, permission: "can_view_payment_setting" },
  { route: routePaths.adminSettingsSeo, permission: "can_view_seo_setting" },
  { route: routePaths.adminSettingsSocial, permission: "can_view_social_setting" },
  { route: routePaths.adminSettingsSmsLogs, permission: "can_view_sms_log" },
  { route: routePaths.adminSettingsSms, permission: "can_view_sms_setting" },
  { route: routePaths.adminReportsSales, permission: "can_view_sales_report" },
  { route: routePaths.adminReportsRevenue, permission: "can_view_revenue_report" },
  { route: routePaths.adminReportsProductPerformance, permission: "can_view_product_performance_report" },
  { route: routePaths.adminReportsCustomerAnalytics, permission: "can_view_customer_analytics_report" },
  { route: routePaths.adminReportsPayment, permission: "can_view_payment_report" },
  { route: routePaths.adminReportsShipping, permission: "can_view_shipping_report" },
  { route: routePaths.adminReportsInventory, permission: "can_view_inventory_report" },
  { route: routePaths.adminSearchAnalytics, permission: "can_view_search_analytics" },
  { route: routePaths.adminBlogs, permission: "can_view_blog" },
  { route: routePaths.adminContactMessages, permission: "can_view_contact_message" },
  { route: routePaths.adminIpBlocks, permission: "can-view-ip-block" },
  { route: routePaths.adminSettingsSecurity, permission: "can-view-ip-block" },
];

function requiredPermissionForPath(pathname: string) {
  if (pathname === routePaths.adminOrderCreate) {
    return "can_create_order";
  }
  if (/^\/admin\/orders\/[^/]+\/edit$/.test(pathname)) {
    return "can_edit_order";
  }
  if (pathname === routePaths.adminProductCreate) {
    return "can_create_product";
  }

  if (pathname === routePaths.adminIpBlockCreate) {
    return "can-create-ip-block";
  }

  if (/^\/admin\/security\/ip-blocks\/[^/]+\/edit$/.test(pathname)) {
    return "can-update-ip-block";
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

function isSafeAdminPath(pathname: unknown): pathname is string {
  return (
    typeof pathname === "string" &&
    pathname.startsWith("/admin/") &&
    !pathname.startsWith("//")
  );
}

async function resolveAdminLanding(request: NextRequest): Promise<AdminLandingResult> {
  try {
    const response = await fetch(`${apiRootUrl}/admin/navigation`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Cookie: request.headers.get("cookie") ?? "",
        "X-Requested-With": "XMLHttpRequest",
      },
      cache: "no-store",
    });

    if (response.status === 401) {
      return { status: "unauthenticated" };
    }

    if (response.status === 403) {
      return { status: "forbidden" };
    }

    if (!response.ok) {
      return { status: "forbidden" };
    }

    const payload = (await response.json()) as AdminNavigationPayload;
    const href = payload.data?.navigation
      ?.flatMap((group) => group.items ?? [])
      .map((item) => item.href)
      .find(isSafeAdminPath);

    return href
      ? { status: "accessible", href }
      : { status: "forbidden" };
  } catch {
    return { status: "forbidden" };
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

async function customerSettings(request: NextRequest) {
  try {
    const response = await fetch(`${apiRootUrl}/settings/navigation`, {
      headers: {
        Accept: "application/json",
        Cookie: request.headers.get("cookie") ?? "",
        "X-Requested-With": "XMLHttpRequest",
      },
      cache: "no-store",
    });
    const payload = await response.json() as {
      data?: {
        customer_settings?: {
          allow_registration?: boolean;
          allow_guest_checkout?: boolean;
        };
      };
    };

    return {
      allowRegistration: payload.data?.customer_settings?.allow_registration !== false,
      allowGuestCheckout: payload.data?.customer_settings?.allow_guest_checkout !== false,
    };
  } catch {
    return { allowRegistration: true, allowGuestCheckout: false };
  }
}

async function authenticate(request: NextRequest) {
  const result = await getSession(request);
  const session = result?.session ?? null;

  return {
    authenticated: Boolean(session?.authenticated && session.has_access_token),
    session,
    sessionResponse: result?.response ?? null,
  };
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const blogRoute = pathname === "/blogs" || pathname.startsWith("/blogs/");
  const checkoutRoute = pathname === routePaths.checkout;

  if (blogRoute && !await isBlogEnabled(request)) {
    const notFoundUrl = request.nextUrl.clone();
    notFoundUrl.pathname = "/not-found";
    notFoundUrl.search = "";
    return NextResponse.rewrite(notFoundUrl, { status: 404 });
  }

  const protectedRoute = isRoute(pathname, protectedRoutes);
  const publicAuthRoute = isRoute(pathname, publicAuthRoutes);

  if (!protectedRoute && !publicAuthRoute && !checkoutRoute) {
    return NextResponse.next();
  }

  const { authenticated, session, sessionResponse } = await authenticate(request);

  if (checkoutRoute && !authenticated) {
    const settings = await customerSettings(request);
    if (!settings.allowGuestCheckout) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = routePaths.login;
      loginUrl.searchParams.set("redirect", routePaths.checkout);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (protectedRoute && !authenticated) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = routePaths.login;
    loginUrl.searchParams.set("redirect", safeRedirectTarget(request));
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/admin") {
    const landing = await resolveAdminLanding(request);

    if (landing.status === "unauthenticated") {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = routePaths.login;
      loginUrl.searchParams.set("redirect", safeRedirectTarget(request));
      return NextResponse.redirect(loginUrl);
    }

    if (landing.status === "accessible") {
      const landingUrl = request.nextUrl.clone();
      landingUrl.pathname = landing.href;
      landingUrl.search = "";
      const response = NextResponse.redirect(landingUrl);
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

  const requiredPermission = pathname.startsWith("/admin")
    ? requiredPermissionForPath(pathname)
    : null;

  if (protectedRoute && requiredPermission && !session?.user?.permissions?.includes(requiredPermission)) {
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
