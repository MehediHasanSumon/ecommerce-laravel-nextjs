"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Download,
  Edit3,
  Filter,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDeleteConfirmation } from "@/hooks/use-delete-confirmation";
import { routePaths } from "@/constants/routes";
import { useUrlQueryState } from "@/features/admin/shared/hooks/use-url-query-state";
import { productManagementService } from "@/features/admin/products/services/product-management-service";
import type { ProductModule, ProductModulePayload, ProductOptions, ProductRecord } from "@/features/admin/products/types";
import type { Option, PaginationMeta, QueryState } from "@/features/admin/shared/types";
import { exportCsv, formatDate, statusLabel } from "@/features/admin/shared/utils";
import { TableSkeleton } from "@/components/ui/skeleton";
import { toAppError } from "@/lib/errors";
import { selectCategoryDisplaySettings, selectCurrencySettings, useSettingsStore } from "@/store/settings-store";
import type { RuntimeCategoryDisplaySettings } from "@/types/settings";
import { cn } from "@/utils/cn";
import { formatCurrency } from "@/utils/format";

export type DrawerMode = "create" | "edit";
type FieldType = "text" | "textarea" | "number" | "select" | "multiselect" | "checkbox" | "date" | "file";

type FieldConfig = {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  options?: string[] | keyof ProductOptions;
  optional?: boolean;
  tab?: string;
  existingImageField?: string;
  maxSizeMb?: number;
  showWhen?: (values: ProductModulePayload) => boolean;
};

export type ModuleConfig = {
  module: ProductModule;
  title: string;
  description: string;
  createLabel: string;
  defaultSort: string;
  fields: FieldConfig[];
  columns: Array<{ key: string; label: string; sortable?: boolean; render?: (item: ProductRecord) => ReactNode }>;
  statuses?: string[];
  types?: string[];
};

const pageSizes = [10, 20, 50, 100];
const emptyOptions: ProductOptions = {
  brands: [],
  categories: [],
  attributes: [],
  attribute_values: [],
  tags: [],
  warehouses: [],
  products: [],
};

const commonStatus = ["active", "inactive"];
const homeSectionAnchors = [
  "feature_cards",
  "categories",
  "promo_banners",
  "top_brands",
  "products",
  "reviews",
  "blog",
  "newsletter",
];

