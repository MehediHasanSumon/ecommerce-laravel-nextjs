"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BadgeCheck,
  BarChart3,
  Bell,
  Boxes,
  Building2,
  ChevronDown,
  ChevronLeft,
  CircleDollarSign,
  CirclePercent,
  CreditCard,
  Globe2,
  KeyRound,
  Heart,
  Home,
  LayoutGrid,
  Layers3,
  LogOut,
  Mail,
  MapPin,
  Megaphone,
  Menu,
  MessageSquareText,
  ListChecks,
  Moon,
  Newspaper,
  Package,
  PackageCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Shapes,
  Search,
  Settings,
  Settings2,
  ShieldAlert,
  ShoppingBag,
  ShieldCheck,
  Star,
  Store,
  Tags,
  UsersRound,
  Sun,
  UserRound,
  Warehouse,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BrandLogo } from "@/components/settings/BrandLogo";
import { useTheme } from "@/components/theme/ThemeProvider";
import { routePaths } from "@/constants/routes";
import { useAuthStore } from "@/store/auth-store";
import { selectAdminNavigation, selectSettingsPending, useSettingsStore } from "@/store/settings-store";
import { cn } from "@/utils/cn";
import { getInitials } from "@/utils/sanitize";
import type { User } from "@/types/auth";
import type { RuntimeNavigationGroup, RuntimeNavigationItem } from "@/types/settings";

const navItems = [
  { href: routePaths.dashboard, label: "Dashboard", icon: Home },
];

const usersManagementItems = [
  { href: routePaths.dashboardUsers, label: "User Management", icon: UsersRound },
  { href: routePaths.dashboardRoles, label: "Role Management", icon: ShieldCheck },
  { href: routePaths.dashboardPermissions, label: "Permission Management", icon: KeyRound },
];

const productManagementItems = [
  { href: routePaths.adminProducts, label: "Product Management", icon: Package },
];

const catalogManagementItems = [
  { href: routePaths.adminBrands, label: "Brand Management", icon: Building2 },
  { href: routePaths.adminCategories, label: "Category Management", icon: Layers3 },
  { href: routePaths.adminAttributes, label: "Attribute Management", icon: Shapes },
  { href: routePaths.adminAttributeValues, label: "Attribute Value Management", icon: Boxes },
  { href: routePaths.adminTags, label: "Tag Management", icon: Tags },
  { href: routePaths.adminReviews, label: "Review Management", icon: Star },
];

const marketingManagementItems = [
  { href: routePaths.adminCollections, label: "Collection Management", icon: ShoppingBag },
  { href: routePaths.adminCurrencies, label: "Currency Management", icon: CircleDollarSign },
  { href: routePaths.adminDiscounts, label: "Discount Management", icon: CirclePercent },
];

const orderManagementItems = [
  { href: routePaths.adminOrders, label: "Order Management", icon: PackageCheck },
  { href: routePaths.adminCustomers, label: "Customer Management", icon: UsersRound },
];

const contentManagementItems = [
  { href: routePaths.adminBlogs, label: "Blog Management", icon: Newspaper },
  { href: routePaths.adminContactMessages, label: "Contact Inbox", icon: Mail },
];

const securityManagementItems = [
  { href: routePaths.adminIpBlocks, label: "IP Blocking", icon: ShieldAlert },
];

const reportManagementItems = [
  { href: routePaths.adminReportsSales, label: "Sales Reports", icon: BarChart3 },
  { href: routePaths.adminReportsRevenue, label: "Revenue Analytics", icon: CircleDollarSign },
  { href: routePaths.adminReportsProductPerformance, label: "Product Performance", icon: Package },
  { href: routePaths.adminReportsCustomerAnalytics, label: "Customer Analytics", icon: UsersRound },
  { href: routePaths.adminReportsPayment, label: "Payment Reports", icon: CreditCard },
  { href: routePaths.adminReportsShipping, label: "Shipping Reports", icon: PackageCheck },
  { href: routePaths.adminReportsInventory, label: "Inventory Reports", icon: Warehouse },
];

