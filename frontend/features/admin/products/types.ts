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
  | "reviews";

export type ProductOptions = {
  brands: Option[];
  categories: Array<Option & { parent_id?: number | null }>;
  attributes: Array<Option & { type?: string | null; is_variant_defining?: boolean | null }>;
  attribute_values: Array<Option & { attribute_id?: number | null; type?: string | null; slug?: string | null }>;
  tags: Option[];
  products: Option[];
  collections: Option[];
};

export type ProductRecord = BaseRecord & Record<string, unknown> & {
  name?: string;
  slug?: string;
  status?: string;
};

export type ProductModulePayload = Record<string, unknown>;