export const productModuleConfigs: Record<ProductModule, ModuleConfig> = {
  brands: {
    module: "brands",
    title: "Brand Management",
    description: "Manage product brands, media, featured state, and availability.",
    createLabel: "Create Brand",
    defaultSort: "created_at",
    statuses: commonStatus,
    fields: [
      { name: "name", label: "Name", type: "text" },
      { name: "description", label: "Description", type: "textarea", optional: true },
      { name: "logo_file", label: "Logo", type: "file", optional: true, existingImageField: "logo_url", maxSizeMb: 2 },
      { name: "cover_image_file", label: "Cover Image", type: "file", optional: true, existingImageField: "cover_image_url", maxSizeMb: 4 },
      { name: "website_url", label: "Website URL", type: "text", optional: true },
      { tab: "SEO", name: "meta_title", label: "Meta Title", type: "text", optional: true },
      { tab: "SEO", name: "meta_description", label: "Meta Description", type: "textarea", optional: true },
      { tab: "SEO", name: "meta_keywords", label: "Meta Keywords", type: "textarea", optional: true },
      { tab: "SEO", name: "canonical_url", label: "Canonical URL", type: "text", optional: true },
      { tab: "SEO", name: "og_title", label: "OG Title", type: "text", optional: true },
      { tab: "SEO", name: "og_description", label: "OG Description", type: "textarea", optional: true },
      { tab: "SEO", name: "og_image_url", label: "OG Image URL", type: "text", optional: true },
      { name: "is_featured", label: "Featured", type: "checkbox", optional: true },
      { name: "status", label: "Status", type: "select", options: commonStatus },
    ],
    columns: [
      { key: "name", label: "Name", sortable: true, render: (item) => <span className="font-semibold">{String(item.name ?? "")}</span> },
      { key: "slug", label: "Slug", sortable: true },
      { key: "status", label: "Status", sortable: true, render: (item) => <StatusBadge value={String(item.status ?? "active")} /> },
      { key: "products_count", label: "Products" },
      { key: "created_at", label: "Created At", sortable: true, render: (item) => formatDate(item.created_at) },
    ],
  },
  categories: {
    module: "categories",
    title: "Category Management",
    description: "Organize product taxonomy with hierarchy, icons, images, and ordering.",
    createLabel: "Create Category",
    defaultSort: "created_at",
    statuses: commonStatus,
    fields: [
      { name: "parent_id", label: "Parent Category", type: "select", options: "categories", optional: true },
      { name: "name", label: "Name", type: "text" },
      { name: "description", label: "Description", type: "textarea", optional: true },
      { name: "image_file", label: "Category Image", type: "file", optional: true, existingImageField: "image_url", maxSizeMb: 4 },
      { name: "icon", label: "Icon", type: "text", optional: true },
      { tab: "SEO", name: "meta_title", label: "Meta Title", type: "text", optional: true },
      { tab: "SEO", name: "meta_description", label: "Meta Description", type: "textarea", optional: true },
      { tab: "SEO", name: "meta_keywords", label: "Meta Keywords", type: "textarea", optional: true },
      { tab: "SEO", name: "canonical_url", label: "Canonical URL", type: "text", optional: true },
      { tab: "SEO", name: "og_title", label: "OG Title", type: "text", optional: true },
      { tab: "SEO", name: "og_description", label: "OG Description", type: "textarea", optional: true },
      { tab: "SEO", name: "og_image_url", label: "OG Image URL", type: "text", optional: true },
      { name: "show_on_home", label: "Show On Home", type: "checkbox", optional: true },
      { name: "show_in_navbar", label: "Show In Navbar", type: "checkbox", optional: true },
      { name: "home_display_order", label: "Home Display Order", type: "number", optional: true },
      { name: "navbar_display_order", label: "Navbar Display Order", type: "number", optional: true },
      { name: "is_featured", label: "Featured", type: "checkbox", optional: true },
      { name: "sort_order", label: "Sort Order", type: "number", optional: true },
      { name: "status", label: "Status", type: "select", options: commonStatus },
    ],
    columns: [
      { key: "name", label: "Name", sortable: true, render: (item) => <span className="font-semibold">{String(item.name ?? "")}</span> },
      { key: "parent", label: "Parent", render: (item) => optionName(item.parent) },
      { key: "sort_order", label: "Sort" },
      { key: "status", label: "Status", sortable: true, render: (item) => <StatusBadge value={String(item.status ?? "active")} /> },
      { key: "created_at", label: "Created At", sortable: true, render: (item) => formatDate(item.created_at) },
    ],
  },
  attributes: {
    module: "attributes",
    title: "Attribute Management",
    description: "Define reusable product attributes for filters and variant generation.",
    createLabel: "Create Attribute",
    defaultSort: "sort_order",
    types: ["text", "color", "image", "number", "select"],
    fields: [
      { name: "name", label: "Name", type: "text" },
      { name: "type", label: "Type", type: "select", options: ["text", "color", "image", "number", "select"] },
      { name: "is_filterable", label: "Filterable", type: "checkbox", optional: true },
      { name: "is_variant_defining", label: "Variant Defining", type: "checkbox", optional: true },
      { name: "sort_order", label: "Sort Order", type: "number", optional: true },
    ],
    columns: [
      { key: "name", label: "Name", sortable: true, render: (item) => <span className="font-semibold">{String(item.name ?? "")}</span> },
      { key: "type", label: "Type", sortable: true, render: (item) => statusLabel(String(item.type ?? "")) },
      { key: "is_filterable", label: "Filterable", render: (item) => boolLabel(item.is_filterable) },
      { key: "is_variant_defining", label: "Variant", render: (item) => boolLabel(item.is_variant_defining) },
      { key: "values_count", label: "Values" },
    ],
  },
  "attribute-values": {
    module: "attribute-values",
    title: "Attribute Value Management",
    description: "Maintain values such as colors, sizes, storage capacities, and materials.",
    createLabel: "Create Value",
    defaultSort: "sort_order",
    fields: [
      { name: "attribute_id", label: "Attribute", type: "select", options: "attributes" },
      { name: "value", label: "Value", type: "text" },
      { name: "display_value", label: "Display Value", type: "text", optional: true },
      { name: "hex_color", label: "Hex Color", type: "text", optional: true },
      { name: "sort_order", label: "Sort Order", type: "number", optional: true },
    ],
    columns: [
      { key: "value", label: "Value", sortable: true, render: (item) => <span className="font-semibold">{String(item.value ?? "")}</span> },
      { key: "attribute", label: "Attribute", render: (item) => optionName(item.attribute) },
      { key: "hex_color", label: "Color", render: (item) => item.hex_color ? <span className="inline-flex items-center gap-2"><span className="h-4 w-4 rounded border border-border" style={{ backgroundColor: String(item.hex_color) }} />{String(item.hex_color)}</span> : "None" },
      { key: "sort_order", label: "Sort" },
    ],
  },
  tags: {
    module: "tags",
    title: "Tag Management",
    description: "Create lightweight tags for merchandising, discovery, and grouping.",
    createLabel: "Create Tag",
    defaultSort: "created_at",
    fields: [
      { name: "name", label: "Name", type: "text" },
    ],
    columns: [
      { key: "name", label: "Name", sortable: true, render: (item) => <span className="font-semibold">{String(item.name ?? "")}</span> },
      { key: "slug", label: "Slug", sortable: true },
      { key: "products_count", label: "Products" },
      { key: "created_at", label: "Created At", sortable: true, render: (item) => formatDate(item.created_at) },
    ],
  },
  warehouses: {
    module: "warehouses",
    title: "Warehouse Management",
    description: "Manage warehouse locations used by inventory and stock movements.",
    createLabel: "Create Warehouse",
    defaultSort: "created_at",
    statuses: commonStatus,
    fields: [
      { name: "name", label: "Name", type: "text" },
      { name: "code", label: "Code", type: "text" },
      { name: "status", label: "Status", type: "select", options: commonStatus },
      { name: "address", label: "Address", type: "textarea", optional: true },
      { name: "city", label: "City", type: "text", optional: true },
      { name: "state", label: "State", type: "text", optional: true },
      { name: "country", label: "Country", type: "text", optional: true },
      { name: "postal_code", label: "Postal Code", type: "text", optional: true },
    ],
    columns: [
      { key: "name", label: "Name", sortable: true, render: (item) => <span className="font-semibold">{String(item.name ?? "")}</span> },
      { key: "code", label: "Code" },
      { key: "status", label: "Status", sortable: true, render: (item) => <StatusBadge value={String(item.status ?? "active")} /> },
      { key: "city", label: "City" },
      { key: "country", label: "Country" },
    ],
  },
  products: {
    module: "products",
    title: "Product Management",
    description: "Manage catalog products with pricing, inventory, media, SEO, and variants.",
    createLabel: "Create Product",
    defaultSort: "created_at",
    statuses: ["draft", "active", "archived"],
    types: ["physical", "digital"],
    fields: productFields(),
    columns: [
      { key: "name", label: "Product", sortable: true, render: (item) => <div><p className="font-semibold">{String(item.name ?? "")}</p><p className="text-xs text-muted-foreground">{String(item.sku ?? "No SKU")}</p></div> },
      { key: "brand", label: "Brand", render: (item) => optionName(item.brand) },
      { key: "category", label: "Category", render: (item) => optionName(item.category) },
      { key: "base_price_cents", label: "Price", sortable: true, render: (item) => money(item.base_price_cents, item.currency) },
      { key: "stock_quantity", label: "Stock", sortable: true },
      { key: "status", label: "Status", sortable: true, render: (item) => <StatusBadge value={String(item.status ?? "draft")} /> },
    ],
  },
  collections: {
    module: "collections",
    title: "Collection Management",
    description: "Build smart and manual promotional collections for storefront merchandising.",
    createLabel: "Create Collection",
    defaultSort: "home_sort_order",
    statuses: commonStatus,
    types: ["manual", "smart"],
    fields: [
      { tab: "Basic", name: "name", label: "Name", type: "text" },
      { tab: "Basic", name: "description", label: "Description", type: "textarea", optional: true },
      { tab: "Basic", name: "collection_type", label: "Collection Type", type: "select", options: ["manual", "smart"] },
      { tab: "Basic", name: "rule_key", label: "Smart Rule", type: "select", options: ["flash_sale", "trending", "best_sellers", "new_arrivals", "recently_added", "featured", "custom"], optional: true, showWhen: (values) => values.collection_type === "smart" },
      { tab: "Basic", name: "rules", label: "Custom Rules JSON", type: "textarea", optional: true, showWhen: (values) => values.collection_type === "smart" && values.rule_key === "custom" },
      { tab: "Basic", name: "status", label: "Status", type: "select", options: commonStatus },
      { tab: "Basic", name: "is_featured", label: "Featured Collection", type: "checkbox", optional: true },
      { tab: "Home", name: "show_on_home", label: "Show On Home", type: "checkbox", optional: true },
      { tab: "Home", name: "display_position_placement", label: "Display Placement", type: "select", options: ["before", "after"] },
      { tab: "Home", name: "display_position_anchor", label: "Display Position", type: "select", options: homeSectionAnchors },
      { tab: "Home", name: "home_sort_order", label: "Home Sort Order", type: "number", optional: true },
      { tab: "Home", name: "product_limit", label: "Product Limit", type: "number", optional: true },
      { tab: "Home", name: "priority", label: "Priority", type: "number", optional: true },
      { tab: "Schedule", name: "starts_at", label: "Start Date", type: "date", optional: true },
      { tab: "Schedule", name: "ends_at", label: "End Date", type: "date", optional: true },
      { tab: "Discount", name: "discount_enabled", label: "Discount Enabled", type: "checkbox", optional: true },
      { tab: "Discount", name: "discount_type", label: "Discount Type", type: "select", options: ["percentage", "fixed"], optional: true, showWhen: (values) => Boolean(values.discount_enabled) },
      { tab: "Discount", name: "discount_value", label: "Discount Value", type: "number", optional: true, showWhen: (values) => Boolean(values.discount_enabled) },
      { tab: "Discount", name: "discount_apply_to", label: "Apply Discount To", type: "select", options: ["entire_collection", "selected_products"], showWhen: (values) => Boolean(values.discount_enabled) },
      { tab: "Products", name: "products", label: "Products", type: "multiselect", options: "products", optional: true },
      { tab: "Media", name: "banner_image_file", label: "Desktop Banner", type: "file", optional: true, existingImageField: "banner_image_url", maxSizeMb: 5 },
      { tab: "Media", name: "mobile_banner_image_file", label: "Mobile Banner", type: "file", optional: true, existingImageField: "mobile_banner_image_url", maxSizeMb: 5 },
      { tab: "Media", name: "logo_file", label: "Collection Logo", type: "file", optional: true, existingImageField: "logo_url", maxSizeMb: 2 },
      { tab: "Content", name: "display_title", label: "Display Title", type: "text", optional: true },
      { tab: "Content", name: "subtitle", label: "Subtitle", type: "text", optional: true },
      { tab: "Content", name: "promotional_text", label: "Promotional Text", type: "text", optional: true },
      { tab: "Content", name: "cta_text", label: "CTA Text", type: "text", optional: true },
      { tab: "Content", name: "cta_url", label: "CTA URL", type: "text", optional: true },
      { tab: "SEO", name: "route_aliases", label: "Route Aliases JSON", type: "textarea", optional: true },
      { tab: "SEO", name: "meta_title", label: "Meta Title", type: "text", optional: true },
      { tab: "SEO", name: "meta_description", label: "Meta Description", type: "textarea", optional: true },
      { tab: "SEO", name: "meta_keywords", label: "Meta Keywords", type: "textarea", optional: true },
      { tab: "SEO", name: "canonical_url", label: "Canonical URL", type: "text", optional: true },
      { tab: "SEO", name: "og_title", label: "OG Title", type: "text", optional: true },
      { tab: "SEO", name: "og_description", label: "OG Description", type: "textarea", optional: true },
      { tab: "SEO", name: "og_image_url", label: "OG Image URL", type: "text", optional: true },
    ],
    columns: [
      { key: "name", label: "Name", sortable: true, render: (item) => <span className="font-semibold">{String(item.name ?? "")}</span> },
      { key: "collection_type", label: "Type", sortable: true, render: (item) => statusLabel(String(item.collection_type ?? item.type ?? "")) },
      { key: "status", label: "Status", sortable: true, render: (item) => <StatusBadge value={String(item.status ?? "active")} /> },
      { key: "show_on_home", label: "Home", render: (item) => boolLabel(item.show_on_home) },
      { key: "display_position_anchor", label: "Position", render: (item) => `${statusLabel(String(item.display_position_placement ?? "before"))} ${statusLabel(String(item.display_position_anchor ?? "products"))}` },
      { key: "home_sort_order", label: "Sort", sortable: true },
      { key: "priority", label: "Priority", sortable: true },
      { key: "products_count", label: "Products" },
    ],
  },
  currencies: {
    module: "currencies",
    title: "Currency Management",
    description: "Manage country-specific currencies used by company settings and price formatting.",
    createLabel: "Create Currency",
    defaultSort: "country",
    statuses: commonStatus,
    fields: [
      { name: "country", label: "Country", type: "text" },
      { name: "currency", label: "Currency", type: "text" },
      { name: "symbol", label: "Symbol", type: "text" },
      { name: "status", label: "Status", type: "select", options: commonStatus },
    ],
    columns: [
      { key: "country", label: "Country", sortable: true, render: (item) => <span className="font-semibold">{String(item.country ?? "")}</span> },
      { key: "currency", label: "Currency", sortable: true },
      { key: "symbol", label: "Symbol" },
      { key: "status", label: "Status", sortable: true, render: (item) => <StatusBadge value={String(item.status ?? "active")} /> },
      { key: "created_at", label: "Created At", sortable: true, render: (item) => formatDate(item.created_at) },
    ],
  },
  discounts: {
    module: "discounts",
    title: "Discount Management",
    description: "Manage coupon codes, discount rules, free shipping, limits, and catalog eligibility.",
    createLabel: "Create Discount",
    defaultSort: "created_at",
    statuses: commonStatus,
    types: ["fixed", "percentage"],
    fields: [
      { tab: "Basic", name: "name", label: "Name", type: "text" },
      { tab: "Basic", name: "code", label: "Coupon Code", type: "text", optional: true },
      { tab: "Basic", name: "type", label: "Discount Type", type: "select", options: ["fixed", "percentage"] },
      { tab: "Basic", name: "value", label: "Discount Value", type: "number" },
      { tab: "Basic", name: "status", label: "Status", type: "select", options: commonStatus },
      { tab: "Rules", name: "minimum_order_amount", label: "Minimum Order Amount", type: "number", optional: true },
      { tab: "Rules", name: "maximum_discount", label: "Maximum Discount", type: "number", optional: true, showWhen: (values) => values.type === "percentage" },
      { tab: "Rules", name: "usage_limit", label: "Usage Limit", type: "number", optional: true },
      { tab: "Rules", name: "usage_per_customer", label: "Usage Per Customer", type: "number", optional: true },
      { tab: "Rules", name: "first_order_only", label: "First Order Only", type: "checkbox", optional: true },
      { tab: "Rules", name: "free_shipping", label: "Free Shipping", type: "checkbox", optional: true },
      { tab: "Rules", name: "stackable", label: "Stackable", type: "checkbox", optional: true },
      { tab: "Rules", name: "applicable_scope", label: "Applicable Scope", type: "select", options: ["all", "products", "categories", "brands", "mixed"] },
      { tab: "Schedule", name: "starts_at", label: "Start Date", type: "date", optional: true },
      { tab: "Schedule", name: "ends_at", label: "End Date", type: "date", optional: true },
      { tab: "Products", name: "products", label: "Applicable Products", type: "multiselect", options: "products", optional: true, showWhen: (values) => values.applicable_scope === "products" || values.applicable_scope === "mixed" },
      { tab: "Products", name: "categories", label: "Applicable Categories", type: "multiselect", options: "categories", optional: true, showWhen: (values) => values.applicable_scope === "categories" || values.applicable_scope === "mixed" },
      { tab: "Products", name: "brands", label: "Applicable Brands", type: "multiselect", options: "brands", optional: true, showWhen: (values) => values.applicable_scope === "brands" || values.applicable_scope === "mixed" },
      { tab: "Products", name: "excluded_products", label: "Excluded Products", type: "multiselect", options: "products", optional: true },
      { tab: "Products", name: "excluded_categories", label: "Excluded Categories", type: "multiselect", options: "categories", optional: true },
    ],
    columns: [
      { key: "name", label: "Name", sortable: true, render: (item) => <span className="font-semibold">{String(item.name ?? "")}</span> },
      { key: "code", label: "Code" },
      { key: "type", label: "Type", sortable: true, render: (item) => statusLabel(String(item.type ?? "")) },
      { key: "value", label: "Value", render: (item) => String(item.type) === "fixed" ? formatCurrency(Number(item.value ?? 0)) : `${Number(item.value ?? 0)}%` },
      { key: "usage_limit", label: "Usage Limit" },
      { key: "total_used", label: "Used" },
      { key: "status", label: "Status", sortable: true, render: (item) => <StatusBadge value={String(item.status ?? "active")} /> },
    ],
  },
  reviews: {
    module: "reviews",
    title: "Review Management",
    description: "Moderate product reviews, ratings, and verified purchase state.",
    createLabel: "Create Review",
    defaultSort: "created_at",
    statuses: ["pending", "approved", "rejected"],
    fields: [
      { name: "product_id", label: "Product", type: "select", options: "products" },
      { name: "rating", label: "Rating", type: "number" },
      { name: "comment", label: "Comment", type: "textarea" },
      { name: "admin_reply", label: "Reply", type: "textarea", optional: true },
      { name: "status", label: "Status", type: "select", options: ["pending", "approved", "rejected"] },
      { name: "is_verified_purchase", label: "Verified Purchase", type: "checkbox", optional: true },
    ],
    columns: [
      { key: "product", label: "Product", render: (item) => optionName(item.product) },
      { key: "rating", label: "Rating", sortable: true },
      { key: "comment", label: "Comment", render: (item) => <span className="line-clamp-2 text-sm text-muted-foreground">{String(item.comment ?? "")}</span> },
      { key: "replies", label: "Replies", render: (item) => Array.isArray(item.replies) ? item.replies.length : 0 },
      { key: "status", label: "Status", sortable: true, render: (item) => <StatusBadge value={String(item.status ?? "pending")} /> },
      { key: "created_at", label: "Created At", sortable: true, render: (item) => formatDate(item.created_at) },
    ],
  },
};

