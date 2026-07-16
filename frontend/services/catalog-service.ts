"use client";

import axios from "axios";
import { createAuthAwareClient } from "@/lib/api-client";
import type { ApiEnvelope, PaginationMeta } from "@/features/admin/shared/types";
import type { Product } from "@/types";
import type { Brand } from "@/types";
import type { HeroSectionPayload } from "@/features/admin/hero-section/types";
import type { BlogCard, BlogSettingsRuntime } from "@/services/blog-service";

const apiBaseUrl = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/auth"
).replace(/\/auth\/?$/, "");
const authClient = createAuthAwareClient({ baseURL: apiBaseUrl });

type ProductListPayload = {
  items: Product[];
  filters: ProductFilterMetadata;
};

export type ProductFilterMetadata = {
  brands: Array<{ id: number; name: string; slug: string; count: number }>;
  attributes: Array<{
    id: number;
    name: string;
    slug: string;
    type: string;
    values: Array<{
      id: number;
      value: string;
      slug: string;
      display_value?: string | null;
      hex_color?: string | null;
      count: number;
    }>;
  }>;
  price: { min: number; max: number };
  availability: Array<{ label: string; value: string }>;
  sort: Array<{ label: string; value: string }>;
};

export type ProductQueryParams = {
  search?: string;
  category?: string;
  brand?: string;
  attributes?: string;
  price_min?: number | string;
  price_max?: number | string;
  availability?: string;
  on_sale?: boolean | string | number;
  rating?: number | string;
  sort?: string;
  page?: number | string;
  per_page?: number | string;
};

export type ProductListResponse = {
  items: Product[];
  filters: ProductFilterMetadata;
  pagination: PaginationMeta;
};

export type PublicReview = {
  id: string;
  rating: number;
  comment: string;
  verified: boolean;
  createdAt: string;
  user: { id: string; name: string; avatar?: string | null };
  product: Product | null;
};

export type PublicReviewListResponse = {
  items: PublicReview[];
  pagination: PaginationMeta;
};

export type ProductReview = {
  id: string;
  productId: string;
  userId: string;
  user: { id: string; name: string; avatar?: string | null };
  rating: number;
  comment: string;
  verified: boolean;
  createdAt: string;
  replies?: Array<{ id: string; author: string; comment: string; createdAt?: string | null }>;
};

export type ProductVariantDetail = {
  id: string;
  sku: string;
  price: number;
  originalPrice?: number | null;
  stock: number;
  stockStatus: string;
  trackInventory: boolean;
  options: Record<string, { id: number; name: string; value: string; display_value?: string | null; hex?: string | null }>;
  images: string[];
};

export type ProductAttributeGroup = {
  name: string;
  slug: string;
  type: string;
  values: Array<{ id: number; name: string; value: string; display_value?: string | null; hex?: string | null }>;
};

export type ProductDetail = Product & {
  categories?: Array<{ name: string; slug: string }>;
  stockStatus?: string;
  trackInventory?: boolean;
  priceRange?: { min: number; max: number } | null;
  attributes?: ProductAttributeGroup[];
  variants?: ProductVariantDetail[];
  shippingInfo?: string;
  returnPolicy?: string;
  warrantyInfo?: string;
  deliveryInfo?: string;
  seo?: {
    title?: string | null;
    description?: string | null;
    canonicalUrl?: string | null;
    ogImage?: string | null;
    schema?: Record<string, unknown> | null;
  };
};

export type ProductDetailResponse = {
  product: ProductDetail;
  reviews: ProductReview[];
  relatedProducts: Product[];
  similarProducts: Product[];
  frequentlyBoughtTogether: Product[];
  recentlyViewedProducts: Product[];
};

