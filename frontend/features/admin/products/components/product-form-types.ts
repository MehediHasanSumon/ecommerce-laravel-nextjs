"use client";

import { z } from "zod";
import type { Option } from "@/features/admin/shared/types";
import type { ProductOptions, ProductRecord } from "@/features/admin/products/types";

export type ProductMediaItem = {
  id: string;
  url: string;
  path?: string | null;
  file?: File;
  alt_text?: string;
  type?: "featured" | "gallery" | "og";
  sort_order?: number;
  is_primary?: boolean;
};

export type VariantItem = {
  id?: number | string;
  sku?: string;
  combination_key: string;
  combination_label: string;
  attribute_values: number[];
  cost_price: number | "";
  regular_price: number | "";
  selling_price: number | "";
  stock_quantity: number | "";
  is_primary: boolean;
  status: "active" | "inactive";
};

export type ProductFeatureItem = {
  id?: number;
  value: string;
};

export type ProductSpecificationItem = {
  id?: number;
  group_name?: string;
  name: string;
  value: string;
};

export type ProductFormValues = {
  // 1. Basic Information
  name: string;
  brand_id: string;
  category_id: string;
  sub_category_id: string;
  status: "draft" | "active" | "archived";
  description: string;

  // 2. Variants
  product_type: "simple" | "variable";
  // Simple pricing & inventory
  simple_cost_price: number | "";
  simple_regular_price: number | "";
  simple_selling_price: number | "";
  simple_stock_quantity: number | "";

  // Variable pricing & variants
  same_pricing_for_all: boolean;
  global_cost_price: number | "";
  global_regular_price: number | "";
  global_selling_price: number | "";
  selected_attribute_values: Record<number, number[]>; // attributeId -> array of attributeValueIds
  variants: VariantItem[];

  // 3. Images & Media
  featured_image: ProductMediaItem | null;
  gallery_images: ProductMediaItem[];

  // 4. Features
  enable_features: boolean;
  features: ProductFeatureItem[];

  // 5. Specifications
  enable_specifications: boolean;
  specifications: ProductSpecificationItem[];

  // 6. Tags
  tags: string[];
};

export const emptyProductFormValues: ProductFormValues = {
  name: "",
  brand_id: "",
  category_id: "",
  sub_category_id: "",
  status: "active",
  description: "",
  product_type: "simple",
  simple_cost_price: "",
  simple_regular_price: "",
  simple_selling_price: "",
  simple_stock_quantity: 0,
  same_pricing_for_all: true,
  global_cost_price: "",
  global_regular_price: "",
  global_selling_price: "",
  selected_attribute_values: {},
  variants: [],
  featured_image: null,
  gallery_images: [],
  enable_features: false,
  features: [],
  enable_specifications: false,
  specifications: [],
  tags: [],
};

export const productFormSchema = z.object({
  name: z.string().trim().min(2, "Product name is required (minimum 2 characters)."),
  brand_id: z.string().optional(),
  category_id: z.string().trim().min(1, "Please select a Category."),
  sub_category_id: z.string().optional(),
  status: z.enum(["draft", "active", "archived"]),
  description: z.string().optional(),
  product_type: z.enum(["simple", "variable"]),
  simple_cost_price: z.union([z.coerce.number().min(0), z.literal("")]).optional(),
  simple_regular_price: z.union([z.coerce.number().min(0), z.literal("")]).optional(),
  simple_selling_price: z.union([z.coerce.number().min(0), z.literal("")]).optional(),
  simple_stock_quantity: z.union([z.coerce.number().int().min(0), z.literal("")]).optional(),
  same_pricing_for_all: z.boolean().default(true),
  global_cost_price: z.union([z.coerce.number().min(0), z.literal("")]).optional(),
  global_regular_price: z.union([z.coerce.number().min(0), z.literal("")]).optional(),
  global_selling_price: z.union([z.coerce.number().min(0), z.literal("")]).optional(),
  selected_attribute_values: z.record(z.string(), z.array(z.number())).optional(),
  variants: z.array(z.any()).default([]),
  featured_image: z.any().nullable().optional(),
  gallery_images: z.array(z.any()).default([]),
  enable_features: z.boolean().default(false),
  features: z.array(z.object({
    id: z.number().optional(),
    value: z.string().trim(),
  })).default([]),
  enable_specifications: z.boolean().default(false),
  specifications: z.array(z.object({
    id: z.number().optional(),
    group_name: z.string().optional(),
    name: z.string().trim(),
    value: z.string().trim(),
  })).default([]),
  tags: z.array(z.string()).default([]),
}).superRefine((values, ctx) => {
  if (values.product_type === "simple") {
    if (values.simple_selling_price === "" || values.simple_selling_price === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["simple_selling_price"],
        message: "Selling price is required for simple product.",
      });
    }
  } else {
    if (values.variants.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["variants"],
        message: "Please generate at least one variant for variable product.",
      });
    }

    let primaryFound = false;
    values.variants.forEach((v, index) => {
      const variant = v as VariantItem;
      if (variant.is_primary) primaryFound = true;
      if (variant.status === "active" && (variant.selling_price === "" || variant.selling_price === undefined)) {
        ctx.addIssue({
          code: "custom",
          path: ["variants", index, "selling_price"],
          message: "Selling price is required for active variants.",
        });
      }
    });

    if (values.variants.length > 0 && !primaryFound) {
      ctx.addIssue({
        code: "custom",
        path: ["variants"],
        message: "One variant must be selected as Primary.",
      });
    }
  }
});

