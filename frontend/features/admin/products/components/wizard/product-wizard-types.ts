"use client";

import { z } from "zod";
import type { ProductModulePayload, ProductOptions, ProductRecord } from "@/features/admin/products/types";
import { selectCurrencySettings, useSettingsStore } from "@/store/settings-store";

export type ProductWizardMode = "create" | "edit";

export type ProductPricingMode = "global" | "variant";

export type ProductMediaItem = {
  id: string;
  url: string;
  path?: string | null;
  file?: File;
  alt_text: string;
  caption?: string;
  type: "featured" | "gallery" | "og";
  sort_order: number;
  is_primary: boolean;
  progress?: number;
  status?: "ready" | "uploading" | "error";
};

export type ProductVariantDraft = {
  id: string;
  sku: string;
  price_cents?: number;
  compare_at_price_cents?: number;
  cost_price_cents?: number;
  stock_quantity?: number | "";
  track_inventory: boolean;
  status: "active" | "inactive";
  is_primary: boolean;
  attribute_values: number[];
};

export type ProductWizardValues = {
  name: string;
  brand_id: string;
  category_id: string;
  subcategory_id: string;
  tags: string[];
  short_description: string;
  description: string;
  product_type: "physical" | "digital";
  pricing_mode: ProductPricingMode;
  base_price_cents: number | "";
  compare_at_price_cents: number | "";
  cost_price_cents: number | "";
  currency: string;
  track_inventory: boolean;
  stock_quantity: number | "";
  low_stock_threshold: number | "";
  featured_image: ProductMediaItem | null;
  gallery_images: ProductMediaItem[];
  attribute_values: number[];
  variants: ProductVariantDraft[];
  seo: {
    custom_enabled: boolean;
    meta_title: string;
    meta_description: string;
    canonical_url: string;
    og_image_url: string;
  };
  status: "draft" | "active" | "archived";
  published_at: string;
  is_featured: boolean;
  is_new: boolean;
  is_best_seller: boolean;
  is_flash_sale: boolean;
  free_shipping: boolean;
};

export const productWizardSteps = [
  { id: "basic", title: "Basic Information" },
  { id: "media", title: "Images & Media" },
  { id: "variants", title: "Pricing" },
  { id: "seo", title: "SEO" },
  { id: "publish", title: "Publish" },
] as const;

export type ProductWizardStepId = (typeof productWizardSteps)[number]["id"];

const optionalUrl = z.string().trim().optional().or(z.literal(""));
const integerInput = (min: number) => z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return "";
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : value;
}, z.union([z.number().int().min(min), z.literal("")])).optional();