export type HomePageSections = {
  hero: HeroSectionPayload;
  settings: Record<string, { enabled: boolean; limit?: number; displayOrder?: number; algorithm?: string }>;
  collections: Array<{ collection: CollectionSummary; items: Product[] }>;
  sections: {
    topBrands: { enabled: boolean; items: Brand[] };
    products: { enabled: boolean; items: Product[] };
    testimonials: { enabled: boolean };
    blogs: { items: BlogCard[]; settings: BlogSettingsRuntime };
    reviews: { enabled: boolean; items: PublicReview[] };
  };
};

export type CollectionSummary = {
  id: string;
  slug: string;
  name: string;
  title: string;
  description: string;
  subtitle?: string | null;
  promotionalText?: string | null;
  type: string;
  ruleKey?: string | null;
  featured: boolean;
  showOnHome: boolean;
  homeSortOrder: number;
  displayPositionAnchor: string;
  displayPositionPlacement: "before" | "after";
  productLimit: number;
  priority: number;
  discountEnabled: boolean;
  discountType?: string | null;
  discountValue?: number | null;
  discountApplyTo?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  bannerImage?: string | null;
  mobileBannerImage?: string | null;
  logo?: string | null;
  ctaText?: string | null;
  ctaUrl?: string | null;
  url: string;
  aliases: string[];
  seo?: {
    title?: string | null;
    description?: string | null;
    keywords?: string | null;
    canonicalUrl?: string | null;
    ogTitle?: string | null;
    ogDescription?: string | null;
    ogImage?: string | null;
  };
};

export type BrandListResponse = {
  featured: Brand[];
  items: Brand[];
  pagination: PaginationMeta;
};

export type BrandDetailResponse = {
  brand: Brand & {
    seo?: {
      title?: string | null;
      description?: string | null;
      canonicalUrl?: string | null;
      ogImage?: string | null;
    };
  };
  products: Product[];
  pagination: PaginationMeta;
};

export type CollectionDetailResponse = {
  collection: CollectionSummary;
  products: Product[];
  pagination: PaginationMeta;
};

export type ShippingMethod = {
  id: string;
  zoneId?: string | null;
  zoneName?: string | null;
  name: string;
  slug: string;
  description?: string | null;
  deliveryType?: string | null;
  estimatedDeliveryTime?: string | null;
  charge: number;
  minimumOrderAmount?: number;
  sortOrder: number;
};

export async function fetchHomePageSections(
  options: { signal?: AbortSignal } = {},
): Promise<HomePageSections> {
  const response = await axios.get<ApiEnvelope<HomePageSections>>(`${apiBaseUrl}/home-page`, {
    signal: options.signal,
    withCredentials: true,
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  });

  return response.data.data;
}

export async function subscribeToNewsletter(email: string): Promise<string> {
  const response = await axios.post<ApiEnvelope<{ subscriber: { id: number; email: string; status: string } }>>(
    `${apiBaseUrl}/newsletter/subscribe`,
    { email },
    {
      withCredentials: true,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    },
  );

  return response.data.message;
}

export async function fetchBrands(
  params: { search?: string; page?: number | string; per_page?: number | string } = {},
  options: { signal?: AbortSignal } = {},
): Promise<BrandListResponse> {
  const response = await axios.get<ApiEnvelope<{ featured: Brand[]; items: Brand[] }>>(
    `${apiBaseUrl}/brands`,
    {
      params,
      signal: options.signal,
      withCredentials: true,
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    },
  );

  return {
    featured: response.data.data.featured,
    items: response.data.data.items,
    pagination: response.data.meta.pagination ?? {
      current_page: 1,
      last_page: 1,
      per_page: Number(params.per_page ?? 48),
      total: response.data.data.items.length,
      from: response.data.data.items.length ? 1 : null,
      to: response.data.data.items.length || null,
    },
  };
}