const settingsItems = [
  { href: routePaths.adminSettingsCompany, label: "Company Settings", icon: Building2 },
  { href: routePaths.adminSettingsHeroSection, label: "Hero Section", icon: LayoutGrid },
  { href: routePaths.adminSettingsHomePage, label: "Home Page Settings", icon: Layers3 },
  { href: routePaths.adminSettingsHomeFeatureCards, label: "Feature Cards", icon: BadgeCheck },
  { href: routePaths.adminSettingsStore, label: "Store Settings", icon: Store },
  { href: routePaths.adminSettingsPayment, label: "Payment Settings", icon: CreditCard },
  { href: routePaths.adminSettingsShippingZones, label: "Shipping Zones", icon: MapPin },
  { href: routePaths.adminSettingsShippingMethods, label: "Shipping Methods", icon: PackageCheck },
  { href: routePaths.adminSettingsSeo, label: "SEO Settings", icon: Search },
  { href: routePaths.adminSettingsSocial, label: "Social Media", icon: Star },
  { href: routePaths.adminSettingsSms, label: "SMS Settings", icon: MessageSquareText },
  { href: routePaths.adminSettingsSmsLogs, label: "SMS Logs", icon: ListChecks },
  { href: routePaths.adminSettingsSecurity, label: "Security Settings", icon: ShieldAlert },
];

const adminPermissionAliases: Record<string, string> = {
  "dashboard.view": "can_view_dashboard",
  "users.view": "can_view_user",
  "roles.view": "can_view_role",
  "permissions.view": "can_view_permission",
  "orders.view": "can_view_order",
  "customers.view": "can_view_customer",
  "products.view": "can_view_product",
  "brands.view": "can_view_brand",
  "categories.view": "can_view_category",
  "attributes.view": "can_view_attribute",
  "attribute-values.view": "can_view_attribute_value",
  "tags.view": "can_view_tag",
  "reviews.view": "can_view_review",
  "collections.view": "can_view_collection",
  "currencies.view": "can_view_currency",
  "discounts.view": "can_view_discount",
  "shipping-zones.view": "can_view_shipping_zone",
  "shipping-methods.view": "can_view_shipping_method",
  "company-settings.view": "can_view_company_setting",
  "hero-section.view": "can_view_hero_section",
  "home-page-settings.view": "can_view_home_page_setting",
  "home-feature-cards.view": "can_view_home_feature_card_setting",
  "blog-settings.view": "can_view_blog_setting",
  "store-settings.view": "can_view_store_setting",
  "payment-settings.view": "can_view_payment_setting",
  "seo-settings.view": "can_view_seo_setting",
  "social-settings.view": "can_view_social_setting",
  "sales-reports.view": "can_view_sales_report",
  "revenue-reports.view": "can_view_revenue_report",
  "product-performance-reports.view": "can_view_product_performance_report",
  "customer-analytics-reports.view": "can_view_customer_analytics_report",
  "payment-reports.view": "can_view_payment_report",
  "shipping-reports.view": "can_view_shipping_report",
  "inventory-reports.view": "can_view_inventory_report",
  "blogs.view": "can_view_blog",
  "contact-messages.view": "can_view_contact_message",
  "ip-blocks.view": "can-view-ip-block",
};