function productFields(): FieldConfig[] {
  return [
    { tab: "Basic", name: "name", label: "Product Name", type: "text" },
    { tab: "Basic", name: "product_type", label: "Product Type", type: "select", options: ["physical", "digital"] },
    { tab: "Basic", name: "status", label: "Status", type: "select", options: ["draft", "active", "archived"] },
    { tab: "Basic", name: "brand_id", label: "Brand", type: "select", options: "brands", optional: true },
    { tab: "Basic", name: "category_id", label: "Category", type: "select", options: "categories", optional: true },
    { tab: "Basic", name: "tags", label: "Tags", type: "multiselect", options: "tags", optional: true },
    { tab: "Basic", name: "short_description", label: "Short Description", type: "textarea", optional: true },
    { tab: "Basic", name: "description", label: "Description", type: "textarea", optional: true },
    { tab: "Pricing", name: "base_price_cents", label: "Base Price Cents", type: "number" },
    { tab: "Pricing", name: "compare_at_price_cents", label: "Compare At Price Cents", type: "number", optional: true },
    { tab: "Pricing", name: "cost_price_cents", label: "Cost Price Cents", type: "number", optional: true },
    { tab: "Pricing", name: "currency", label: "Currency", type: "text" },
    { tab: "Pricing", name: "free_shipping", label: "Free Shipping", type: "checkbox", optional: true },
    { tab: "Flags", name: "is_featured", label: "Featured", type: "checkbox", optional: true },
    { tab: "Flags", name: "is_new", label: "New Arrival", type: "checkbox", optional: true },
    { tab: "Flags", name: "is_best_seller", label: "Best Seller", type: "checkbox", optional: true },
    { tab: "Flags", name: "is_flash_sale", label: "Flash Sale", type: "checkbox", optional: true },
    { tab: "Flags", name: "flash_sale_ends_at", label: "Flash Sale Ends At", type: "date", optional: true },
    { tab: "Inventory", name: "track_inventory", label: "Track Inventory", type: "checkbox", optional: true },
    { tab: "Inventory", name: "stock_quantity", label: "Stock Quantity", type: "number", optional: true },
    { tab: "Inventory", name: "low_stock_threshold", label: "Low Stock Threshold", type: "number", optional: true },
    { tab: "SEO", name: "seo.meta_title", label: "Meta Title", type: "text", optional: true },
    { tab: "SEO", name: "seo.meta_description", label: "Meta Description", type: "textarea", optional: true },
    { tab: "SEO", name: "seo.canonical_url", label: "Canonical URL", type: "text", optional: true },
    { tab: "SEO", name: "seo.og_image_url", label: "OG Image URL", type: "text", optional: true },
  ];
}

