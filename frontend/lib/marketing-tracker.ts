"use client";

import { getMarketingConsent, type MarketingConsent } from "@/lib/marketing-consent";
import type { RuntimeMarketingTracking } from "@/types/settings";

export type MarketingItem = {
  item_id: string;
  item_name: string;
  item_brand?: string | null;
  item_category?: string | null;
  item_variant?: string | null;
  price?: number | null;
  quantity?: number | null;
};

export type MarketingEventPayload = {
  event_url?: string;
  page_title?: string;
  client_id?: string;
  session_id?: string;
  search_term?: string;
  content_name?: string;
  content_category?: string;
  transaction_id?: string;
  ecommerce?: {
    transaction_id?: string;
    currency?: string;
    value?: number;
    tax?: number;
    shipping?: number;
    coupon?: string | null;
    items?: MarketingItem[];
  };
};

type TrackOptions = {
  eventId?: string;
  serverMirror?: boolean;
  serverTracked?: boolean;
  consent?: MarketingConsent;
};

type Fbq = {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[][];
  loaded?: boolean;
  version?: string;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    ecommerceConsent?: {
      get: typeof getMarketingConsent;
      set: (consent: "granted" | "denied") => void;
    };
  }
}

const apiBaseUrl = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/auth"
).replace(/\/auth\/?$/, "");

const metaNames: Record<string, string> = {
  page_view: "PageView",
  view_content: "ViewContent",
  view_item: "ViewContent",
  view_item_list: "ViewCategory",
  view_category: "ViewCategory",
  view_brand: "ViewBrand",
  view_collection: "ViewCollection",
  search: "Search",
  add_to_wishlist: "AddToWishlist",
  add_to_cart: "AddToCart",
  remove_from_cart: "RemoveFromCart",
  view_cart: "ViewCart",
  begin_checkout: "InitiateCheckout",
  add_shipping_info: "AddShippingInfo",
  add_payment_info: "AddPaymentInfo",
  purchase: "Purchase",
  complete_registration: "CompleteRegistration",
  sign_up: "CompleteRegistration",
  contact: "Contact",
  subscribe: "Subscribe",
  lead: "Lead",
  generate_lead: "Lead",
  apply_coupon: "ApplyCoupon",
  refund: "Refund",
};

const googleNames: Record<string, string> = {
  view_content: "view_item",
  view_category: "view_item_list",
  view_brand: "view_item_list",
  view_collection: "view_item_list",
  complete_registration: "sign_up",
  subscribe: "generate_lead",
  lead: "generate_lead",
};

const metaCustomEvents = new Set([
  "view_item_list",
  "view_category",
  "view_brand",
  "view_collection",
  "select_item",
  "remove_from_cart",
  "view_cart",
  "add_shipping_info",
  "login",
  "logout",
  "view_promotion",
  "select_promotion",
  "apply_coupon",
  "refund",
]);

class MarketingTracker {
  private config: RuntimeMarketingTracking | null = null;
  private initialized = new Set<string>();

  configure(config: RuntimeMarketingTracking) {
    this.config = config;
    this.syncConsent();
    if (this.allowed()) this.loadScripts();
  }

  createEventId(prefix = "evt") {
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return `${prefix}-${id}`;
  }

  track(eventName: string, payload: MarketingEventPayload = {}, options: TrackOptions = {}) {
    if (typeof window === "undefined" || !this.config) return options.eventId ?? "";
    const consent = options.consent ?? getMarketingConsent();
    if (consent === "denied") return options.eventId ?? "";
    const eventId = options.eventId ?? this.createEventId(eventName);
    const contextual = {
      ...payload,
      event_url: payload.event_url ?? window.location.href,
      page_title: payload.page_title ?? document.title,
      client_id: payload.client_id ?? this.clientId(),
      session_id: payload.session_id ?? this.sessionId(),
    };
    this.trackBrowser(eventName, contextual, eventId, options.serverTracked === true);
    if (options.serverMirror !== false) {
      this.sendServer(eventName, contextual, eventId, consent);
    }
    return eventId;
  }

  private allowed() {
    return getMarketingConsent() !== "denied";
  }

  private loadScripts() {
    if (this.config?.meta.enabled && this.config.meta.browser_side_tracking && this.config.meta.pixel_id) {
      this.loadMeta(this.config.meta.pixel_id);
    }
    if (this.config?.google.enabled && this.config.google.client_side_events && this.config.google.measurement_id) {
      this.loadGoogle(this.config.google.measurement_id);
    }
  }

