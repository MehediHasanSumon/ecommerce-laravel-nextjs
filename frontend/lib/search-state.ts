type SearchKeywordSuggestion = {
  id: string;
  keyword: string;
  search_count?: number;
  searched_at?: string | null;
};

const HISTORY_KEY = "storefront.search.history.v1";
const ATTRIBUTION_KEY = "storefront.search.attribution.v1";
const SESSION_KEY = "storefront.search.session.v1";
const HISTORY_LIMIT = 12;

type SearchAttribution = {
  eventId: string;
  recordedAt: number;
};

export function getGuestSearchHistory(): SearchKeywordSuggestion[] {
  if (typeof window === "undefined") return [];

  try {
    const value = JSON.parse(window.localStorage.getItem(HISTORY_KEY) ?? "[]");
    return Array.isArray(value)
      ? value
          .filter((item): item is SearchKeywordSuggestion => Boolean(item && typeof item.keyword === "string"))
          .slice(0, HISTORY_LIMIT)
      : [];
  } catch {
    return [];
  }
}

export function rememberGuestSearch(keyword: string): SearchKeywordSuggestion[] {
  const normalized = keyword.trim().replace(/\s+/g, " ");
  if (!normalized || typeof window === "undefined") return getGuestSearchHistory();

  const next = [
    {
      id: `guest-${normalized.toLocaleLowerCase()}`,
      keyword: normalized,
      searched_at: new Date().toISOString(),
    },
    ...getGuestSearchHistory().filter(
      (item) => item.keyword.toLocaleLowerCase() !== normalized.toLocaleLowerCase(),
    ),
  ].slice(0, HISTORY_LIMIT);

  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  return next;
}

export function removeGuestSearch(id: string): SearchKeywordSuggestion[] {
  if (typeof window === "undefined") return [];
  const next = getGuestSearchHistory().filter((item) => item.id !== id);
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  return next;
}

export function clearGuestSearchHistory(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(HISTORY_KEY);
  }
}

export function setSearchAttribution(eventId: string): void {
  if (typeof window === "undefined" || !eventId) return;
  window.localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify({ eventId, recordedAt: Date.now() }));
}

export function getSearchAttribution(maxAgeMs = 30 * 60 * 1000): string | undefined {
  if (typeof window === "undefined") return undefined;

  try {
    const value = JSON.parse(window.localStorage.getItem(ATTRIBUTION_KEY) ?? "null") as SearchAttribution | null;
    if (!value?.eventId || Date.now() - value.recordedAt > maxAgeMs) {
      window.localStorage.removeItem(ATTRIBUTION_KEY);
      return undefined;
    }

    return value.eventId;
  } catch {
    return undefined;
  }
}

export function clearSearchAttribution(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(ATTRIBUTION_KEY);
  }
}

export function getSearchSessionId(): string {
  if (typeof window === "undefined") return "";
  const existing = window.sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;

  const session = typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.sessionStorage.setItem(SESSION_KEY, session);
  return session;
}