export async function fetchCollectionDetail(
  slug: string,
  params: { page?: number | string; per_page?: number | string } = {},
  options: { signal?: AbortSignal } = {},
): Promise<CollectionDetailResponse> {
  const response = await axios.get<ApiEnvelope<{ collection: CollectionSummary; products: Product[] }>>(
    `${apiBaseUrl}/collections/${encodeURIComponent(slug)}`,
    {
      params,
      signal: options.signal,
      withCredentials: true,
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    },
  );

  return {
    collection: response.data.data.collection,
    products: response.data.data.products,
    pagination: response.data.meta.pagination ?? {
      current_page: 1,
      last_page: 1,
      per_page: Number(params.per_page ?? 12),
      total: response.data.data.products.length,
      from: response.data.data.products.length ? 1 : null,
      to: response.data.data.products.length || null,
    },
  };
}

export async function fetchBrandDetail(
  slug: string,
  params: { page?: number | string; per_page?: number | string } = {},
  options: { signal?: AbortSignal } = {},
): Promise<BrandDetailResponse> {
  const response = await axios.get<ApiEnvelope<{ brand: BrandDetailResponse["brand"]; products: Product[] }>>(
    `${apiBaseUrl}/brands/${encodeURIComponent(slug)}`,
    {
      params,
      signal: options.signal,
      withCredentials: true,
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    },
  );

  return {
    brand: response.data.data.brand,
    products: response.data.data.products,
    pagination: response.data.meta.pagination ?? {
      current_page: 1,
      last_page: 1,
      per_page: Number(params.per_page ?? 12),
      total: response.data.data.products.length,
      from: response.data.data.products.length ? 1 : null,
      to: response.data.data.products.length || null,
    },
  };
}

export async function fetchProducts(
  params: ProductQueryParams = {},
  options: { signal?: AbortSignal } = {},
): Promise<ProductListResponse> {
  const response = await axios.get<ApiEnvelope<ProductListPayload>>(`${apiBaseUrl}/products`, {
    params,
    signal: options.signal,
    withCredentials: true,
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  });

  return {
    items: response.data.data.items,
    filters: response.data.data.filters,
    pagination: response.data.meta.pagination ?? {
      current_page: 1,
      last_page: 1,
      per_page: Number(params.per_page ?? 24),
      total: response.data.data.items.length,
      from: response.data.data.items.length ? 1 : null,
      to: response.data.data.items.length || null,
    },
  };
}

export async function fetchPublicReviews(
  params: { page?: number | string; per_page?: number | string } = {},
  options: { signal?: AbortSignal } = {},
): Promise<PublicReviewListResponse> {
  const response = await axios.get<ApiEnvelope<{ items: PublicReview[] }>>(`${apiBaseUrl}/reviews`, {
    params,
    signal: options.signal,
    withCredentials: true,
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  });

  return {
    items: response.data.data.items,
    pagination: response.data.meta.pagination ?? {
      current_page: 1,
      last_page: 1,
      per_page: Number(params.per_page ?? 12),
      total: response.data.data.items.length,
      from: response.data.data.items.length ? 1 : null,
      to: response.data.data.items.length || null,
    },
  };
}

export async function fetchProductDetail(
  slug: string,
  options: { signal?: AbortSignal } = {},
): Promise<ProductDetailResponse> {
  const response = await axios.get<ApiEnvelope<ProductDetailResponse>>(
    `${apiBaseUrl}/products/${encodeURIComponent(slug)}`,
    {
      signal: options.signal,
      withCredentials: true,
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    },
  );

  return response.data.data;
}

export async function submitProductReview(
  slug: string,
  payload: { rating: number; comment: string },
): Promise<string> {
  const response = await authClient.post<ApiEnvelope<{ review: { id: string; status: string } }>>(
    `/products/${encodeURIComponent(slug)}/reviews`,
    payload,
  );

  return response.data.message;
}

export async function fetchShippingMethods(
  params: { country?: string; subtotal?: number } = {},
  options: { signal?: AbortSignal } = {},
): Promise<ShippingMethod[]> {
  const response = await axios.get<ApiEnvelope<{ items: ShippingMethod[] }>>(
    `${apiBaseUrl}/shipping-methods`,
    {
      params,
      signal: options.signal,
      withCredentials: true,
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    },
  );

  return response.data.data.items;
}
