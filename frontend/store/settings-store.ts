"use client";

import axios from "axios";
import { create } from "zustand";
import type { ApiEnvelope } from "@/features/admin/shared/types";
import type { RuntimeCurrencySettings, RuntimeSettings } from "@/types/settings";

const emptyFrontendNavigation: RuntimeSettings["navigation"]["frontend"] = [];
const emptyAdminNavigation: RuntimeSettings["navigation"]["admin_sidebar"] = [];
const emptySocialLinks: RuntimeSettings["social_links"] = [];
const emptyRuntimeCategories: RuntimeSettings["categories"] = [];
const emptyHomeFeatureCards: RuntimeSettings["home_feature_cards"] = [];
const emptyPaymentMethods: RuntimeSettings["payment_methods"] = [];
const defaultFeatureCardSettings: RuntimeSettings["feature_card_settings"] = {
  enabled: true,
};
const defaultBlogSettings: RuntimeSettings["blog_settings"] = {
  enabled: false,
  layout: "grid",
  list_options: {
    enable_thumbnail: true,
    show_excerpt: true,
    show_author: true,
    show_published_date: true,
    show_reading_time: true,
  },
  show_on_home: false,
  home_limit: 3,
  allow_comments: true,
  enable_related: true,
  enable_search: true,
  seo: {},
};
const defaultBrandSettings: RuntimeSettings["brand_settings"] = {
  enabled: true,
  show_on_home: true,
};
const defaultHomePageSettings: RuntimeSettings["home_page_settings"] = {
  product_section: {
    enabled: true,
    limit: 20,
  },
  testimonial_section: {
    enabled: true,
  },
  announcement_bar: {
    enabled: true,
    text: "Free shipping on orders over ৳75.00! Limited time offer.",
    link_text: "Shop Now",
    link_url: "/shop",
  },
};
const pendingBrandSettings: RuntimeSettings["brand_settings"] = {
  enabled: false,
  show_on_home: false,
};
const defaultCategoryDisplaySettings: RuntimeSettings["category_display_settings"] = {
  enable_home_category_section: true,
  category_display_mode: "landing_page",
  categories_page_enabled: true,
  navbar_dropdown_enabled: false,
  home_category_variant: "landing_cards",
};
const pendingCategoryDisplaySettings: RuntimeSettings["category_display_settings"] = {
  ...defaultCategoryDisplaySettings,
  enable_home_category_section: false,
  categories_page_enabled: false,
  navbar_dropdown_enabled: false,
  home_category_variant: "hidden",
};
const fallbackCompanyName = "Site";
export const defaultCurrencySettings: RuntimeCurrencySettings = {
  currency: "BDT",
  currency_symbol: "৳",
  currency_position: "left",
  decimal_places: 2,
  decimal_separator: ".",
  thousands_separator: ",",
};

type SettingsState = {
  settings: RuntimeSettings | null;
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;
  fetchSettings: (options?: { force?: boolean }) => Promise<RuntimeSettings | null>;
  refreshSettings: () => Promise<RuntimeSettings | null>;
};

const apiBaseUrl = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/auth"
).replace(/\/auth\/?$/, "");

let settingsPromise: Promise<RuntimeSettings | null> | null = null;

async function loadRuntimeSettings() {
  const response = await axios.get<ApiEnvelope<RuntimeSettings>>(
    `${apiBaseUrl}/settings/navigation`,
    {
      withCredentials: true,
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    },
  );

  return response.data.data;
}

function errorMessage(error: unknown) {
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message?: unknown }).message ?? "Could not load settings.");
  }

  return "Could not load settings.";
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  isLoading: false,
  isLoaded: false,
  error: null,

  async fetchSettings(options) {
    if (!options?.force && get().isLoaded) {
      return get().settings;
    }

    if (!options?.force && settingsPromise) {
      return settingsPromise;
    }

    set({ isLoading: true, error: null });

    settingsPromise = loadRuntimeSettings()
      .then((settings) => {
        set({ settings, isLoaded: true, isLoading: false, error: null });
        return settings;
      })
      .catch((error) => {
        set({ isLoading: false, error: errorMessage(error) });
        return null;
      })
      .finally(() => {
        settingsPromise = null;
      });

    return settingsPromise;
  },

  refreshSettings() {
    return get().fetchSettings({ force: true });
  },
}));

