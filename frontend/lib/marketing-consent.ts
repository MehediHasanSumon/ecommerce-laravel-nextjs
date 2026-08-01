"use client";

export type MarketingConsent = "granted" | "denied" | "unspecified";

const STORAGE_KEY = "marketing_consent";
const EVENT_NAME = "marketing-consent-changed";

export function getMarketingConsent(): MarketingConsent {
  if (typeof window === "undefined") return "unspecified";
  const explicit = window.localStorage.getItem(STORAGE_KEY);
  if (explicit === "granted" || explicit === "denied") return explicit;
  const cookie = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${STORAGE_KEY}=`))
    ?.split("=")[1];
  if (cookie === "granted" || cookie === "denied") return cookie;
  const navigatorWithPrivacy = navigator as Navigator & {
    globalPrivacyControl?: boolean;
    doNotTrack?: string | null;
  };
  if (navigatorWithPrivacy.globalPrivacyControl || navigatorWithPrivacy.doNotTrack === "1") {
    return "denied";
  }

  return "unspecified";
}

export function setMarketingConsent(consent: Exclude<MarketingConsent, "unspecified">) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, consent);
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${STORAGE_KEY}=${consent}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: consent }));
}

export function onMarketingConsentChange(listener: (consent: MarketingConsent) => void) {
  const handler = (event: Event) => {
    listener((event as CustomEvent<MarketingConsent>).detail ?? getMarketingConsent());
  };
  window.addEventListener(EVENT_NAME, handler);

  return () => window.removeEventListener(EVENT_NAME, handler);
}

export function marketingConsentEventName() {
  return EVENT_NAME;
}