// Cartesian product generator
export function generateCartesianVariants(
  selectedAttributeValues: Record<number, number[]>,
  options: ProductOptions,
  currentVariants: VariantItem[] = [],
  pricing: {
    samePricing: boolean;
    cost: number | "";
    regular: number | "";
    selling: number | "";
  }
): VariantItem[] {
  // Get active attribute IDs that have selected values
  const activeAttrIds = Object.keys(selectedAttributeValues)
    .map(Number)
    .filter((attrId) => (selectedAttributeValues[attrId] || []).length > 0);

  if (activeAttrIds.length === 0) {
    return [];
  }

  // Create lookup for attribute value names
  const valueLookup = new Map<number, { name: string; attributeName: string; sortOrder?: number }>();
  options.attribute_values.forEach((val) => {
    const attr = options.attributes.find((a) => a.id === val.attribute_id);
    valueLookup.set(Number(val.id), {
      name: val.name,
      attributeName: attr?.name || "",
    });
  });

  // Prepare arrays for Cartesian product
  const arraysToCombine = activeAttrIds.map((attrId) => selectedAttributeValues[attrId] || []);

  // Compute Cartesian product
  function cartesian(arrays: number[][]): number[][] {
    return arrays.reduce<number[][]>(
      (acc, curr) => acc.flatMap((a) => curr.map((c) => [...a, c])),
      [[]]
    );
  }

  const combinations = cartesian(arraysToCombine);

  // Existing variants map for preserving existing data
  const existingMap = new Map<string, VariantItem>();
  currentVariants.forEach((v) => {
    const key = [...v.attribute_values].sort((a, b) => a - b).join(":");
    existingMap.set(key, v);
  });

  let hasPrimary = false;

  const result = combinations.map((combo, index) => {
    const sortedCombo = [...combo].sort((a, b) => a - b);
    const key = sortedCombo.join(":");
    const label = combo
      .map((valId) => valueLookup.get(valId)?.name || String(valId))
      .join(" / ");

    const existing = existingMap.get(key);
    if (existing) {
      const isPrimary = existing.is_primary;
      if (isPrimary) hasPrimary = true;
      return {
        ...existing,
        combination_key: key,
        combination_label: label,
        attribute_values: combo,
        cost_price: pricing.samePricing ? pricing.cost : existing.cost_price,
        regular_price: pricing.samePricing ? pricing.regular : existing.regular_price,
        selling_price: pricing.samePricing ? pricing.selling : existing.selling_price,
      };
    }

    const isPrimary = index === 0;
    if (isPrimary) hasPrimary = true;

    return {
      sku: "",
      combination_key: key,
      combination_label: label,
      attribute_values: combo,
      cost_price: pricing.cost,
      regular_price: pricing.regular,
      selling_price: pricing.selling,
      stock_quantity: 0,
      is_primary: isPrimary,
      status: "active" as const,
    };
  });

  // If no primary variant is set, make the first one primary
  if (!hasPrimary && result.length > 0) {
    result[0].is_primary = true;
  }

  return result;
}