function schemaFor(config: ModuleConfig) {
  const shape: Record<string, z.ZodTypeAny> = {};
  config.fields.forEach((field) => {
    let rule: z.ZodTypeAny = field.type === "number"
      ? z.coerce.number({ error: `${field.label} is required.` }).min(0)
      : field.type === "file"
        ? z.instanceof(File).optional().nullable()
      : field.type === "checkbox"
        ? z.boolean()
        : field.type === "multiselect"
          ? z.array(z.coerce.number())
          : z.string().trim();

    if (field.type === "select") {
      rule = field.optional ? z.coerce.string() : z.coerce.string().min(1, `${field.label} is required.`);
    } else if (!field.optional && field.type !== "checkbox" && field.type !== "multiselect" && field.type !== "number") {
      rule = z.string().trim().min(1, `${field.label} is required.`);
    }

    if (field.optional) {
      rule = rule.optional().nullable().or(z.literal(""));
    }

    shape[field.name] = rule;
  });

  return z.object(shape).passthrough();
}

function categoryFieldsForMode(fields: FieldConfig[], settings: RuntimeCategoryDisplaySettings): FieldConfig[] {
  if (settings.category_display_mode === "landing_page") {
    return fields
      .filter((field) => !["show_in_navbar", "navbar_display_order"].includes(field.name))
      .map((field) =>
        field.name === "image_file"
          ? { ...field, optional: false }
          : field.name === "icon"
            ? { ...field, optional: true }
            : field,
      );
  }

  if (settings.category_display_mode === "navbar_dropdown_only") {
    return fields
      .filter((field) => !["image_file", "show_on_home", "home_display_order"].includes(field.name))
      .map((field) =>
        field.name === "icon"
          ? { ...field, optional: false }
          : field,
      );
  }

  return fields.map((field) =>
    field.name === "icon"
      ? { ...field, optional: false }
      : field.name === "image_file"
        ? { ...field, optional: true }
        : field,
  );
}

function defaultValues(config: ModuleConfig, item?: ProductRecord | null): ProductModulePayload {
  const values: ProductModulePayload = {};
  config.fields.forEach((field) => {
    const current = nestedValue(item ?? {}, field.name);
    if (current !== undefined && current !== null) {
      values[field.name] = normalizeFormValue(field, current);
      return;
    }
    if (field.type === "file") values[field.name] = null;
    else if (field.type === "checkbox") values[field.name] = false;
    else if (field.type === "multiselect") values[field.name] = [];
    else if (field.type === "number") values[field.name] = field.optional ? undefined : 0;
    else if (field.name === "currency") values[field.name] = selectCurrencySettings(useSettingsStore.getState()).currency;
    else if (field.name === "status") values[field.name] = config.statuses?.[0] ?? "";
    else if (field.name === "product_type") values[field.name] = "physical";
    else if (field.name === "collection_type") values[field.name] = "manual";
    else if (field.name === "display_position_anchor") values[field.name] = "products";
    else if (field.name === "display_position_placement") values[field.name] = "before";
    else if (field.name === "discount_apply_to") values[field.name] = "entire_collection";
    else values[field.name] = "";
  });
  return values;
}

