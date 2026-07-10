import type { Metadata } from "next";

const apiBaseUrl = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/auth"
).replace(/\/auth\/?$/, "");

const appUrl = (process.env.NEXT_PUBLIC_CREATE_APP_URL ?? "http://localhost:4000").replace(/\/$/, "");
const appName = process.env.NEXT_PUBLIC_APP_NAME ?? process.env.APP_NAME ?? "Ecommerce";

export type SeoMetadataPayload = {
  siteName?: string | null;
  title?: string | null;
  description?: string | null;
  keywords?: string | null;
  canonicalDomain?: string | null;
  canonicalUrl?: string | null;
  robots?: string | null;
  openGraph?: {
    title?: string | null;
    description?: string | null;
    image?: string | null;
    url?: string | null;
    type?: string | null;
    siteName?: string | null;
  } | null;
  twitter?: {
    card?: string | null;
    title?: string | null;
    description?: string | null;
    image?: string | null;
  } | null;
  structuredData?: Record<string, unknown> | null;
  favicon?: string | null;
};

type ApiEnvelope<T> = { data: T };

export const privateRobots = "noindex,nofollow";

export const staticSeo: Record<string, { title: string; description: string; path: string; robots?: string }> = {
  home: { title: "Home", description: "Shop curated products, trusted brands, and seasonal deals.", path: "/" },
  shop: { title: "Shop", description: "Browse all available products by category, brand, price, and availability.", path: "/shop" },
  categories: { title: "Categories", description: "Explore product categories and discover curated catalog sections.", path: "/categories" },
  brands: { title: "Brands", description: "Shop products from featured and trusted brands.", path: "/brands" },
  contact: { title: "Contact", description: "Contact customer support for order, product, and store questions.", path: "/contact" },
  about: { title: "About", description: "Learn about our store, mission, values, and shopping experience.", path: "/about" },
  privacy: { title: "Privacy Policy", description: "Read how customer data and privacy are protected.", path: "/privacy" },
  terms: { title: "Terms & Conditions", description: "Review the terms and conditions for using the store.", path: "/terms" },
  returns: { title: "Return Policy", description: "Review return eligibility, timelines, and customer support guidance.", path: "/return-policy" },
  shipping: { title: "Shipping Policy", description: "Review shipping options, delivery expectations, and order handling.", path: "/shipping-policy" },
  faq: { title: "FAQ", description: "Find answers to common ordering, payment, shipping, and product questions.", path: "/faq" },
  blogs: { title: "Blog", description: "Read buying guides, product updates, and store stories.", path: "/blogs" },
  deals: { title: "Deals", description: "Browse current deals, offers, and limited-time promotions.", path: "/deals" },
  flashSale: { title: "Flash Sale", description: "Shop limited-time flash sale products before offers expire.", path: "/flash-sale" },
  bestSellers: { title: "Best Sellers", description: "Discover popular products loved by customers.", path: "/best-sellers" },
  newArrivals: { title: "New Arrivals", description: "Browse the latest products added to the catalog.", path: "/new-arrivals" },
  reviews: { title: "Reviews", description: "Read customer reviews and product feedback.", path: "/reviews" },
  giftCards: { title: "Gift Cards", description: "Find gift card options for flexible shopping.", path: "/gift-cards" },
  sizeGuide: { title: "Size Guide", description: "Use the size guide to choose the right fit.", path: "/size-guide" },
  careers: { title: "Careers", description: "Explore career opportunities and team information.", path: "/careers" },
  press: { title: "Press", description: "Find press information and store updates.", path: "/press" },
  cookies: { title: "Cookie Policy", description: "Learn how cookies support store functionality and preferences.", path: "/cookies" },
};

export async function defaultMetadata(): Promise<Metadata> {
  const payload = await fetchDefaults();
  return toMetadata(payload ?? fallbackPayload("Store", "Premium ecommerce experience", "/"));
}

export async function pageMetadata(key: keyof typeof staticSeo): Promise<Metadata> {
  const config = staticSeo[key];
  return metadataFromPayload(fallbackPayload(config.title, config.description, config.path, config.robots));
}

export async function searchMetadata(query?: string | string[]): Promise<Metadata> {
  const q = Array.isArray(query) ? query[0] : query;
  const title = q ? `Search results for "${q}"` : "Search";
  const description = q ? `Browse search results for ${q}.` : "Search the product catalog.";
  return metadataFromPayload(fallbackPayload(title, description, q ? `/search?q=${encodeURIComponent(q)}` : "/search"));
}

export async function privatePageMetadata(title: string, path: string): Promise<Metadata> {
  return metadataFromPayload(fallbackPayload(title, "Private customer page.", path, privateRobots));
}

export async function entityMetadata(type: "product" | "category" | "brand" | "collection" | "blog" | "content-page", slug: string): Promise<Metadata> {
  const payload = await fetchEntity(type, slug);
  if (payload) {
    return toMetadata(payload);
  }

  return metadataFromPayload(fallbackPayload("Page Not Found", "The requested page could not be found.", `/${type}s/${slug}`, privateRobots));
}