  private loadMeta(pixelId: string) {
    if (this.initialized.has(`meta:${pixelId}`)) return;
    this.initialized.add(`meta:${pixelId}`);
    if (!window.fbq) {
      const fbq: Fbq = (...args: unknown[]) => {
        if (fbq.callMethod) fbq.callMethod(...args);
        else (fbq.queue ??= []).push(args);
      };
      fbq.loaded = true;
      fbq.version = "2.0";
      window.fbq = fbq;
      window._fbq = fbq;
      const script = document.createElement("script");
      script.async = true;
      script.src = "https://connect.facebook.net/en_US/fbevents.js";
      script.dataset.marketingPlatform = "meta";
      document.head.appendChild(script);
    }
    window.fbq?.("init", pixelId);
  }

  private loadGoogle(measurementId: string) {
    if (this.initialized.has(`google:${measurementId}`)) return;
    this.initialized.add(`google:${measurementId}`);
    window.dataLayer ??= [];
    window.gtag ??= (...args: unknown[]) => window.dataLayer?.push(args);
    window.gtag("js", new Date());
    window.gtag("consent", "default", {
      analytics_storage: this.consentValue(),
      ad_storage: this.consentValue(),
      ad_user_data: this.consentValue(),
      ad_personalization: this.consentValue(),
    });
    window.gtag("config", measurementId, {
      send_page_view: false,
      debug_mode: this.config?.google.debug_mode,
      anonymize_ip: this.config?.google.anonymize_ip,
    });
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    script.dataset.marketingPlatform = "google";
    document.head.appendChild(script);
  }

  private trackBrowser(eventName: string, payload: MarketingEventPayload, eventId: string, serverTracked: boolean) {
    this.loadScripts();
    const items = payload.ecommerce?.items ?? [];
    const metaData = {
      currency: payload.ecommerce?.currency,
      value: payload.ecommerce?.value,
      content_ids: items.map((item) => item.item_id),
      content_name: payload.content_name,
      content_category: payload.content_category,
      contents: items.map((item) => ({
        id: item.item_id,
        quantity: item.quantity ?? 1,
        item_price: item.price,
      })),
      search_string: payload.search_term,
      order_id: payload.transaction_id,
    };
    if (this.config?.meta.enabled && this.config.meta.browser_side_tracking && window.fbq) {
      window.fbq(
        metaCustomEvents.has(eventName) ? "trackCustom" : "track",
        metaNames[eventName] ?? eventName,
        metaData,
        { eventID: eventId },
      );
    }
    const googleServerOwnsEvent = serverTracked && this.config?.google.server_side_events;
    if (this.config?.google.enabled && this.config.google.client_side_events && !googleServerOwnsEvent && window.gtag) {
      window.gtag("event", googleNames[eventName] ?? eventName, {
        ...(this.config.google.enhanced_ecommerce ? payload.ecommerce : {}),
        search_term: payload.search_term,
        transaction_id: payload.transaction_id,
        event_id: eventId,
        debug_mode: this.config.google.debug_mode,
      });
    }
  }

  private sendServer(
    eventName: string,
    payload: MarketingEventPayload,
    eventId: string,
    consent: MarketingConsent,
  ) {
    const body = JSON.stringify({
      event_id: eventId,
      event_name: eventName,
      consent_status: consent,
      ...payload,
    });
    void fetch(`${apiBaseUrl}/marketing/events`, {
      method: "POST",
      credentials: "include",
      keepalive: true,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
        "X-Marketing-Consent": consent,
      },
      body,
    }).catch(() => undefined);
  }

  clientId() {
    if (typeof window === "undefined") return "";
    const key = "marketing_client_id";
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;
    const value = this.createEventId("client");
    window.localStorage.setItem(key, value);
    return value;
  }

  sessionId() {
    if (typeof window === "undefined") return "";
    const key = "marketing_session_id";
    const existing = window.sessionStorage.getItem(key);
    if (existing) return existing;
    const value = String(Date.now());
    window.sessionStorage.setItem(key, value);
    return value;
  }

  private consentValue(): "granted" | "denied" {
    return this.allowed() ? "granted" : "denied";
  }

  private syncConsent() {
    if (!window.gtag || !this.config?.google.respect_consent_mode) return;
    const value = this.consentValue();
    window.gtag("consent", "update", {
      analytics_storage: value,
      ad_storage: value,
      ad_user_data: value,
      ad_personalization: value,
    });
  }
}

export const marketingTracker = new MarketingTracker();

export function marketingEventHeaders(eventId: string) {
  return {
    "X-Marketing-Event-Id": eventId,
    "X-Marketing-Consent": getMarketingConsent(),
    "X-Tracking-Client-Id": marketingTracker.clientId(),
    "X-Tracking-Session-Id": marketingTracker.sessionId(),
  };
}
