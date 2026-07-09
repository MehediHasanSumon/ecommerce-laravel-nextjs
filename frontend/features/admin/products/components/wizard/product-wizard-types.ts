"use client";

import { z } from "zod";
import type { ProductModulePayload, ProductOptions, ProductRecord } from "@/features/admin/products/types";
import { selectCurrencySettings, useSettingsStore } from "@/store/settings-store";

export type ProductWizardMode = "create" | "edit";

export type ProductMediaItem = {
  id: string;
  url: string;
  file?: File;
  alt_text: string;
  caption?: string;
  type: "featured" | "gallery" | "og" | "variant";
  sort_order: number;
  is_primary: boolean;
  progress?: number;
  status?: "ready" | "uploading" | "error";
};

export type ProductVariantDraft = {
  id: string;
  price_cents?: number;
  cost_price_cents?: number;
  stock_quantity?: number;
  status: "active" | "inactive";
  image_url?: string;
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
  base_price_cents: number | "";
  compare_at_price_cents: number | "";
  cost_price_cents: number | "";
  tax_class: string;
  currency: string;
  track_inventory: boolean;
  stock_quantity: number | "";
  stock_status: "in_stock" | "out_of_stock" | "preorder";
  low_stock_threshold: number | "";
  backorders: "deny" | "allow" | "notify";
  min_order_quantity: number | "";
  max_order_quantity: number | "";
  featured_image: ProductMediaItem | null;
  gallery_images: ProductMediaItem[];
  attribute_values: number[];
  variants: ProductVariantDraft[];
  seo: {
    meta_title: string;
    meta_description: string;
    meta_keywords: string;
    canonical_url: string;
    og_image_url: string;
  };
  shipping: {
    weight_grams: number | "";
    length_cm: number | "";
    width_cm: number | "";
    height_cm: number | "";
    shipping_class: string;
    package_info: string;
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
  { id: "pricing", title: "Pricing" },
  { id: "inventory", title: "Inventory" },
  { id: "media", title: "Images & Media" },
  { id: "variants", title: "Attributes & Variants" },
  { id: "seo", title: "SEO" },
  { id: "shipping", title: "Shipping" },
  { id: "publish", title: "Publish" },
] as const;

export type ProductWizardStepId = (typeof productWizardSteps)[number]["id"];

const optionalUrl = z.string().trim().optional().or(z.literal(""));

export const productWizardSchema = z.object({
  name: z.string().trim().min(2, "Product name is required."),
  brand_id: z.string().optional(),
  category_id: z.string().min(1, "Category is required."),
  subcategory_id: z.string().optional(),
  tags: z.array(z.string()),
  short_description: z.string().trim().min(10, "Add a short description."),
  description: z.string().optional(),
  product_type: z.enum(["physical", "digital"]),
  base_price_cents: z.coerce.number({ error: "Regular price is required." }).min(0, "Regular price cannot be negative."),
  compare_at_price_cents: z.union([z.coerce.number().min(0), z.literal("")]).optional(),
  cost_price_cents: z.union([z.coerce.number().min(0), z.literal("")]).optional(),
  tax_class: z.string().optional(),
  currency: z.string().trim().length(3, "Use a 3-letter currency code."),
  track_inventory: z.boolean(),
  stock_quantity: z.union([z.coerce.number().int().min(0), z.literal("")]).optional(),
  stock_status: z.enum(["in_stock", "out_of_stock", "preorder"]),
  low_stock_threshold: z.union([z.coerce.number().int().min(0), z.literal("")]).optional(),
  backorders: z.enum(["deny", "allow", "notify"]),
  min_order_quantity: z.union([z.coerce.number().int().min(1), z.literal("")]).optional(),
  max_order_quantity: z.union([z.coerce.number().int().min(1), z.literal("")]).optional(),
  featured_image: z.any().nullable(),
  gallery_images: z.array(z.any()).max(10, "Upload up to 10 gallery images."),
  attribute_values: z.array(z.number()),
  variants: z.array(z.any()),
  seo: z.object({
    meta_title: z.string().max(255, "Meta title must be 255 characters or fewer.").optional(),
    meta_description: z.string().optional(),
    meta_keywords: z.string().optional(),
    canonical_url: optionalUrl,
    og_image_url: z.string().optional(),
  }),
  shipping: z.object({
    weight_grams: z.union([z.coerce.number().int().min(0), z.literal("")]).optional(),
    length_cm: z.union([z.coerce.number().min(0), z.literal("")]).optional(),
    width_cm: z.union([z.coerce.number().min(0), z.literal("")]).optional(),
    height_cm: z.union([z.coerce.number().min(0), z.literal("")]).optional(),
    shipping_class: z.string().optional(),
    package_info: z.string().optional(),
  }),
  status: z.enum(["draft", "active", "archived"]),
  published_at: z.string().optional(),
  is_featured: z.boolean(),
  is_new: z.boolean(),
  is_best_seller: z.boolean(),
  is_flash_sale: z.boolean(),
  free_shipping: z.boolean(),
}).superRefine((values, ctx) => {
  if (values.track_inventory && values.stock_quantity === "") {
    ctx.addIssue({ code: "custom", path: ["stock_quantity"], message: "Stock quantity is required when inventory is tracked." });
  }
  if (values.compare_at_price_cents !== "" && Number(values.compare_at_price_cents) < Number(values.base_price_cents)) {
    ctx.addIssue({ code: "custom", path: ["compare_at_price_cents"], message: "Sale price should be greater than or equal to regular price." });
  }
  if (values.min_order_quantity !== "" && values.max_order_quantity !== "" && Number(values.max_order_quantity) < Number(values.min_order_quantity)) {
    ctx.addIssue({ code: "custom", path: ["max_order_quantity"], message: "Maximum order quantity must be greater than minimum." });
  }
});

export const stepFields: Record<ProductWizardStepId, Array<keyof ProductWizardValues | string>> = {
  basic: ["name", "brand_id", "category_id", "subcategory_id", "short_description"],
  pricing: ["base_price_cents", "compare_at_price_cents", "cost_price_cents", "tax_class", "currency"],
  inventory: ["stock_quantity", "stock_status", "low_stock_threshold", "track_inventory", "backorders", "min_order_quantity", "max_order_quantity"],
  media: ["featured_image", "gallery_images"],
  variants: ["attribute_values", "variants"],
  seo: ["seo.meta_title", "seo.meta_description", "seo.meta_keywords", "seo.canonical_url", "seo.og_image_url"],
  shipping: ["shipping.weight_grams", "shipping.length_cm", "shipping.width_cm", "shipping.height_cm", "shipping.shipping_class", "shipping.package_info"],
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
    base_price_cents: "",
    compare_at_price_cents: "",
    cost_price_cents: "",
    tax_class: "standard",
    currency: selectCurrencySettings(useSettingsStore.getState()).currency,
    track_inventory: true,
    stock_quantity: 0,
    stock_status: "in_stock",
    low_stock_threshold: 5,
    backorders: "deny",
    min_order_quantity: 1,
    max_order_quantity: "",
    featured_image: null,
    gallery_images: [],
    attribute_values: [],
    variants: [],
    seo: {
      meta_title: "",
      meta_description: "",
      meta_keywords: "",
      canonical_url: "",
      og_image_url: "",
    },
    shipping: {
      weight_grams: "",
      length_cm: "",
      width_cm: "",
      height_cm: "",
      shipping_class: "standard",
      package_info: "",
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
  return value === null || value === undefined ? "" : Number(value);
}

function mediaFromRecord(record: ProductRecord): { featured: ProductMediaItem | null; gallery: ProductMediaItem[] } {
  const images = Array.isArray(record.images) ? record.images as Array<Record<string, unknown>> : [];
  const mapped = images.map((image, index): ProductMediaItem => ({
    id: String(image.id ?? `existing-${index}`),
    url: String(image.url ?? ""),
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

  return {
    ...values,
    name: String(record.name ?? ""),
    brand_id: record.brand_id ? String(record.brand_id) : "",
    category_id: parentCategoryId,
    subcategory_id: subcategoryId,
    short_description: String(record.short_description ?? ""),
    description: String(record.description ?? ""),
    product_type: record.product_type === "digital" ? "digital" : "physical",
    base_price_cents: moneyInput(record.base_price_cents),
    compare_at_price_cents: moneyInput(record.compare_at_price_cents),
    cost_price_cents: moneyInput(record.cost_price_cents),
    currency: String(record.currency ?? selectCurrencySettings(useSettingsStore.getState()).currency),
    track_inventory: Boolean(record.track_inventory ?? true),
    stock_quantity: moneyInput(record.stock_quantity),
    stock_status: Number(record.stock_quantity ?? 0) > 0 ? "in_stock" : "out_of_stock",
    low_stock_threshold: moneyInput(record.low_stock_threshold),
    featured_image: media.featured,
    gallery_images: media.gallery,
    tags: Array.isArray(record.tags) ? record.tags.map((item) => String((item as { id: number }).id)) : [],
    attribute_values: Array.isArray(record.attribute_values) ? record.attribute_values.map((item) => Number((item as { id: number }).id)) : [],
    variants: Array.isArray(record.variants) ? record.variants.map((variant, index) => {
      const item = variant as Record<string, unknown>;
      return {
        id: String(item.id ?? `variant-${index}`),
        price_cents: item.price_cents === null || item.price_cents === undefined ? undefined : Number(item.price_cents),
        cost_price_cents: item.cost_price_cents === null || item.cost_price_cents === undefined ? undefined : Number(item.cost_price_cents),
        stock_quantity: item.stock_quantity === null || item.stock_quantity === undefined ? undefined : Number(item.stock_quantity),
        status: item.status === "inactive" ? "inactive" : "active",
        attribute_values: Array.isArray(item.attribute_values) ? item.attribute_values.map((value) => Number((value as { id: number }).id)) : [],
      };
    }) : [],
    seo: {
      meta_title: String((record.seo as Record<string, unknown> | null)?.meta_title ?? ""),
      meta_description: String((record.seo as Record<string, unknown> | null)?.meta_description ?? ""),
      meta_keywords: "",
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

export function productPayloadFromValues(values: ProductWizardValues, publish: boolean): ProductModulePayload {
  const images: ProductModulePayload[] = [];
  if (values.featured_image) {
    images.push({
      url: values.featured_image.file ? values.featured_image.url : values.featured_image.url,
      alt_text: values.featured_image.alt_text,
      type: "featured",
      sort_order: 0,
      is_primary: true,
    });
  }
  values.gallery_images.forEach((image, index) => {
    images.push({
      url: image.file ? image.url : image.url,
      alt_text: image.alt_text,
      type: "gallery",
      sort_order: index + 1,
      is_primary: false,
    });
  });

  return {
    brand_id: values.brand_id ? Number(values.brand_id) : null,
    category_id: values.subcategory_id ? Number(values.subcategory_id) : values.category_id ? Number(values.category_id) : null,
    name: values.name,
    short_description: values.short_description,
    description: values.description || null,
    product_type: values.product_type,
    status: publish ? "active" : values.status,
    base_price_cents: Number(values.base_price_cents || 0),
    compare_at_price_cents: optionalNumber(values.compare_at_price_cents),
    cost_price_cents: optionalNumber(values.cost_price_cents),
    currency: values.currency.toUpperCase(),
    track_inventory: values.track_inventory,
    stock_quantity: optionalNumber(values.stock_quantity),
    low_stock_threshold: optionalNumber(values.low_stock_threshold),
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
    seo: {
      meta_title: values.seo.meta_title || null,
      meta_description: values.seo.meta_description || null,
      canonical_url: values.seo.canonical_url || null,
      og_image_url: values.seo.og_image_url || null,
    },
    specifications: [
      values.shipping.weight_grams !== "" ? { group_name: "Shipping", name: "Weight", value: `${values.shipping.weight_grams} g`, sort_order: 0 } : null,
      values.shipping.length_cm !== "" || values.shipping.width_cm !== "" || values.shipping.height_cm !== ""
        ? { group_name: "Shipping", name: "Dimensions", value: `${values.shipping.length_cm || 0} x ${values.shipping.width_cm || 0} x ${values.shipping.height_cm || 0} cm`, sort_order: 1 }
        : null,
      values.shipping.shipping_class ? { group_name: "Shipping", name: "Shipping Class", value: values.shipping.shipping_class, sort_order: 2 } : null,
      values.shipping.package_info ? { group_name: "Shipping", name: "Package Information", value: values.shipping.package_info, sort_order: 3 } : null,
    ].filter(Boolean),
    variants: values.variants.map((variant) => ({
      price_cents: variant.price_cents ?? null,
      cost_price_cents: variant.cost_price_cents ?? null,
      stock_quantity: variant.stock_quantity ?? null,
      status: variant.status,
      attribute_values: variant.attribute_values,
    })),
  };
}

export function optionName(options: ProductOptions, collection: keyof ProductOptions, id: string | number | undefined) {
  if (!id) return "Not set";
  return options[collection].find((option) => Number(option.id) === Number(id))?.name ?? "Not set";
}