const adminRoutePermissions: Record<string, string> = {
  [routePaths.dashboard]: "can_view_dashboard",
  [routePaths.dashboardUsers]: "can_view_user",
  [routePaths.dashboardRoles]: "can_view_role",
  [routePaths.dashboardPermissions]: "can_view_permission",
  [routePaths.adminOrders]: "can_view_order",
  [routePaths.adminCustomers]: "can_view_customer",
  [routePaths.adminProducts]: "can_view_product",
  [routePaths.adminBrands]: "can_view_brand",
  [routePaths.adminCategories]: "can_view_category",
  [routePaths.adminAttributes]: "can_view_attribute",
  [routePaths.adminAttributeValues]: "can_view_attribute_value",
  [routePaths.adminTags]: "can_view_tag",
  [routePaths.adminReviews]: "can_view_review",
  [routePaths.adminCollections]: "can_view_collection",
  [routePaths.adminCurrencies]: "can_view_currency",
  [routePaths.adminDiscounts]: "can_view_discount",
  [routePaths.adminSettingsShippingZones]: "can_view_shipping_zone",
  [routePaths.adminSettingsShippingMethods]: "can_view_shipping_method",
  [routePaths.adminSettingsCompany]: "can_view_company_setting",
  [routePaths.adminSettingsHeroSection]: "can_view_hero_section",
  [routePaths.adminSettingsHomePage]: "can_view_home_page_setting",
  [routePaths.adminSettingsHomeFeatureCards]: "can_view_home_feature_card_setting",
  [routePaths.adminSettingsBlog]: "can_view_blog_setting",
  [routePaths.adminSettingsStore]: "can_view_store_setting",
  [routePaths.adminSettingsPayment]: "can_view_payment_setting",
  [routePaths.adminSettingsSeo]: "can_view_seo_setting",
  [routePaths.adminSettingsSocial]: "can_view_social_setting",
  [routePaths.adminSettingsSms]: "can_view_sms_setting",
  [routePaths.adminSettingsSmsLogs]: "can_view_sms_log",
  [routePaths.adminReportsSales]: "can_view_sales_report",
  [routePaths.adminReportsRevenue]: "can_view_revenue_report",
  [routePaths.adminReportsProductPerformance]: "can_view_product_performance_report",
  [routePaths.adminReportsCustomerAnalytics]: "can_view_customer_analytics_report",
  [routePaths.adminReportsPayment]: "can_view_payment_report",
  [routePaths.adminReportsShipping]: "can_view_shipping_report",
  [routePaths.adminReportsInventory]: "can_view_inventory_report",
  [routePaths.adminBlogs]: "can_view_blog",
  [routePaths.adminContactMessages]: "can_view_contact_message",
  [routePaths.adminIpBlocks]: "can-view-ip-block",
  [routePaths.adminSettingsSecurity]: "can-view-ip-block",
};

const iconMap = {
  Bell,
  BadgeCheck,
  BarChart3,
  Boxes,
  Building2,
  ChevronDown,
  CircleDollarSign,
  CirclePercent,
  CreditCard,
  Globe2,
  Heart,
  Home,
  LayoutGrid,
  KeyRound,
  Layers3,
  LogOut,
  Mail,
  MapPin,
  Megaphone,
  MessageSquareText,
  ListChecks,
  Newspaper,
  Package,
  PackageCheck,
  Search,
  Settings2,
  Shapes,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Star,
  Store,
  Tags,
  UsersRound,
  Warehouse,
};

function resolveIcon(name?: string) {
  if (!name) return Home;
  return iconMap[name as keyof typeof iconMap] ?? Home;
}

function renderIcon(name: string | undefined, className: string) {
  switch (name) {
    case "Bell": return <Bell className={className} />;
    case "BadgeCheck": return <BadgeCheck className={className} />;
    case "BarChart3": return <BarChart3 className={className} />;
    case "Boxes": return <Boxes className={className} />;
    case "Building2": return <Building2 className={className} />;
    case "CirclePercent": return <CirclePercent className={className} />;
    case "CircleDollarSign": return <CircleDollarSign className={className} />;
    case "CreditCard": return <CreditCard className={className} />;
    case "Globe2": return <Globe2 className={className} />;
    case "Heart": return <Heart className={className} />;
    case "KeyRound": return <KeyRound className={className} />;
    case "LayoutGrid": return <LayoutGrid className={className} />;
    case "Layers3": return <Layers3 className={className} />;
    case "LogOut": return <LogOut className={className} />;
    case "Mail": return <Mail className={className} />;
    case "MapPin": return <MapPin className={className} />;
    case "Megaphone": return <Megaphone className={className} />;
    case "MessageSquareText": return <MessageSquareText className={className} />;
    case "ListChecks": return <ListChecks className={className} />;
    case "Newspaper": return <Newspaper className={className} />;
    case "Package": return <Package className={className} />;
    case "PackageCheck": return <PackageCheck className={className} />;
    case "Search": return <Search className={className} />;
    case "Settings2": return <Settings2 className={className} />;
    case "Shapes": return <Shapes className={className} />;
    case "ShieldAlert": return <ShieldAlert className={className} />;
    case "ShieldCheck": return <ShieldCheck className={className} />;
    case "ShoppingBag": return <ShoppingBag className={className} />;
    case "Star": return <Star className={className} />;
    case "Store": return <Store className={className} />;
    case "Tags": return <Tags className={className} />;
    case "UsersRound": return <UsersRound className={className} />;
    case "Warehouse": return <Warehouse className={className} />;
    case "Home":
    default:
      return <Home className={className} />;
  }
}