export const selectRuntimeSettings = (state: SettingsState) => state.settings;
export const selectSettingsPending = (state: SettingsState) => !state.isLoaded && !state.error;
export const selectBranding = (state: SettingsState) => selectSettingsPending(state) ? null : state.settings?.branding ?? null;
export const selectCompanyName = (state: SettingsState) => {
  if (selectSettingsPending(state)) {
    return "";
  }

  const settings = state.settings;
  const companySettings = settings?.company_settings ?? {};
  const name =
    stringValue(settings?.branding?.company_name) ||
    stringValue(companySettings.company_name) ||
    stringValue(settings?.branding?.site_name) ||
    stringValue(settings?.appearance_settings?.site_name);

  return name || fallbackCompanyName;
};
export const selectCompanyLogo = (state: SettingsState) => {
  if (selectSettingsPending(state)) {
    return "";
  }

  const settings = state.settings;
  const companySettings = settings?.company_settings ?? {};

  return (
    stringValue(settings?.branding?.logo) ||
    stringValue(companySettings.logo) ||
    stringValue(settings?.appearance_settings?.logo) ||
    stringValue(settings?.branding?.dark_logo) ||
    stringValue(companySettings.dark_logo) ||
    stringValue(settings?.appearance_settings?.dark_logo)
  );
};
export const selectCompanyFavicon = (state: SettingsState) =>
  selectSettingsPending(state) ? "" :
  stringValue(state.settings?.branding?.favicon) ||
  stringValue(state.settings?.company_settings?.favicon) ||
  stringValue(state.settings?.appearance_settings?.favicon);
export const selectFrontendNavigation = (state: SettingsState) =>
  selectSettingsPending(state) ? emptyFrontendNavigation : state.settings?.navigation.frontend ?? emptyFrontendNavigation;
export const selectAdminNavigation = (state: SettingsState) =>
  selectSettingsPending(state) ? emptyAdminNavigation : state.settings?.navigation.admin_sidebar ?? emptyAdminNavigation;
export const selectSocialLinks = (state: SettingsState) =>
  selectSettingsPending(state) ? emptySocialLinks : state.settings?.social_links ?? emptySocialLinks;
export const selectCategoryDisplaySettings = (state: SettingsState) =>
  selectSettingsPending(state) ? pendingCategoryDisplaySettings : state.settings?.category_display_settings ?? defaultCategoryDisplaySettings;
export const selectRuntimeCategories = (state: SettingsState) =>
  selectSettingsPending(state) ? emptyRuntimeCategories : state.settings?.categories ?? emptyRuntimeCategories;
export const selectFeatureCardSettings = (state: SettingsState) =>
  selectSettingsPending(state) ? { enabled: false } : state.settings?.feature_card_settings ?? defaultFeatureCardSettings;
export const selectHomeFeatureCards = (state: SettingsState) =>
  selectSettingsPending(state) ? emptyHomeFeatureCards : state.settings?.home_feature_cards ?? emptyHomeFeatureCards;
export const selectHomePageSettings = (state: SettingsState) =>
  selectSettingsPending(state) ? defaultHomePageSettings : state.settings?.home_page_settings ?? defaultHomePageSettings;
export const selectPaymentMethods = (state: SettingsState) =>
  selectSettingsPending(state) ? emptyPaymentMethods : state.settings?.payment_methods ?? emptyPaymentMethods;
export const selectBlogSettings = (state: SettingsState) =>
  selectSettingsPending(state) ? defaultBlogSettings : state.settings?.blog_settings ?? defaultBlogSettings;
export const selectBrandSettings = (state: SettingsState) =>
  selectSettingsPending(state) ? pendingBrandSettings : state.settings?.brand_settings ?? defaultBrandSettings;
export const selectBrandsEnabled = (state: SettingsState) => selectBrandSettings(state).enabled;
export const selectShowHomeBrandSection = (state: SettingsState) => {
  const settings = selectBrandSettings(state);
  return settings.enabled && settings.show_on_home;
};
export const selectCurrencySettings = (state: SettingsState): RuntimeCurrencySettings => {
  if (selectSettingsPending(state)) {
    return {
      currency: "",
      currency_symbol: "",
      currency_position: defaultCurrencySettings.currency_position,
      decimal_places: defaultCurrencySettings.decimal_places,
      decimal_separator: defaultCurrencySettings.decimal_separator,
      thousands_separator: defaultCurrencySettings.thousands_separator,
    };
  }

  const theme = state.settings?.theme_configuration ?? {};
  const company = state.settings?.company_settings ?? {};

  return {
    currency: stringValue(theme.currency) || stringValue(company.default_currency) || defaultCurrencySettings.currency,
    currency_symbol: stringValue(theme.currency_symbol) || stringValue(company.currency_symbol) || defaultCurrencySettings.currency_symbol,
    currency_position: positionValue(theme.currency_position ?? company.currency_position),
    decimal_places: numberValue(theme.decimal_places ?? company.decimal_places, defaultCurrencySettings.decimal_places),
    decimal_separator: stringValue(theme.decimal_separator) || stringValue(company.decimal_separator) || defaultCurrencySettings.decimal_separator,
    thousands_separator: stringValue(theme.thousands_separator) || stringValue(company.thousands_separator) || defaultCurrencySettings.thousands_separator,
  };
};
export const selectCurrencyFingerprint = (state: SettingsState): string => {
  const settings = selectCurrencySettings(state);

  return [
    settings.currency,
    settings.currency_symbol,
    settings.currency_position,
    settings.decimal_places,
    settings.decimal_separator,
    settings.thousands_separator,
  ].join('|');
};

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function positionValue(value: unknown): RuntimeCurrencySettings["currency_position"] {
  return value === "right" ? "right" : "left";
}