function normalizeFormValue(field: FieldConfig, value: unknown) {
  if (field.type === "multiselect" && Array.isArray(value)) {
    return value.map((item) => typeof item === "object" && item && "id" in item ? Number(item.id) : Number(item));
  }
  if (field.type === "date" && typeof value === "string") {
    return value.slice(0, 10);
  }
  if (field.type === "select") {
    return String(value);
  }
  if (field.type === "textarea" && (Array.isArray(value) || (value && typeof value === "object"))) {
    return JSON.stringify(value, null, 2);
  }
  return value;
}

function nestedValue(source: Record<string, unknown>, path: string) {
  return path.split(".").reduce<unknown>((value, key) => {
    if (!value || typeof value !== "object") return undefined;
    return (value as Record<string, unknown>)[key];
  }, source);
}

function setNestedValue(target: ProductModulePayload, path: string, value: unknown) {
  const keys = path.split(".");
  if (keys.length === 1) {
    target[path] = value;
    return;
  }
  const [first, ...rest] = keys;
  target[first] = typeof target[first] === "object" && target[first] ? target[first] : {};
  setNestedValue(target[first] as ProductModulePayload, rest.join("."), value);
}

function toPayload(values: ProductModulePayload, config: ModuleConfig): ProductModulePayload {
  const payload: ProductModulePayload = {};
  config.fields.forEach((field) => {
    const value = values[field.name];
    if (value === "" || value === undefined) {
      if (!field.optional) setNestedValue(payload, field.name, value);
      return;
    }
    if (field.type === "file" && !(value instanceof File)) {
      return;
    }
    if ((field.name === "rules" || field.name === "route_aliases") && typeof value === "string") {
      try {
        setNestedValue(payload, field.name, JSON.parse(value));
      } catch {
        setNestedValue(payload, field.name, field.name === "route_aliases" ? value.split(",").map((item) => item.trim()).filter(Boolean) : []);
      }
      return;
    }
    if (field.type === "select" && typeof value === "string") {
      setNestedValue(payload, field.name, numericIfOption(value));
      return;
    }
    setNestedValue(payload, field.name, value);
  });
  return payload;
}

export function ProductForm({
  config,
  item,
  options,
  mode,
  onCancel,
  onSubmit,
}: {
  config: ModuleConfig;
  item: ProductRecord | null;
  options: ProductOptions;
  mode: DrawerMode;
  onCancel: () => void;
  onSubmit: (values: ProductModulePayload) => Promise<void>;
}) {
  const schema = useMemo(() => schemaFor(config), [config]);
  const form = useForm<ProductModulePayload>({
    resolver: zodResolver(schema),
    values: defaultValues(config, item),
  });
  const [activeTab, setActiveTab] = useState(config.fields[0]?.tab ?? "Main");
  const watchedValues = useWatch({ control: form.control }) as ProductModulePayload;
  const tabs = [...new Set(config.fields.map((field) => field.tab ?? "Main"))];
  const visibleFields = config.fields.filter((field) => (field.tab ?? "Main") === activeTab && (!field.showWhen || field.showWhen(watchedValues)));

  async function handleSubmit(values: ProductModulePayload) {
    await onSubmit(toPayload(values, config));
  }

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
      {tabs.length > 1 ? (
        <div className="flex gap-1 overflow-x-auto rounded-lg bg-muted p-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "h-8 rounded-md px-3 text-xs font-bold transition",
                activeTab === tab ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      ) : null}
      <div className="grid gap-4">
        {visibleFields.map((field) => (
          <FieldControl key={field.name} field={field} form={form} item={item} options={options} />
        ))}
      </div>
      {config.module === "products" ? <ProductNestedEditor form={form} /> : null}
      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" isLoading={form.formState.isSubmitting}>{mode === "create" ? config.createLabel : "Save Changes"}</Button>
        <Button type="button" size="sm" variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

function FieldControl({ field, form, item, options }: { field: FieldConfig; form: ReturnType<typeof useForm<ProductModulePayload>>; item?: ProductRecord | null; options: ProductOptions }) {
  const value = useWatch({ control: form.control, name: field.name });
  const error = form.formState.errors[field.name]?.message as string | undefined;

  if (field.type === "textarea") {
    return (
      <label className="block space-y-2">
        <span className="text-sm font-semibold text-foreground">{field.label}</span>
        <textarea
          className={cn("min-h-24 w-full rounded-lg border border-transparent bg-muted px-3 py-2 text-sm focus:border-primary focus:bg-background", error && "border-destructive")}
          placeholder={field.placeholder}
          {...form.register(field.name)}
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </label>
    );
  }

  if (field.type === "select") {
    const opts = optionList(field, options);
    return (
      <label className="block space-y-1.5 text-sm font-semibold">
        <span>{field.label}</span>
        <Select value={value ? String(value) : "none"} onValueChange={(next) => form.setValue(field.name, next === "none" ? "" : next, { shouldDirty: true })}>
          <SelectTrigger className="h-10 rounded-lg px-3 text-sm">
            <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {field.optional ? <SelectItem value="none">None</SelectItem> : null}
            {opts.map((option) => <SelectItem key={option.id ?? option.name} value={String(option.id ?? option.name)}>{option.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </label>
    );
  }

  if (field.type === "multiselect") {
    return (
      <div className="space-y-1.5">
        <p className="text-sm font-semibold">{field.label}</p>
        <MultiSelect options={optionList(field, options)} values={Array.isArray(value) ? value.map(Number) : []} onChange={(next) => form.setValue(field.name, next, { shouldDirty: true })} />
      </div>
    );
  }

  if (field.type === "checkbox") {
    return (
      <label className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm font-semibold">
        <input type="checkbox" checked={Boolean(value)} onChange={(event) => form.setValue(field.name, event.target.checked, { shouldDirty: true })} className="h-4 w-4 rounded border-border" />
        <span>{field.label}</span>
      </label>
    );
  }

  if (field.type === "date") {
    return <DatePicker label={field.label} value={typeof value === "string" ? value : null} onChange={(next) => form.setValue(field.name, next, { shouldDirty: true })} error={error} />;
  }

  if (field.type === "file") {
    return (
      <ImageUploadField
        field={field}
        value={value}
        existingUrl={field.existingImageField ? String(item?.[field.existingImageField] ?? "") : ""}
        error={error}
        onChange={(file) => form.setValue(field.name, file, { shouldDirty: true, shouldValidate: true })}
      />
    );
  }

  return (
    <Input
      label={field.label}
      type={field.type === "number" ? "number" : "text"}
      className="h-10 rounded-lg"
      {...form.register(field.name)}
      error={error}
    />
  );
}

function ImageUploadField({
  field,
  value,
  existingUrl,
  error,
  onChange,
}: {
  field: FieldConfig;
  value: unknown;
  existingUrl: string;
  error?: string;
  onChange: (file: File | null) => void;
}) {
  const [preview, setPreview] = useState<string>("");
  const [clientError, setClientError] = useState<string>("");
  const selectedFile = value instanceof File ? value : null;
  const displayUrl = preview || existingUrl;
  const maxSizeMb = field.maxSizeMb ?? 4;
  const accept = "image/jpeg,image/png,image/webp";

  useEffect(() => {
    if (!selectedFile) {
      setPreview("");
      return;
    }

    const nextPreview = URL.createObjectURL(selectedFile);
    setPreview(nextPreview);

    return () => URL.revokeObjectURL(nextPreview);
  }, [selectedFile]);

  function handleFile(file: File | null) {
    setClientError("");

    if (!file) {
      onChange(null);
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setClientError("Only JPG, PNG, and WebP images are supported.");
      onChange(null);
      return;
    }

    if (file.size > maxSizeMb * 1024 * 1024) {
      setClientError(`Image must be ${maxSizeMb}MB or smaller.`);
      onChange(null);
      return;
    }

    onChange(file);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">{field.label}</p>
        {selectedFile ? <span className="text-xs text-muted-foreground">{selectedFile.name}</span> : null}
      </div>
      <label
        className={cn(
          "flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/50 p-4 text-center transition hover:bg-muted",
          (error || clientError) && "border-destructive",
        )}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          handleFile(event.dataTransfer.files.item(0));
        }}
      >
        {displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={displayUrl} alt={`${field.label} preview`} className="max-h-36 rounded-md object-contain" />
        ) : (
          <div>
            <p className="text-sm font-semibold">Upload image</p>
            <p className="mt-1 text-xs text-muted-foreground">JPG, PNG, or WebP up to {maxSizeMb}MB. Drag and drop or click to browse.</p>
          </div>
        )}
        <input
          type="file"
          accept={accept}
          className="sr-only"
          onChange={(event) => handleFile(event.target.files?.item(0) ?? null)}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        {selectedFile ? (
          <Button type="button" size="sm" variant="secondary" onClick={() => handleFile(null)}>Reset Selection</Button>
        ) : null}
        {existingUrl && !selectedFile ? (
          <p className="text-xs text-muted-foreground">Existing image will be preserved unless a new image is selected.</p>
        ) : null}
      </div>
      {clientError || error ? <p className="text-sm text-destructive">{clientError || error}</p> : null}
    </div>
  );
}

function ProductNestedEditor({ form }: { form: ReturnType<typeof useForm<ProductModulePayload>> }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-sm font-bold">Nested Product Sections</p>
      <p className="mt-1 text-xs text-muted-foreground">Images, features, specifications, and variants are API-ready. Add rich repeaters in the next UI pass without changing backend contracts.</p>
      <input type="hidden" {...form.register("images")} />
      <input type="hidden" {...form.register("features")} />
      <input type="hidden" {...form.register("specifications")} />
      <input type="hidden" {...form.register("variants")} />
    </div>
  );
}