function fallbackAdminNavigation(): RuntimeNavigationGroup[] {
  return [
    { key: "main", label: "Main", type: "single", items: navItems.map((item) => ({ label: item.label, href: item.href, icon: item.icon.name, enabled: true })) },
    { key: "orders", label: "Orders", type: "single", items: orderManagementItems.map((item) => ({ label: item.label, href: item.href, icon: item.icon.name, enabled: true })) },
    { key: "products", label: "Products", type: "single", items: productManagementItems.map((item) => ({ label: item.label, href: item.href, icon: item.icon.name, enabled: true })) },
    { key: "users", label: "Users Management", icon: "UsersRound", type: "group", items: usersManagementItems.map((item) => ({ label: item.label, href: item.href, icon: item.icon.name, enabled: true })) },
    { key: "catalog", label: "Catalog", icon: "Layers3", type: "group", items: catalogManagementItems.map((item) => ({ label: item.label, href: item.href, icon: item.icon.name, enabled: true })) },
    { key: "marketing", label: "Marketing & Pricing", icon: "Megaphone", type: "group", items: marketingManagementItems.map((item) => ({ label: item.label, href: item.href, icon: item.icon.name, enabled: true })) },
    { key: "content", label: "Content", icon: "Newspaper", type: "group", items: contentManagementItems.map((item) => ({ label: item.label, href: item.href, icon: item.icon.name, enabled: true })) },
    { key: "security", label: "Security", icon: "ShieldAlert", type: "group", items: securityManagementItems.map((item) => ({ label: item.label, href: item.href, icon: item.icon.name, enabled: true })) },
    { key: "reports", label: "Reports & Analytics", icon: "BarChart3", type: "group", items: reportManagementItems.map((item) => ({ label: item.label, href: item.href, icon: item.icon.name, enabled: true })) },
    { key: "settings", label: "Settings", icon: "Settings2", type: "group", items: settingsItems.map((item) => ({ label: item.label, href: item.href, icon: item.icon.name, enabled: true })) },
  ];
}

function requiredPermissionForItem(item: RuntimeNavigationItem): string | null {
  if (item.permission) {
    return adminPermissionAliases[item.permission] ?? item.permission;
  }

  return adminRoutePermissions[item.href] ?? null;
}

function canAccessAdminItem(item: RuntimeNavigationItem, permissions?: string[]) {
  if (item.enabled === false) {
    return false;
  }

  const requiredPermission = requiredPermissionForItem(item);

  return !requiredPermission || permissions?.includes(requiredPermission);
}

type DashboardShellProps = {
  user: User;
  children: React.ReactNode;
};

type AdminSidebarProps = {
  isLoading: boolean;
  pathname: string;
  onLogout: () => void;
};