// Convert ProductRecord (from API) to ProductFormValues
export function valuesFromProductRecord(
  product: ProductRecord,
  options: ProductOptions
): ProductFormValues {
  const isVariable = (product.pricing_mode === "variant" || (Array.isArray(product.variants) && product.variants.length > 0));
  
  // Extract features
  const features: ProductFeatureItem[] = Array.isArray(product.features)
    ? (product.features as Array<{ id?: number; value: string }>).map((f) => ({
        id: f.id,
        value: f.value,
      }))
    : [];

  // Extract specifications
  const specifications: ProductSpecificationItem[] = Array.isArray(product.specifications)
    ? (product.specifications as Array<{ id?: number; group_name?: string; name: string; value: string }>).map((s) => ({
        id: s.id,
        group_name: s.group_name || "",
        name: s.name || "",
        value: s.value || "",
      }))
    : [];

  // Extract tags
  const tags: string[] = Array.isArray(product.tags)
    ? (product.tags as Array<{ id: number; name: string }>).map((t) => t.name || String(t.id))
    : [];

  // Extract images
  const rawImages = Array.isArray(product.images) ? (product.images as Array<any>) : [];
  const featured = rawImages.find((img) => img.is_primary) || rawImages[0] || null;
  const gallery = rawImages.filter((img) => img !== featured);

  const featured_image: ProductMediaItem | null = featured
    ? {
        id: String(featured.id || Math.random()),
        url: featured.url,
        path: featured.path || featured.url,
        alt_text: featured.alt_text || "",
        is_primary: true,
        type: "featured",
      }
    : null;

  const gallery_images: ProductMediaItem[] = gallery.map((img, idx) => ({
    id: String(img.id || Math.random() + idx),
    url: img.url,
    path: img.path || img.url,
    alt_text: img.alt_text || "",
    is_primary: false,
    type: "gallery",
    sort_order: img.sort_order ?? idx,
  }));

  // Build variants
  const selected_attribute_values: Record<number, number[]> = {};
  const rawVariants = Array.isArray(product.variants) ? (product.variants as Array<any>) : [];

  const valueLookup = new Map<number, { name: string; attributeId: number }>();
  options.attribute_values.forEach((val) => {
    valueLookup.set(Number(val.id), {
      name: val.name,
      attributeId: Number(val.attribute_id),
    });
  });

  const variants: VariantItem[] = rawVariants.map((v, idx) => {
    const valIds: number[] = Array.isArray(v.attribute_values)
      ? v.attribute_values.map((val: any) => Number(val.id || val))
      : [];

    valIds.forEach((valId) => {
      const valInfo = valueLookup.get(valId);
      if (valInfo?.attributeId) {
        if (!selected_attribute_values[valInfo.attributeId]) {
          selected_attribute_values[valInfo.attributeId] = [];
        }
        if (!selected_attribute_values[valInfo.attributeId].includes(valId)) {
          selected_attribute_values[valInfo.attributeId].push(valId);
        }
      }
    });

    const label = valIds
      .map((valId) => valueLookup.get(valId)?.name || String(valId))
      .join(" / ");

    return {
      id: v.id,
      sku: v.sku || "",
      combination_key: v.combination_key || valIds.sort((a, b) => a - b).join(":"),
      combination_label: label || `Variant ${idx + 1}`,
      attribute_values: valIds,
      cost_price: v.cost_price_cents !== null && v.cost_price_cents !== undefined ? Number(v.cost_price_cents) / 100 : "",
      regular_price: v.compare_at_price_cents !== null && v.compare_at_price_cents !== undefined ? Number(v.compare_at_price_cents) / 100 : "",
      selling_price: v.price_cents !== null && v.price_cents !== undefined ? Number(v.price_cents) / 100 : "",
      stock_quantity: v.stock_quantity ?? 0,
      is_primary: Boolean(v.is_primary),
      status: v.status === "inactive" ? "inactive" : "active",
    };
  });

  // Check if all variants share the same pricing
  let samePricing = true;
  if (variants.length > 1) {
    const firstCost = variants[0].cost_price;
    const firstReg = variants[0].regular_price;
    const firstSell = variants[0].selling_price;
    for (let i = 1; i < variants.length; i++) {
      if (
        variants[i].cost_price !== firstCost ||
        variants[i].regular_price !== firstReg ||
        variants[i].selling_price !== firstSell
      ) {
        samePricing = false;
        break;
      }
    }
  }

  const primaryVariant = variants.find((v) => v.is_primary) || variants[0];

  let resolvedCategoryId = "";
  let resolvedSubCategoryId = "";
  if (product.category_id) {
    const matchedCategory = options.categories.find((c) => Number(c.id) === Number(product.category_id));
    if (matchedCategory && matchedCategory.parent_id) {
      resolvedCategoryId = String(matchedCategory.parent_id);
      resolvedSubCategoryId = String(matchedCategory.id);
    } else {
      resolvedCategoryId = String(product.category_id);
      resolvedSubCategoryId = "";
    }
  }

  return {
    name: product.name || "",
    brand_id: product.brand_id ? String(product.brand_id) : "",
    category_id: resolvedCategoryId,
    sub_category_id: resolvedSubCategoryId,
    status: (product.status as "draft" | "active" | "archived") || "active",
    description: (product.description as string) || "",
    product_type: isVariable ? "variable" : "simple",
    simple_cost_price: product.cost_price_cents !== null && product.cost_price_cents !== undefined ? Number(product.cost_price_cents) / 100 : "",
    simple_regular_price: product.compare_at_price_cents !== null && product.compare_at_price_cents !== undefined ? Number(product.compare_at_price_cents) / 100 : "",
    simple_selling_price: product.base_price_cents !== null && product.base_price_cents !== undefined ? Number(product.base_price_cents) / 100 : "",
    simple_stock_quantity: typeof product.stock_quantity === "number" ? product.stock_quantity : (product.stock_quantity ? Number(product.stock_quantity) : ""),
    same_pricing_for_all: samePricing,
    global_cost_price: primaryVariant ? primaryVariant.cost_price : "",
    global_regular_price: primaryVariant ? primaryVariant.regular_price : "",
    global_selling_price: primaryVariant ? primaryVariant.selling_price : "",
    selected_attribute_values,
    variants,
    featured_image,
    gallery_images,
    enable_features: features.length > 0,
    features: features.length > 0 ? features : [],
    enable_specifications: specifications.length > 0,
    specifications: specifications.length > 0 ? specifications : [],
    tags,
  };
}