function optionList(field: FieldConfig, options: ProductOptions): Array<Option & Record<string, unknown>> {
  if (Array.isArray(field.options)) {
    return field.options.map((name) => ({ id: name as unknown as number, name: statusLabel(name) }));
  }
  if (field.options && field.options in options) {
    return options[field.options] as Array<Option & Record<string, unknown>>;
  }
  return [];
}

function MultiSelect({ options, values, onChange }: { options: Array<Option & Record<string, unknown>>; values: number[]; onChange: (values: number[]) => void }) {
  const [search, setSearch] = useState("");
  const [brandId, setBrandId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 10;
  const brands = useMemo(() => uniqueFilterOptions(options, "brand_id", "brand_name"), [options]);
  const categories = useMemo(() => uniqueFilterOptions(options, "category_id", "category_name"), [options]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return options.filter((option) => {
      const matchesSearch = !query || String(option.name ?? "").toLowerCase().includes(query);
      const matchesBrand = !brandId || String(option.brand_id ?? "") === brandId;
      const matchesCategory = !categoryId || String(option.category_id ?? "") === categoryId;
      return matchesSearch && matchesBrand && matchesCategory;
    });
  }, [brandId, categoryId, options, search]);
  const lastPage = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, lastPage);
  const visible = filtered.slice((safePage - 1) * perPage, safePage * perPage);
  const visibleIds = visible.map((option) => Number(option.id)).filter(Number.isFinite);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => values.includes(id));

  useEffect(() => {
    setPage(1);
  }, [brandId, categoryId, search]);

  return (
    <div className="space-y-2 rounded-lg border border-border p-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          className="h-9 rounded-lg"
          placeholder="Search products"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        {brands.length ? (
          <Select value={brandId || "all"} onValueChange={(value) => setBrandId(value === "all" ? "" : value)}>
            <SelectTrigger className="h-9 rounded-lg border-border bg-background px-2 text-sm sm:w-40" aria-label="Filter products by brand">
              <SelectValue placeholder="All brands" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All brands</SelectItem>
              {brands.map((brand) => <SelectItem key={brand.id} value={String(brand.id)}>{brand.name}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : null}
        {categories.length ? (
          <Select value={categoryId || "all"} onValueChange={(value) => setCategoryId(value === "all" ? "" : value)}>
            <SelectTrigger className="h-9 rounded-lg border-border bg-background px-2 text-sm sm:w-44" aria-label="Filter products by category">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((category) => <SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">{values.length} Products Selected</span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="font-semibold text-primary hover:underline"
            onClick={() => onChange(allVisibleSelected ? values.filter((id) => !visibleIds.includes(id)) : [...new Set([...values, ...visibleIds])])}
          >
            {allVisibleSelected ? "Remove visible" : "Select visible"}
          </button>
          {values.length ? (
            <button type="button" className="font-semibold text-destructive hover:underline" onClick={() => onChange([])}>
              Remove assigned
            </button>
          ) : null}
        </div>
      </div>
      <div className="grid max-h-64 gap-1 overflow-y-auto pr-1">
        {visible.length ? visible.map((option) => {
          const checked = values.includes(Number(option.id));
          return (
            <label key={String(option.id)} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onChange(checked ? values.filter((value) => value !== Number(option.id)) : [...values, Number(option.id)])}
                className="h-4 w-4 rounded border-border"
              />
              <span className="min-w-0">
                <span className="block truncate">{option.name}</span>
                {option.brand_name || option.category_name ? (
                  <span className="block truncate text-xs text-muted-foreground">
                    {[option.brand_name, option.category_name].filter(Boolean).join(" • ")}
                  </span>
                ) : null}
              </span>
            </label>
          );
        }) : <p className="px-2 py-2 text-sm text-muted-foreground">No options available.</p>}
      </div>
      {lastPage > 1 ? (
        <div className="flex items-center justify-between gap-2 border-t border-border pt-2 text-xs">
          <button type="button" className="font-semibold disabled:opacity-50" disabled={safePage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
          <span className="text-muted-foreground">Page {safePage} of {lastPage}</span>
          <button type="button" className="font-semibold disabled:opacity-50" disabled={safePage >= lastPage} onClick={() => setPage((current) => Math.min(lastPage, current + 1))}>Next</button>
        </div>
      ) : null}
    </div>
  );
}

function uniqueFilterOptions(options: Array<Option & Record<string, unknown>>, idKey: string, nameKey: string) {
  const map = new Map<string, string>();
  options.forEach((option) => {
    const id = String(option[idKey] ?? "");
    const name = String(option[nameKey] ?? "");
    if (id && name) {
      map.set(id, name);
    }
  });

  return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
}

function Drawer({ title, description, open, children, onClose }: { title: string; description: string; open: boolean; children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose, open]);

  return (
    <div className={cn("fixed inset-0 z-[70] transition", open ? "pointer-events-auto" : "pointer-events-none")} aria-hidden={!open}>
      <button className={cn("absolute inset-0 bg-black/50 transition-opacity", open ? "opacity-100" : "opacity-0")} onClick={onClose} aria-label="Close drawer backdrop" type="button" />
      <aside className={cn("absolute bottom-0 right-0 top-0 flex w-full max-w-2xl flex-col border-l border-border bg-background shadow-2xl transition-transform duration-300 sm:w-[42rem]", open ? "translate-x-0" : "translate-x-full")} role="dialog" aria-modal="true">
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <h2 className="text-lg font-bold">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          <Button variant="ghost" size="icon" icon={<X className="h-4 w-4" />} aria-label="Close drawer" onClick={onClose} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
      </aside>
    </div>
  );
}

function FilterModal({ open, query, config, options, onClose, onApply }: { open: boolean; query: QueryState; config: ModuleConfig; options: ProductOptions; onClose: () => void; onApply: (filters: Partial<QueryState>) => void }) {
  const [draft, setDraft] = useState<Partial<QueryState>>(query);
  useEffect(() => setDraft(query), [query, open]);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Close filters" type="button" />
      <div className="relative w-full max-w-2xl rounded-lg border border-border bg-background p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">Advanced Filter</h2>
            <p className="mt-1 text-sm text-muted-foreground">Refine records by status, type, ownership, and dates.</p>
          </div>
          <Button variant="ghost" size="icon" icon={<X className="h-4 w-4" />} aria-label="Close filters" onClick={onClose} />
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {config.statuses ? <CompactSelect label="Status" value={draft.status ?? ""} options={config.statuses} onChange={(status) => setDraft({ ...draft, status })} /> : null}
          {config.types ? <CompactSelect label="Type" value={(draft as Record<string, string>).type ?? ""} options={config.types} onChange={(type) => setDraft({ ...draft, type } as Partial<QueryState>)} /> : null}
          {config.module === "products" ? (
            <>
              <CompactOptionSelect label="Brand" value={(draft as Record<string, string>).brand_id ?? ""} options={options.brands} onChange={(brand_id) => setDraft({ ...draft, brand_id } as Partial<QueryState>)} />
              <CompactOptionSelect label="Category" value={(draft as Record<string, string>).category_id ?? ""} options={options.categories} onChange={(category_id) => setDraft({ ...draft, category_id } as Partial<QueryState>)} />
            </>
          ) : null}
          <DatePicker label="Created From" value={draft.created_from || null} onChange={(created_from) => setDraft({ ...draft, created_from })} />
          <DatePicker label="Created To" value={draft.created_to || null} onChange={(created_to) => setDraft({ ...draft, created_to })} />
          <DatePicker label="Updated From" value={draft.updated_from || null} onChange={(updated_from) => setDraft({ ...draft, updated_from })} />
          <DatePicker label="Updated To" value={draft.updated_to || null} onChange={(updated_to) => setDraft({ ...draft, updated_to })} />
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button size="sm" variant="secondary" onClick={() => setDraft({ status: "", created_from: "", created_to: "", updated_from: "", updated_to: "" })}>Reset Filters</Button>
          <Button size="sm" onClick={() => onApply(draft)}>Apply Filters</Button>
        </div>
      </div>
    </div>
  );
}

function CompactSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="space-y-2 text-sm font-semibold">
      <span>{label}</span>
      <Select value={value || "all"} onValueChange={(next) => onChange(next === "all" ? "" : next)}>
        <SelectTrigger className="h-10 rounded-lg px-3 text-sm"><SelectValue placeholder={`Any ${label.toLowerCase()}`} /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any {label.toLowerCase()}</SelectItem>
          {options.map((option) => <SelectItem key={option} value={option}>{statusLabel(option)}</SelectItem>)}
        </SelectContent>
      </Select>
    </label>
  );
}

function CompactOptionSelect({ label, value, options, onChange }: { label: string; value: string; options: Option[]; onChange: (value: string) => void }) {
  return (
    <label className="space-y-2 text-sm font-semibold">
      <span>{label}</span>
      <Select value={value || "all"} onValueChange={(next) => onChange(next === "all" ? "" : next)}>
        <SelectTrigger className="h-10 rounded-lg px-3 text-sm"><SelectValue placeholder={`Any ${label.toLowerCase()}`} /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any {label.toLowerCase()}</SelectItem>
          {options.map((option) => <SelectItem key={option.id} value={String(option.id)}>{option.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </label>
  );
}

export function ProductManagementContent({ module }: { module: ProductModule }) {
  const baseConfig = productModuleConfigs[module];
  const categoryDisplay = useSettingsStore(selectCategoryDisplaySettings);
  const config = useMemo<ModuleConfig>(() => {
    if (module !== "categories") {
      return baseConfig;
    }

    return {
      ...baseConfig,
      fields: categoryFieldsForMode(baseConfig.fields, categoryDisplay),
    };
  }, [baseConfig, categoryDisplay, module]);
  const router = useRouter();
  const { query, setQuery } = useUrlQueryState(config.defaultSort);
  const [items, setItems] = useState<ProductRecord[]>([]);
  const [options, setOptions] = useState<ProductOptions>(emptyOptions);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [drawer, setDrawer] = useState<{ open: boolean; mode: DrawerMode; item: ProductRecord | null }>({ open: false, mode: "create", item: null });
  const { confirmDelete, deleteConfirmationDialog } = useDeleteConfirmation();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await productManagementService.list(module, query);
      setItems(response.data.items);
      setOptions(response.data.options ?? emptyOptions);
      setPagination(response.meta.pagination ?? null);
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setLoading(false);
    }
  }, [module, query]);

  useEffect(() => { void load(); }, [load]);

  async function submit(values: ProductModulePayload) {
    try {
      if (drawer.mode === "create") {
        await productManagementService.create(module, values);
        toast.success(`${config.title.replace(" Management", "")} created successfully.`);
      } else if (drawer.item) {
        await productManagementService.update(module, drawer.item.id, values);
        toast.success(`${config.title.replace(" Management", "")} updated successfully.`);
      }
      setDrawer({ open: false, mode: "create", item: null });
      await load();
    } catch (error) {
      toast.error(toAppError(error).message);
    }
  }

  return (
    <>
      <ManagementPage
        config={config}
        data={items}
        pagination={pagination}
        loading={loading}
        selected={selected}
        query={query}
        onSort={(key) => setQuery({ sort: key, direction: query.sort === key && query.direction === "asc" ? "desc" : "asc", page: 1 })}
        onSearch={(value) => setQuery({ search: value, page: 1 })}
        onPage={(value) => setQuery({ page: value })}
        onPerPage={(value) => setQuery({ per_page: value, page: 1 })}
        onToggle={(id) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])}
        onToggleAll={() => setSelected((current) => items.every((item) => current.includes(item.id)) ? [] : items.map((item) => item.id))}
        onCreate={() => module === "products" ? router.push(routePaths.adminProductCreate) : module === "collections" ? router.push(`${routePaths.adminCollections}/create`) : setDrawer({ open: true, mode: "create", item: null })}
        onEdit={(item) => module === "products" ? router.push(`${routePaths.adminProducts}/${item.id}/edit`) : module === "collections" ? router.push(`${routePaths.adminCollections}/${item.id}/edit`) : setDrawer({ open: true, mode: "edit", item })}
        onDelete={(item) => confirmDelete({ title: "Confirm Deletion", onConfirm: async () => { await productManagementService.delete(module, item.id); toast.success("Record deleted."); await load(); } })}
        onBulkDelete={() => confirmDelete({ title: "Confirm Deletion", onConfirm: async () => { await productManagementService.bulkDelete(module, selected); setSelected([]); toast.success("Selected records deleted."); await load(); } })}
        onExport={() => exportCsv(`${module}.csv`, items.filter((item) => selected.includes(item.id)).map((item) => ({ id: item.id, name: String(item.name ?? item.title ?? item.value ?? ""), status: String(item.status ?? ""), created_at: item.created_at ?? "" })))}
        onFilterOpen={() => setFilterOpen(true)}
      />
      {deleteConfirmationDialog}
      <FilterModal open={filterOpen} query={query} config={config} options={options} onClose={() => setFilterOpen(false)} onApply={(value) => { setQuery({ ...value, page: 1 } as Partial<QueryState>); setFilterOpen(false); }} />
      <Drawer open={drawer.open} title={drawer.mode === "create" ? config.createLabel : `Edit ${config.title.replace(" Management", "")}`} description={config.description} onClose={() => setDrawer({ open: false, mode: "create", item: null })}>
        <ProductForm config={config} item={drawer.item} options={options} mode={drawer.mode} onCancel={() => setDrawer({ open: false, mode: "create", item: null })} onSubmit={submit} />
      </Drawer>
    </>
  );
}