export const productWizardSchema = z.object({
  name: z.string().trim().min(2, "Product name is required."),
  brand_id: z.string().optional(),
  category_id: z.string().min(1, "Category is required."),
  subcategory_id: z.string().optional(),
  tags: z.array(z.string()),
  short_description: z.string().trim().min(10, "Add a short description."),
  description: z.string().optional(),
  product_type: z.enum(["physical", "digital"]),
  pricing_mode: z.enum(["global", "variant"]),
  base_price_cents: z.union([z.coerce.number().min(0, "Regular price cannot be negative."), z.literal("")]),
  compare_at_price_cents: z.union([z.coerce.number().min(0), z.literal("")]).optional(),
  cost_price_cents: z.union([z.coerce.number().min(0), z.literal("")]).optional(),
  currency: z.string().trim().optional(),
  track_inventory: z.boolean(),
  stock_quantity: integerInput(0),
  low_stock_threshold: integerInput(0),
  featured_image: z.any().nullable(),
  gallery_images: z.array(z.any()).max(10, "Upload up to 10 gallery images."),
  attribute_values: z.array(z.number()),
  variants: z.array(z.any()),
  seo: z.object({
    custom_enabled: z.boolean(),
    meta_title: z.string().max(255, "Meta title must be 255 characters or fewer.").optional(),
    meta_description: z.string().optional(),
    canonical_url: optionalUrl,
    og_image_url: z.string().optional(),
  }),
  status: z.enum(["draft", "active", "archived"]),
  published_at: z.string().optional(),
  is_featured: z.boolean(),
  is_new: z.boolean(),
  is_best_seller: z.boolean(),
  is_flash_sale: z.boolean(),
  free_shipping: z.boolean(),
}).superRefine((values, ctx) => {
  if (values.pricing_mode === "global" && values.base_price_cents === "") {
    ctx.addIssue({ code: "custom", path: ["base_price_cents"], message: "Sell price is required for global product pricing." });
  }
  if (values.variants.length === 0 && values.track_inventory && values.stock_quantity === "") {
    ctx.addIssue({ code: "custom", path: ["stock_quantity"], message: "Stock quantity is required when inventory is tracked." });
  }
  if (
    values.pricing_mode === "global"
    && values.base_price_cents !== ""
    && values.compare_at_price_cents !== ""
    && Number(values.compare_at_price_cents) < Number(values.base_price_cents)
  ) {
    ctx.addIssue({ code: "custom", path: ["compare_at_price_cents"], message: "Regular price must be greater than or equal to the sell price." });
  }
  const variantKeys = new Set<string>();
  const variantSkus = new Set<string>();
  values.variants.forEach((variant, index) => {
    const item = variant as ProductVariantDraft;
    const key = [...item.attribute_values].sort((a, b) => a - b).join(":");
    if (variantKeys.has(key)) {
      ctx.addIssue({ code: "custom", path: ["variants", index, "attribute_values"], message: "Duplicate variant combinations are not allowed." });
    }
    variantKeys.add(key);
    const sku = item.sku.trim().toUpperCase();
    if (sku && variantSkus.has(sku)) {
      ctx.addIssue({ code: "custom", path: ["variants", index, "sku"], message: "Variant SKUs must be unique." });
    }
    if (sku) variantSkus.add(sku);
    if (
      values.pricing_mode === "variant"
      && item.status === "active"
      && (item.price_cents === undefined || item.price_cents === null)
    ) {
      ctx.addIssue({ code: "custom", path: ["variants", index, "price_cents"], message: "Active variants require a sell price." });
    }
    if (item.status === "active" && item.track_inventory && item.stock_quantity === "") {
      ctx.addIssue({ code: "custom", path: ["variants", index, "stock_quantity"], message: "Stock is required when variant inventory is tracked." });
    }
    if (
      values.pricing_mode === "variant"
      &&
      item.price_cents !== undefined
      && item.compare_at_price_cents !== undefined
      && Number(item.compare_at_price_cents) < Number(item.price_cents)
    ) {
      ctx.addIssue({ code: "custom", path: ["variants", index, "compare_at_price_cents"], message: "Regular price must be greater than or equal to the sell price." });
    }
  });
  if (values.pricing_mode === "variant" && values.variants.length === 0) {
    ctx.addIssue({ code: "custom", path: ["variants"], message: "Variant pricing requires at least one variant." });
  }
});

export const stepFields: Record<ProductWizardStepId, Array<keyof ProductWizardValues | string>> = {
  basic: ["name", "brand_id", "category_id", "subcategory_id", "short_description"],
  media: ["featured_image", "gallery_images"],
  variants: ["pricing_mode", "base_price_cents", "compare_at_price_cents", "cost_price_cents", "stock_quantity", "low_stock_threshold", "track_inventory", "attribute_values", "variants"],
  seo: ["seo.custom_enabled", "seo.meta_title", "seo.meta_description", "seo.canonical_url", "seo.og_image_url"],
  publish: ["status", "published_at"],
};

export function emptyProductWizardValues(): ProductWizardValues {
  return {
    name: "",
    brand_id: "",
    category_id: "",
    subcategory_id: "",
    tags: [],
    short_description: "",
    description: "",
    product_type: "physical",
    pricing_mode: "global",
    base_price_cents: "",
    compare_at_price_cents: "",
    cost_price_cents: "",
    currency: selectCurrencySettings(useSettingsStore.getState()).currency,
    track_inventory: true,
    stock_quantity: 0,
    low_stock_threshold: 5,
    featured_image: null,
    gallery_images: [],
    attribute_values: [],
    variants: [],
    seo: {
      custom_enabled: false,
      meta_title: "",
      meta_description: "",
      canonical_url: "",
      og_image_url: "",
    },
    status: "draft",
    published_at: "",
    is_featured: false,
    is_new: false,
    is_best_seller: false,
    is_flash_sale: false,
    free_shipping: false,
  };
}

function moneyInput(value: unknown): number | "" {
  return value === null || value === undefined ? "" : Number(value) / 100;
}

function quantityInput(value: unknown): number | "" {
  if (value === null || value === undefined || value === "") return "";
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : "";
}

function mediaFromRecord(record: ProductRecord): { featured: ProductMediaItem | null; gallery: ProductMediaItem[] } {
  const images = Array.isArray(record.images) ? record.images as Array<Record<string, unknown>> : [];
  const mapped = images.map((image, index): ProductMediaItem => ({
    id: String(image.id ?? `existing-${index}`),
    url: String(image.url ?? ""),
    path: typeof image.path === "string" ? image.path : null,
    alt_text: String(image.alt_text ?? ""),
    caption: "",
    type: Boolean(image.is_primary) || image.type === "featured" ? "featured" : "gallery",
    sort_order: Number(image.sort_order ?? index),
    is_primary: Boolean(image.is_primary),
    progress: 100,
    status: "ready",
  })).filter((image) => image.url);

  return {
    featured: mapped.find((image) => image.is_primary || image.type === "featured") ?? null,
    gallery: mapped.filter((image) => !image.is_primary && image.type !== "featured").sort((a, b) => a.sort_order - b.sort_order),
  };
}