function AdminSidebar({
  isLoading,
  pathname,
  onLogout,
}: AdminSidebarProps) {
  const dynamicGroups = useSettingsStore(selectAdminNavigation);
  const settingsLoading = useSettingsStore(selectSettingsPending);
  const permissions = useAuthStore((state) => state.user?.permissions);
  const groups = (dynamicGroups.length ? dynamicGroups : fallbackAdminNavigation())
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canAccessAdminItem(item, permissions)),
    }))
    .filter((group) => group.items.length);
  const activeGroups = groups
    .filter((group) => group.type === "group" && group.items.some((item) => isAdminItemActive(item, pathname)))
    .map((group) => group.key);
  const activeGroupKey = activeGroups.join("|");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(activeGroups.map((key) => [key, true])),
  );

  useEffect(() => {
    const keys = activeGroupKey.split("|").filter(Boolean);
    if (keys.length) {
      setOpenGroups((current) => ({
        ...current,
        ...Object.fromEntries(keys.map((key) => [key, true])),
      }));
    }
  }, [activeGroupKey]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0">
        <Link
          href={routePaths.dashboard}
          className="flex min-w-0 max-w-full items-center gap-3 font-bold"
          aria-label="Admin dashboard"
        >
          <BrandLogo className="max-w-full" iconClassName="h-10 w-10 rounded-xl shadow-sm" textClassName="text-base" />
        </Link>
      </div>

      <nav className="mt-6 min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {settingsLoading ? (
          <div className="space-y-2">
            <span className="block h-10 animate-pulse rounded-xl bg-muted" />
            <span className="block h-10 animate-pulse rounded-xl bg-muted" />
            <span className="block h-10 animate-pulse rounded-xl bg-muted" />
          </div>
        ) : null}
        {!settingsLoading && groups.map((group) => {
          if (group.type === "single") {
            return group.items.map((item) => (
              <AdminNavLink key={item.href} item={item} pathname={pathname} />
            ));
          }

          const Icon = resolveIcon(group.icon);
          const active = group.items.some((item) => isAdminItemActive(item, pathname));
          const isOpen = openGroups[group.key] ?? active;

          return (
            <div key={group.key} className="space-y-1">
              <button
                type="button"
                onClick={() => setOpenGroups((current) => ({ ...current, [group.key]: !isOpen }))}
                aria-expanded={isOpen}
                aria-controls={`${group.key}-sidebar-menu`}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-all",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="min-w-0 flex-1">{group.label}</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform duration-300 ease-out",
                    isOpen && "rotate-180"
                  )}
                />
              </button>
              <div
                id={`${group.key}-sidebar-menu`}
                className={cn(
                  "grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-out",
                  isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                )}
              >
                <div className="min-h-0 space-y-1 pl-5">
                  {group.items.map((item) => (
                    <AdminNavLink key={item.href} item={item} pathname={pathname} nested />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      <div className="shrink-0 pt-4">
        <button
          onClick={onLogout}
          disabled={isLoading}
          className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );
}

function AdminNavLink({
  item,
  pathname,
  nested,
}: {
  item: RuntimeNavigationItem;
  pathname: string;
  nested?: boolean;
}) {
  const active = isAdminItemActive(item, pathname);

  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 text-sm font-medium transition-all",
        nested ? "py-2" : "py-2.5",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {renderIcon(item.icon, "h-4 w-4")}
      <span>{item.label}</span>
    </Link>
  );
}

function isAdminItemActive(item: RuntimeNavigationItem, pathname: string) {
  return pathname === item.href
    || (item.href === routePaths.adminProducts && pathname.startsWith(`${routePaths.adminProducts}/`))
    || (item.href === routePaths.adminOrders && pathname.startsWith(`${routePaths.adminOrders}/`))
    || (item.href === routePaths.adminIpBlocks && pathname.startsWith(`${routePaths.adminIpBlocks}/`));
}

function adminTitleForPath(pathname: string, fallback: string) {
  const dynamicMatchers: Array<[RegExp, string]> = [
    [/^\/admin\/products\/create$/, "Create Product"],
    [/^\/admin\/products\/[^/]+\/edit$/, "Edit Product"],
    [/^\/admin\/collections\/create$/, "Create Collection"],
    [/^\/admin\/collections\/[^/]+\/edit$/, "Edit Collection"],
    [/^\/admin\/orders\/[^/]+$/, "Order Details"],
    [/^\/admin\/security\/ip-blocks\/create$/, "Block IP Address"],
    [/^\/admin\/security\/ip-blocks\/[^/]+\/edit$/, "Edit IP Block"],
    [/^\/admin\/security\/ip-blocks\/[^/]+$/, "IP Block Details"],
  ];

  const dynamic = dynamicMatchers.find(([pattern]) => pattern.test(pathname));
  if (dynamic) {
    return dynamic[1];
  }

  const allItems = [
    ...navItems,
    ...usersManagementItems,
    ...orderManagementItems,
    ...productManagementItems,
    ...catalogManagementItems,
    ...marketingManagementItems,
    ...contentManagementItems,
    ...securityManagementItems,
    ...reportManagementItems,
    ...settingsItems,
  ];

  return allItems.find((item) => item.href === pathname)?.label ?? fallback;
}

function UserMenu({ user, isLoading, onLogout }: { user: User; isLoading: boolean; onLogout: () => void }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";
  const menuItems = [
    { href: routePaths.profile, label: "My Profile", icon: UserRound },
    { href: routePaths.settings, label: "Account Settings", icon: Settings },
    { href: routePaths.settings, label: "Change Password", icon: ShieldCheck },
    { href: routePaths.dashboard, label: "Activity Log", icon: Star },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-xl border border-border bg-card px-2 py-1.5 transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Open user menu"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            {getInitials(user.name)}
          </span>
          <span className="hidden max-w-40 min-w-0 text-left md:block">
            <span className="block truncate text-sm font-semibold">{user.name}</span>
            <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
          </span>
          <ChevronDown className="hidden h-4 w-4 text-muted-foreground md:block" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-80 p-2">
        <div className="flex items-center gap-3 rounded-lg bg-muted/60 p-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-base font-extrabold text-primary-foreground">
            {getInitials(user.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <div className="mt-2 grid gap-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={`${item.label}-${item.href}`} href={item.href} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground">
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            className="flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
            onClick={() => setTheme(isDark ? "light" : "dark")}
          >
            <span className="flex items-center gap-3">
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              Theme Switch
            </span>
            <span className="text-xs">{isDark ? "Dark" : "Light"}</span>
          </button>
        </div>
        <div className="mt-2 border-t border-border pt-2">
          <button
            type="button"
            disabled={isLoading}
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold text-destructive transition hover:bg-destructive/10 disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const logout = useAuthStore((state) => state.logout);
  const isLoading = useAuthStore((state) => state.isLoading);
  const activeItem =
    [...navItems, ...usersManagementItems].find((item) => item.href === pathname) ??
    [
      ...orderManagementItems,
      ...productManagementItems,
      ...catalogManagementItems,
      ...marketingManagementItems,
      ...contentManagementItems,
      ...securityManagementItems,
      ...reportManagementItems,
    ].find((item) => item.href === pathname || (item.href === routePaths.adminProducts && pathname.startsWith(`${routePaths.adminProducts}/`)) || (item.href === routePaths.adminOrders && pathname.startsWith(`${routePaths.adminOrders}/`))) ??
    settingsItems.find((item) => item.href === pathname) ??
    navItems[0];
  const pageTitle = adminTitleForPath(pathname, activeItem.label);

  async function handleLogout() {
    await logout();
    toast.success("Signed out securely.");
    router.replace(routePaths.home);
    router.refresh();
  }

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.title = `${pageTitle} | Admin`;
  }, [pageTitle]);

  useEffect(() => {
    document.body.style.overflow = isMobileSidebarOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileSidebarOpen]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-muted/30 text-foreground">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden w-80 border-r border-border bg-background/95 p-4 shadow-sm backdrop-blur transition-transform duration-300 ease-out lg:block",
          isSidebarCollapsed && "-translate-x-full"
        )}
      >
        <AdminSidebar
          isLoading={isLoading}
          pathname={pathname}
          onLogout={handleLogout}
        />
      </aside>

      {isMobileSidebarOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMobileSidebarOpen(false)}
            aria-label="Close sidebar overlay"
          />
          <aside className="absolute bottom-0 left-0 top-0 w-[min(20rem,calc(100vw-2rem))] border-r border-border bg-background p-4 shadow-2xl transition-transform duration-300">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground">Navigation</span>
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className="rounded-lg p-2 transition-colors hover:bg-muted"
                aria-label="Close sidebar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <AdminSidebar
              isLoading={isLoading}
              pathname={pathname}
              onLogout={handleLogout}
            />
          </aside>
        </div>
      ) : null}

      <div
        className={cn(
          "flex h-full min-w-0 flex-col transition-[padding] duration-300 ease-out",
          isSidebarCollapsed ? "lg:pl-0" : "lg:pl-80"
        )}
      >
        <header
          className={cn(
            "fixed left-0 right-0 top-0 z-40 border-b border-border bg-background/90 backdrop-blur transition-[left] duration-300 ease-out",
            isSidebarCollapsed ? "lg:left-0" : "lg:left-80"
          )}
        >
          <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-5 lg:px-6">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="cursor-pointer rounded-xl border border-border bg-card p-2 transition-colors hover:bg-muted lg:hidden"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <button
              onClick={() => setIsSidebarCollapsed((value) => !value)}
              className="hidden cursor-pointer rounded-xl border border-border bg-card p-2 transition-colors hover:bg-muted lg:inline-flex"
              aria-label={isSidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen className="h-5 w-5" />
              ) : (
                <PanelLeftClose className="h-5 w-5" />
              )}
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Link href="/" className="transition-colors hover:text-foreground">
                  Storefront
                </Link>
                <ChevronLeft className="h-3 w-3 rotate-180" />
                <span>Admin</span>
              </div>
              <h1 className="truncate text-base font-extrabold sm:text-lg">{pageTitle}</h1>
            </div>

            <div className="ml-auto flex items-center">
              <UserMenu user={user} isLoading={isLoading} onLogout={handleLogout} />
            </div>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto pt-16">
          <div className="mx-auto w-full max-w-7xl p-4 sm:p-5 lg:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
