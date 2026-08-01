import {
  BadgeCheck,
  BarChart3,
  Building2,
  LayoutGrid,
  CreditCard,
  MapPin,
  Megaphone,
  Newspaper,
  PackageCheck,
  Search,
  ShieldAlert,
  ShieldCheck,
  Settings2,
  Store,
  Truck,
  MessageSquareText,
  ListChecks,
  ChartNoAxesCombined,
} from "lucide-react";
import { routePaths } from "@/constants/routes";
import type { SettingNavItem } from "@/features/admin/settings/components/settings-primitives";

export const settingsNavItems: SettingNavItem[] = [
  {
    href: routePaths.adminSettingsCompany,
    label: "Company Settings",
    description: "Legal, branding, invoice, security",
    icon: Building2,
  },
  {
    href: routePaths.adminSettingsHeroSection,
    label: "Hero Section",
    description: "Home hero slider and canvas builder",
    icon: LayoutGrid,
  },
  {
    href: routePaths.adminSettingsHomePage,
    label: "Home Page Settings",
    description: "Home section visibility and product limits",
    icon: LayoutGrid,
  },
  {
    href: routePaths.adminSettingsHomeFeatureCards,
    label: "Feature Cards",
    description: "Home service highlight cards",
    icon: BadgeCheck,
  },
  {
    href: routePaths.adminSettingsBlog,
    label: "Blog Settings",
    description: "Blog feature, layout, comments, SEO",
    icon: Newspaper,
  },
  {
    href: routePaths.adminSettingsStore,
    label: "Store Settings",
    description: "Catalog, checkout, storefront behavior",
    icon: Store,
  },
  {
    href: routePaths.adminSettingsPayment,
    label: "Payment Settings",
    description: "Payment gateways and credentials",
    icon: CreditCard,
  },
  {
    href: routePaths.adminSettingsShippingZones,
    label: "Shipping Zones",
    description: "Supported countries and delivery zones",
    icon: MapPin,
  },
  {
    href: routePaths.adminSettingsShippingMethods,
    label: "Shipping Methods",
    description: "Zone-based delivery methods and charges",
    icon: PackageCheck,
  },
  {
    href: routePaths.adminSettingsCouriers,
    label: "Courier Integrations",
    description: "Steadfast and Pathao credentials and defaults",
    icon: Truck,
  },
  {
    href: routePaths.adminSettingsFraudDetection,
    label: "Fraud Detection",
    description: "Risk checks, provider credentials, order controls",
    icon: ShieldCheck,
  },
  {
    href: routePaths.adminSettingsMetaPixel,
    label: "Meta Pixel",
    description: "Meta Pixel and Conversions API",
    icon: BarChart3,
  },
  {
    href: routePaths.adminSettingsGoogleAnalytics,
    label: "Google Analytics",
    description: "GA4 ecommerce and Measurement Protocol",
    icon: ChartNoAxesCombined,
  },
  {
    href: routePaths.adminSettingsSeo,
    label: "SEO Settings",
    description: "Meta defaults and indexing",
    icon: Search,
  },
  {
    href: routePaths.adminSettingsSocial,
    label: "Social Media",
    description: "Social links and sharing",
    icon: Megaphone,
  },
  {
    href: routePaths.adminSettingsSms,
    label: "SMS Settings",
    description: "Providers, OTP, events, templates",
    icon: MessageSquareText,
  },
  {
    href: routePaths.adminSettingsSmsLogs,
    label: "SMS Logs",
    description: "Delivery activity and provider responses",
    icon: ListChecks,
  },
  {
    href: routePaths.adminSettingsSecurity,
    label: "Security Settings",
    description: "IP blocking, thresholds, and trusted proxies",
    icon: ShieldAlert,
  },
];

export const settingsSidebarItem = {
  href: routePaths.adminSettingsCompany,
  label: "Settings",
  icon: Settings2,
};
export const settingsActivePaths = settingsNavItems.map((item) => item.href);

export function settingTitleForPath(pathname: string) {
  return settingsNavItems.find((item) => item.href === pathname)?.label ?? "Settings";
}

export const placeholderSettings = {
  store: {
    title: "Store Settings",
    description:
      "Configure storefront behavior, product display defaults, checkout toggles, and catalog operations.",
    icon: Store,
  },
  payment: {
    title: "Payment Settings",
    description:
      "Configure active payment gateways, checkout display, credentials, webhooks, and sandbox/live mode.",
    icon: CreditCard,
  },
  seo: {
    title: "SEO Settings",
    description:
      "Global SEO defaults for titles, canonical behavior, robots, sitemap, and social previews.",
    icon: Search,
  },
  social: {
    title: "Social Media",
    description:
      "Manage storefront social profiles, share metadata, and customer community links.",
    icon: Megaphone,
  },
} as const;

export const addressIcon = MapPin;