export function valuesFromProduct(record?: ProductRecord | null, options?: ProductOptions): ProductWizardValues {
  const values = emptyProductWizardValues();
  if (!record) return values;
  const media = mediaFromRecord(record);
  const selectedCategoryId = record.category_id ? String(record.category_id) : "";
  const selectedCategory = options?.categories.find((category) => String(category.id) === selectedCategoryId);
  const parentCategoryId = selectedCategory?.parent_id ? String(selectedCategory.parent_id) : selectedCategoryId;
  const subcategoryId = selectedCategory?.parent_id ? selectedCategoryId : "";
  const recordVariants = Array.isArray(record.variants) ? record.variants : [];
  const pricingMode = record.pricing_mode === "variant"
    || (
      record.pricing_mode !== "global"
      && recordVariants.some((variant) => {
        const item = variant as Record<string, unknown>;
        return item.price_cents !== null && item.price_cents !== undefined;
      })
      && (record.base_price_cents === null || record.base_price_cents === undefined)
    )
    ? "variant"
    : "global";

  return {
    ...values,
    name: String(record.name ?? ""),
    brand_id: record.brand_id ? String(record.brand_id) : "",
    category_id: parentCategoryId,
    subcategory_id: subcategoryId,
    short_description: String(record.short_description ?? ""),
    description: String(record.description ?? ""),
    product_type: record.product_type === "digital" ? "digital" : "physical",
    pricing_mode: pricingMode,
    base_price_cents: moneyInput(record.base_price_cents),
    compare_at_price_cents: moneyInput(record.compare_at_price_cents),
    cost_price_cents: moneyInput(record.cost_price_cents),
    currency: String(record.currency ?? selectCurrencySettings(useSettingsStore.getState()).currency),
    track_inventory: Boolean(record.track_inventory ?? true),
    stock_quantity: quantityInput(record.stock_quantity),
    low_stock_threshold: quantityInput(record.low_stock_threshold),
    featured_image: media.featured,
    gallery_images: media.gallery,
    tags: Array.isArray(record.tags) ? record.tags.map((item) => String((item as { id: number }).id)) : [],
    attribute_values: Array.isArray(record.attribute_values) ? record.attribute_values.map((item) => Number((item as { id: number }).id)) : [],
    variants: Array.isArray(record.variants) ? record.variants.map((variant, index) => {
      const item = variant as Record<string, unknown>;
      return {
        id: String(item.id ?? `variant-${index}`),
        sku: typeof item.sku === "string" ? item.sku : "",
        price_cents: item.price_cents === null || item.price_cents === undefined ? undefined : Number(item.price_cents) / 100,
        compare_at_price_cents: item.compare_at_price_cents === null || item.compare_at_price_cents === undefined ? undefined : Number(item.compare_at_price_cents) / 100,
        cost_price_cents: item.cost_price_cents === null || item.cost_price_cents === undefined ? undefined : Number(item.cost_price_cents) / 100,
        stock_quantity: item.stock_quantity === null || item.stock_quantity === undefined ? "" : quantityInput(item.stock_quantity),
        track_inventory: typeof item.track_inventory === "boolean" ? item.track_inventory : true,
        status: item.status === "inactive" ? "inactive" : "active",
        is_primary: Boolean(item.is_primary) || (!recordVariants.some((candidate) => Boolean((candidate as Record<string, unknown>).is_primary)) && index === 0),
        attribute_values: Array.isArray(item.attribute_values) ? item.attribute_values.map((value) => Number((value as { id: number }).id)) : [],
      };
    }) : [],
    seo: {
      custom_enabled: Boolean(
        String((record.seo as Record<string, unknown> | null)?.meta_title ?? "").trim()
        || String((record.seo as Record<string, unknown> | null)?.meta_description ?? "").trim()
        || String((record.seo as Record<string, unknown> | null)?.canonical_url ?? "").trim()
        || String((record.seo as Record<string, unknown> | null)?.og_image_url ?? "").trim()
      ),
      meta_title: String((record.seo as Record<string, unknown> | null)?.meta_title ?? ""),
      meta_description: String((record.seo as Record<string, unknown> | null)?.meta_description ?? ""),
      canonical_url: String((record.seo as Record<string, unknown> | null)?.canonical_url ?? ""),
      og_image_url: String((record.seo as Record<string, unknown> | null)?.og_image_url ?? ""),
    },
    status: record.status === "active" || record.status === "archived" ? record.status : "draft",
    published_at: typeof record.published_at === "string" ? record.published_at.slice(0, 10) : "",
    is_featured: Boolean(record.is_featured),
    is_new: Boolean(record.is_new),
    is_best_seller: Boolean(record.is_best_seller),
    is_flash_sale: Boolean(record.is_flash_sale),
    free_shipping: Boolean(record.free_shipping),
  };
}

