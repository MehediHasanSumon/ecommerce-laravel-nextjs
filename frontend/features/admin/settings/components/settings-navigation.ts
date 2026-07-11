import {
  BadgeCheck,
  Building2,
  LayoutGrid,
  CreditCard,
  Globe2,
  Mail,
  MapPin,
  Megaphone,
  MessageSquareText,
  Newspaper,
  PackageCheck,
  Search,
  Settings2,
  ShieldAlert,
  Store,
} from "lucide-react";
import { routePaths } from "@/constants/routes";
import type { SettingNavItem } from "@/features/admin/settings/components/settings-primitives";

export const settingsNavItems: SettingNavItem[] = [
  { href: routePaths.adminSettingsCompany, label: "Company Settings", description: "Legal, branding, invoice, security", icon: Building2 },
  { href: routePaths.adminSettingsHeroSection, label: "Hero Section", description: "Home hero slider and canvas builder", icon: LayoutGrid },
  { href: routePaths.adminSettingsHomePage, label: "Home Page Settings", description: "Home section visibility and product limits", icon: LayoutGrid },
  { href: routePaths.adminSettingsCategories, label: "Category Display", description: "Home section, navbar dropdown, category routes", icon: LayoutGrid },
  { href: routePaths.adminSettingsHomeFeatureCards, label: "Feature Cards", description: "Home service highlight cards", icon: BadgeCheck },
  { href: routePaths.adminSettingsBlog, label: "Blog Settings", description: "Blog feature, layout, comments, SEO", icon: Newspaper },
  { href: routePaths.adminSettingsBrand, label: "Brand Settings", description: "Brand module and home visibility", icon: Building2 },
  { href: routePaths.adminSettingsStore, label: "Store Settings", description: "Catalog, checkout, storefront behavior", icon: Store },
  { href: routePaths.adminSettingsEmail, label: "Email (SMTP)", description: "Mail driver and sender identity", icon: Mail },
  { href: routePaths.adminSettingsSms, label: "SMS Provider", description: "Twilio, Vonage, SSL Wireless", icon: MessageSquareText },
  { href: routePaths.adminSettingsPayment, label: "Payment Settings", description: "Payment gateways and credentials", icon: CreditCard },
  { href: routePaths.adminSettingsShippingZones, label: "Shipping Zones", description: "Supported countries and delivery zones", icon: MapPin },
  { href: routePaths.adminSettingsShippingMethods, label: "Shipping Methods", description: "Zone-based delivery methods and charges", icon: PackageCheck },
  { href: routePaths.adminSettingsSeo, label: "SEO Settings", description: "Meta defaults and indexing", icon: Search },
  { href: routePaths.adminSettingsSocial, label: "Social Media", description: "Social links and sharing", icon: Megaphone },
  { href: routePaths.adminSettingsLocalization, label: "Localization", description: "Timezone, language, currency", icon: Globe2 },
  { href: routePaths.adminSettingsMaintenance, label: "Maintenance Mode", description: "Downtime controls and message", icon: ShieldAlert },
];

export const settingsSidebarItem = { href: routePaths.adminSettingsCompany, label: "Settings", icon: Settings2 };
export const settingsActivePaths = settingsNavItems.map((item) => item.href);

export function settingTitleForPath(pathname: string) {
  return settingsNavItems.find((item) => item.href === pathname)?.label ?? "Settings";
}

export const placeholderSettings = {
  store: {
    title: "Store Settings",
    description: "Configure storefront behavior, product display defaults, checkout toggles, and catalog operations.",
    icon: Store,
  },
  payment: {
    title: "Payment Settings",
    description: "Configure active payment gateways, checkout display, credentials, webhooks, and sandbox/live mode.",
    icon: CreditCard,
  },
  seo: {
    title: "SEO Settings",
    description: "Global SEO defaults for titles, canonical behavior, robots, sitemap, and social previews.",
    icon: Search,
  },
  social: {
    title: "Social Media",
    description: "Manage storefront social profiles, share metadata, and customer community links.",
    icon: Megaphone,
  },
  localization: {
    title: "Localization",
    description: "Regional formats for language, timezone, currency, dates, numbers, and measurement units.",
    icon: Globe2,
  },
  maintenance: {
    title: "Maintenance Mode",
    description: "Control storefront availability, downtime messaging, and admin-only access during maintenance.",
    icon: ShieldAlert,
  },
} as const;

export const addressIcon = MapPin;