// Convert Form Values to API Payload
export function productPayloadFromFormValues(values: ProductFormValues): Record<string, unknown> {
  const isVariable = values.product_type === "variable";

  // Build images array and files
  const images: Array<{ url: string; alt_text?: string; sort_order: number; is_primary: boolean }> = [];
  let featured_image_file: File | undefined;
  const gallery_image_files: File[] = [];

  if (values.featured_image) {
    if (values.featured_image.file) {
      featured_image_file = values.featured_image.file;
    } else if (values.featured_image.path || values.featured_image.url) {
      images.push({
        url: values.featured_image.path || values.featured_image.url,
        alt_text: values.featured_image.alt_text || "",
        sort_order: 0,
        is_primary: true,
      });
    }
  }

  values.gallery_images.forEach((img, idx) => {
    if (img.file) {
      gallery_image_files.push(img.file);
    } else if (img.path || img.url) {
      images.push({
        url: img.path || img.url,
        alt_text: img.alt_text || "",
        sort_order: idx + 1,
        is_primary: false,
      });
    }
  });

  const effectiveCategoryId = values.sub_category_id
    ? Number(values.sub_category_id)
    : values.category_id
    ? Number(values.category_id)
    : null;

  const payload: Record<string, unknown> = {
    name: values.name.trim(),
    brand_id: values.brand_id ? Number(values.brand_id) : null,
    category_id: effectiveCategoryId,
    status: values.status,
    description: values.description || null,
    product_type: "physical",
    pricing_mode: isVariable ? "variant" : "global",
    tags: values.tags,
    features: values.enable_features
      ? values.features.filter((f) => f.value.trim() !== "").map((f, idx) => ({
          value: f.value.trim(),
          sort_order: idx,
        }))
      : [],
    specifications: values.enable_specifications
      ? values.specifications.filter((s) => s.name.trim() !== "").map((s, idx) => ({
          group_name: s.group_name?.trim() || null,
          name: s.name.trim(),
          value: s.value.trim(),
          sort_order: idx,
        }))
      : [],
    images,
  };

  if (featured_image_file) {
    payload.featured_image_file = featured_image_file;
  }
  if (gallery_image_files.length > 0) {
    payload.gallery_image_files = gallery_image_files;
  }

  if (isVariable) {
    // Variable product variants
    payload.variants = values.variants.map((v) => ({
      id: typeof v.id === "number" ? v.id : undefined,
      attribute_values: v.attribute_values,
      cost_price_cents: v.cost_price !== "" && v.cost_price !== undefined ? Math.round(Number(v.cost_price) * 100) : null,
      compare_at_price_cents: v.regular_price !== "" && v.regular_price !== undefined ? Math.round(Number(v.regular_price) * 100) : null,
      price_cents: v.selling_price !== "" && v.selling_price !== undefined ? Math.round(Number(v.selling_price) * 100) : null,
      stock_quantity: v.stock_quantity !== "" && v.stock_quantity !== undefined ? Math.trunc(Number(v.stock_quantity)) : 0,
      track_inventory: true,
      status: v.status || "active",
      is_primary: Boolean(v.is_primary),
    }));
  } else {
    // Simple product pricing & inventory
    payload.cost_price_cents = values.simple_cost_price !== "" && values.simple_cost_price !== undefined ? Math.round(Number(values.simple_cost_price) * 100) : null;
    payload.compare_at_price_cents = values.simple_regular_price !== "" && values.simple_regular_price !== undefined ? Math.round(Number(values.simple_regular_price) * 100) : null;
    payload.base_price_cents = values.simple_selling_price !== "" && values.simple_selling_price !== undefined ? Math.round(Number(values.simple_selling_price) * 100) : null;
    payload.stock_quantity = values.simple_stock_quantity !== "" && values.simple_stock_quantity !== undefined ? Math.trunc(Number(values.simple_stock_quantity)) : 0;
    payload.track_inventory = true;
    payload.variants = [];
  }

  return payload;
}