function optionalNumber(value: number | "" | undefined) {
  return value === "" || value === undefined ? null : Number(value);
}

function amountToCents(value: number | "" | undefined) {
  return value === "" || value === undefined ? null : Math.round(Number(value) * 100);
}

function storagePath(image: ProductMediaItem) {
  const source = image.path || image.url;
  if (!source || source.startsWith("blob:") || source.startsWith("data:")) return null;
  try {
    const parsed = new URL(source);
    const storageIndex = parsed.pathname.indexOf("/storage/");
    if (storageIndex >= 0) {
      return parsed.pathname.slice(storageIndex + "/storage/".length);
    }
    return null;
  } catch {
    // Relative storage path.
  }

  const path = source.replace(/^\/?storage\//, "");

  return path.includes(":") ? null : path;
}

export function productPayloadFromValues(values: ProductWizardValues, publish: boolean, includeBrand = true): ProductModulePayload {
  const images: ProductModulePayload[] = [];
  if (values.featured_image && !values.featured_image.file) {
    const path = storagePath(values.featured_image);
    if (path) {
    images.push({
      url: path,
      alt_text: values.featured_image.alt_text,
      type: "featured",
      sort_order: 0,
      is_primary: true,
    });
    }
  }
  values.gallery_images.forEach((image, index) => {
    if (image.file) return;
    const path = storagePath(image);
    if (!path) return;
    images.push({
      url: path,
      alt_text: image.alt_text,
      type: "gallery",
      sort_order: index + 1,
      is_primary: false,
    });
  });
  const variants = values.variants.map((variant) => {
    const usesVariantPricing = values.pricing_mode === "variant";

    return {
      sku: variant.sku.trim() || null,
      price_cents: usesVariantPricing ? amountToCents(variant.price_cents) : null,
      compare_at_price_cents: usesVariantPricing ? amountToCents(variant.compare_at_price_cents) : null,
      cost_price_cents: usesVariantPricing ? amountToCents(variant.cost_price_cents) : null,
      stock_quantity: optionalNumber(variant.stock_quantity),
      track_inventory: variant.track_inventory,
      status: variant.status,
      attribute_values: variant.attribute_values,
    };
  });

  const payload: ProductModulePayload = {
    category_id: values.subcategory_id ? Number(values.subcategory_id) : values.category_id ? Number(values.category_id) : null,
    name: values.name,
    short_description: values.short_description,
    description: values.description || null,
    product_type: values.product_type,
    status: publish ? "active" : values.status,
    pricing_mode: values.pricing_mode,
    base_price_cents: values.pricing_mode === "global" ? amountToCents(values.base_price_cents) : null,
    compare_at_price_cents: values.pricing_mode === "global" ? amountToCents(values.compare_at_price_cents) : null,
    cost_price_cents: values.pricing_mode === "global" ? amountToCents(values.cost_price_cents) : null,
    track_inventory: variants.length ? false : values.track_inventory,
    stock_quantity: variants.length ? null : optionalNumber(values.stock_quantity),
    low_stock_threshold: variants.length ? null : optionalNumber(values.low_stock_threshold),
    is_featured: values.is_featured,
    is_new: values.is_new,
    is_best_seller: values.is_best_seller,
    is_flash_sale: values.is_flash_sale,
    free_shipping: values.free_shipping,
    published_at: publish ? new Date().toISOString() : values.published_at || null,
    tags: values.tags,
    attribute_values: values.attribute_values,
    images,
    featured_image_file: values.featured_image?.file,
    gallery_image_files: values.gallery_images.map((image) => image.file).filter(Boolean),
    seo: values.seo.custom_enabled ? {
      meta_title: values.seo.meta_title || null,
      meta_description: values.seo.meta_description || null,
      canonical_url: values.seo.canonical_url || null,
      og_image_url: values.seo.og_image_url || null,
    } : null,
    variants,
  };

  if (includeBrand) {
    payload.brand_id = values.brand_id ? Number(values.brand_id) : null;
  }

  return payload;
}

export function optionName(options: ProductOptions, collection: keyof ProductOptions, id: string | number | undefined) {
  if (!id) return "Not set";
  return options[collection].find((option) => Number(option.id) === Number(id))?.name ?? "Not set";
}