function ManagementPage({
  config,
  data,
  pagination,
  loading,
  selected,
  query,
  onSort,
  onSearch,
  onPage,
  onPerPage,
  onToggle,
  onToggleAll,
  onCreate,
  onEdit,
  onDelete,
  onBulkDelete,
  onExport,
  onFilterOpen,
}: {
  config: ModuleConfig;
  data: ProductRecord[];
  pagination: PaginationMeta | null;
  loading: boolean;
  selected: number[];
  query: QueryState;
  onSort: (key: string) => void;
  onSearch: (value: string) => void;
  onPage: (page: number) => void;
  onPerPage: (value: number) => void;
  onToggle: (id: number) => void;
  onToggleAll: () => void;
  onCreate: () => void;
  onEdit: (item: ProductRecord) => void;
  onDelete: (item: ProductRecord) => void;
  onBulkDelete: () => void;
  onExport: () => void;
  onFilterOpen: () => void;
}) {
  const [searchInput, setSearchInput] = useState(query.search);
  const allSelected = data.length > 0 && data.every((item) => selected.includes(item.id));
  const page = pagination?.current_page ?? 1;
  const lastPage = pagination?.last_page ?? 1;
  const tableColumns = useMemo<ColumnDef<ProductRecord>[]>(() => config.columns.map((column) => ({
    id: column.key,
    header: column.label,
    cell: ({ row }) => column.render ? column.render(row.original) : String(row.original[column.key] ?? "Not set"),
  })), [config.columns]);
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({ data, columns: tableColumns, getCoreRowModel: getCoreRowModel(), manualSorting: true, manualPagination: true });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>Dashboard</span><ChevronRight className="h-4 w-4" /><span>Product Management</span><ChevronRight className="h-4 w-4" /><span className="font-medium text-foreground">{config.title}</span>
      </div>
      <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{config.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{config.description}</p>
        </div>
        <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={onCreate}>{config.createLabel}</Button>
      </section>
      <section className="rounded-lg border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
          <form className="flex flex-1 gap-2" onSubmit={(event) => { event.preventDefault(); onSearch(searchInput); }}>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder={`Search ${config.title.toLowerCase()}`} />
            </div>
            <Button size="sm" type="submit">Search</Button>
            <Button size="sm" type="button" variant="secondary" icon={<Filter className="h-4 w-4" />} onClick={onFilterOpen}>Advanced Filter</Button>
          </form>
        </div>
        {selected.length ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-3">
            <p className="text-sm font-semibold">{selected.length} selected</p>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" icon={<Download className="h-4 w-4" />} onClick={onExport}>Export</Button>
              <Button size="sm" variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={onBulkDelete}>Bulk Delete</Button>
            </div>
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-muted/80 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="w-12 px-4 py-3"><input type="checkbox" checked={allSelected} onChange={onToggleAll} aria-label="Select all" /></th>
                {config.columns.map((column) => (
                  <th key={column.key} className="px-4 py-3">
                    {column.sortable ? <button className="inline-flex items-center gap-1 font-bold" onClick={() => onSort(column.key)}>{column.label}<ChevronsUpDown className="h-3.5 w-3.5" /></button> : column.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={6} columns={config.columns.length} selectable actions />
              ) : table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => (
                <tr key={row.original.id} className="border-t border-border hover:bg-muted/40">
                  <td className="px-4 py-3"><input type="checkbox" checked={selected.includes(row.original.id)} onChange={() => onToggle(row.original.id)} aria-label={`Select row ${row.original.id}`} /></td>
                  {row.getVisibleCells().map((cell) => <td key={cell.id} className="px-4 py-3 align-middle">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}
                  <td className="px-4 py-3"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" icon={<Edit3 className="h-4 w-4" />} title="Edit" aria-label="Edit" onClick={() => onEdit(row.original)} /><Button variant="ghost" size="icon" icon={<Trash2 className="h-4 w-4" />} title="Delete" aria-label="Delete" onClick={() => onDelete(row.original)} /></div></td>
                </tr>
              )) : (
                <tr><td colSpan={config.columns.length + 2} className="h-48 text-center"><p className="font-semibold">No records found</p><p className="mt-1 text-sm text-muted-foreground">Try changing filters or create a new record.</p></td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">Total Records: <span className="font-semibold text-foreground">{pagination?.total ?? 0}</span></p>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={String(pagination?.per_page ?? 10)} onValueChange={(value) => onPerPage(Number(value))}>
              <SelectTrigger className="h-9 w-[110px] rounded-lg px-2 text-sm" aria-label="Rows per page"><SelectValue /></SelectTrigger>
              <SelectContent>{pageSizes.map((size) => <SelectItem key={size} value={String(size)}>{size} / page</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="secondary" size="sm" icon={<ChevronLeft className="h-4 w-4" />} disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button>
            {Array.from({ length: Math.min(lastPage, 5) }, (_, index) => {
              const start = Math.max(1, Math.min(page - 2, lastPage - 4));
              const pageNumber = start + index;
              if (pageNumber > lastPage) return null;
              return <Button key={pageNumber} variant={pageNumber === page ? "primary" : "secondary"} size="sm" onClick={() => onPage(pageNumber)}>{pageNumber}</Button>;
            })}
            <Button variant="secondary" size="sm" icon={<ChevronRight className="h-4 w-4" />} disabled={page >= lastPage} onClick={() => onPage(page + 1)}>Next</Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatusBadge({ value }: { value: string }) {
  return <span className="rounded-full border border-border px-2 py-1 text-xs font-bold">{statusLabel(value)}</span>;
}

function boolLabel(value: unknown) {
  return value ? "Yes" : "No";
}

function optionName(value: unknown) {
  if (!value || typeof value !== "object") return "Not set";
  return String((value as { name?: string }).name ?? "Not set");
}

function money(value: unknown, currency: unknown) {
  const amount = Number(value ?? 0) / 100;
  const settings = selectCurrencySettings(useSettingsStore.getState());
  return formatCurrency(amount, { ...settings, currency: String(currency || settings.currency) });
}

function numericIfOption(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && String(parsed) === value ? parsed : value;
}
