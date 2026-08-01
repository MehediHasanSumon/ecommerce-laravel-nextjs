import type { BaseRecord, Option } from "@/features/admin/shared/types";

export type ProductModule =
  | "brands"
  | "categories"
  | "attributes"
  | "attribute-values"
  | "tags"
  | "products"
  | "collections"
  | "currencies"
  | "discounts"
  | "reviews"
  | "comments";

export type ProductOptions = {
  brands: Option[];
  categories: Array<Option & { parent_id?: number | null }>;
  attributes: Array<Option & { type?: string | null; is_variant_defining?: boolean | null }>;
  attribute_values: Array<Option & { attribute_id?: number | null; type?: string | null; slug?: string | null }>;
  tags: Option[];
  products: Option[];
  collections: Option[];
  customers: Option[];
};

export type ProductRecord = BaseRecord & Record<string, unknown> & {
  name?: string;
  slug?: string;
  status?: string;
  pricing_mode?: "global" | "variant";
  display_sku?: string | null;
  display_price_cents?: number | null;
  display_stock_quantity?: number | null;
  display_inventory_mode?: "tracked" | "untracked" | "mixed";
};

export type ProductModulePayload = Record<string, unknown>;