export async function entityStructuredData(type: "product" | "category" | "brand" | "collection" | "blog" | "content-page", slug: string): Promise<Record<string, unknown> | null> {
  const payload = await fetchEntity(type, slug);
  return payload?.structuredData ?? null;
}

export function JsonLd({ data }: { data: Record<string, unknown> | null | undefined }) {
  if (!data) return null;

  return (
    <script
      type="application/ld+json"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export async function sitemapEntries(): Promise<Array<{ url: string; lastModified?: string; changeFrequency?: string; priority?: number }>> {
  try {
    const response = await fetch(`${apiBaseUrl}/seo/sitemap`, { next: { revalidate: 900 } });
    if (!response.ok) return [];
    const json = (await response.json()) as ApiEnvelope<{ items: Array<{ url: string; lastModified?: string; changeFrequency?: string; priority?: number }> }>;
    return json.data.items;
  } catch {
    return [];
  }
}

async function metadataFromPayload(payload: SeoMetadataPayload): Promise<Metadata> {
  const defaults = await fetchDefaults();
  return toMetadata(mergeDefaults(payload, defaults));
}

async function fetchDefaults(): Promise<SeoMetadataPayload | null> {
  try {
    const response = await fetch(`${apiBaseUrl}/seo/defaults`, { cache: "no-store" });
    if (!response.ok) return null;
    const json = (await response.json()) as ApiEnvelope<{ metadata: SeoMetadataPayload }>;
    return json.data.metadata;
  } catch {
    return null;
  }
}

async function fetchEntity(type: string, slug: string): Promise<SeoMetadataPayload | null> {
  try {
    const response = await fetch(`${apiBaseUrl}/seo/${type}/${encodeURIComponent(slug)}`, { cache: "no-store" });
    if (!response.ok) return null;
    const json = (await response.json()) as ApiEnvelope<{ metadata: SeoMetadataPayload }>;
    return json.data.metadata;
  } catch {
    return null;
  }
}

function fallbackPayload(title: string, description: string, path: string, robots = "index,follow"): SeoMetadataPayload {
  return {
    title,
    description,
    canonicalUrl: `${appUrl}${path}`,
    robots,
    openGraph: {
      title,
      description,
      url: `${appUrl}${path}`,
      type: "website",
      siteName: appName,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

function mergeDefaults(payload: SeoMetadataPayload, defaults: SeoMetadataPayload | null): SeoMetadataPayload {
  if (!defaults) return payload;
  const siteName = defaults.siteName ?? payload.siteName;
  const title = payload.title?.includes(siteName ?? "") ? payload.title : `${payload.title} | ${siteName ?? appName}`;

  return {
    ...defaults,
    ...payload,
    title,
    description: payload.description ?? defaults.description,
    keywords: payload.keywords ?? defaults.keywords,
    canonicalUrl: payload.canonicalUrl ?? defaults.canonicalUrl,
    robots: payload.robots ?? defaults.robots,
    openGraph: {
      ...defaults.openGraph,
      ...payload.openGraph,
      title,
      description: payload.openGraph?.description ?? payload.description ?? defaults.description,
      image: payload.openGraph?.image ?? defaults.openGraph?.image,
      siteName,
    },
    twitter: {
      ...defaults.twitter,
      ...payload.twitter,
      title,
      description: payload.twitter?.description ?? payload.description ?? defaults.description,
      image: payload.twitter?.image ?? defaults.twitter?.image ?? defaults.openGraph?.image,
    },
  };
}

function toMetadata(payload: SeoMetadataPayload): Metadata {
  const robots = parseRobots(payload.robots);
  const ogImage = payload.openGraph?.image;
  const twitterImage = payload.twitter?.image;

  return {
    title: payload.title ?? undefined,
    description: payload.description ?? undefined,
    keywords: payload.keywords ?? undefined,
    alternates: payload.canonicalUrl ? { canonical: payload.canonicalUrl } : undefined,
    robots,
    openGraph: {
      title: payload.openGraph?.title ?? payload.title ?? undefined,
      description: payload.openGraph?.description ?? payload.description ?? undefined,
      url: payload.openGraph?.url ?? payload.canonicalUrl ?? undefined,
      type: payload.openGraph?.type === "article" ? "article" : "website",
      siteName: payload.openGraph?.siteName ?? payload.siteName ?? undefined,
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
    twitter: {
      card: payload.twitter?.card === "summary" ? "summary" : "summary_large_image",
      title: payload.twitter?.title ?? payload.title ?? undefined,
      description: payload.twitter?.description ?? payload.description ?? undefined,
      images: twitterImage ? [twitterImage] : undefined,
    },
    icons: payload.favicon ? {
      icon: [{ url: payload.favicon }],
      shortcut: [{ url: payload.favicon }],
      apple: [{ url: payload.favicon }],
    } : undefined,
  };
}

function parseRobots(value: string | null | undefined): Metadata["robots"] {
  const robots = value ?? "index,follow";
  return {
    index: !robots.includes("noindex"),
    follow: !robots.includes("nofollow"),
    googleBot: {
      index: !robots.includes("noindex"),
      follow: !robots.includes("nofollow"),
    },
  };
}
