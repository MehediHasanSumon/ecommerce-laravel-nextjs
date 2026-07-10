"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import type { ProductOptions } from "@/features/admin/products/types";
import { productManagementService } from "@/features/admin/products/services/product-management-service";
import { selectBrandsEnabled, useSettingsStore } from "@/store/settings-store";
import { formatCurrency } from "@/utils/format";
import {
  FieldGrid,
  GalleryUploader,
  ProductImageUploader,
  SectionHeader,
  SelectField,
  TagInputField,
  TextAreaField,
  ToggleField,
  useFieldValue,
} from "@/features/admin/products/components/wizard/product-wizard-fields";
import type { ProductVariantDraft, ProductWizardValues } from "@/features/admin/products/components/wizard/product-wizard-types";
import { optionName } from "@/features/admin/products/components/wizard/product-wizard-types";

type SectionProps = {
  form: UseFormReturn<ProductWizardValues>;
  options: ProductOptions;
};

const statusOptions = [
  { id: "draft", name: "Draft" },
  { id: "active", name: "Active" },
  { id: "archived", name: "Archived" },
];

export function BasicInfoSection({ form, options }: SectionProps) {
  const errors = form.formState.errors;
  const brandsEnabled = useSettingsStore(selectBrandsEnabled);
  const brandId = useFieldValue(form, "brand_id");
  const categoryId = useFieldValue(form, "category_id");
  const subcategoryId = useFieldValue(form, "subcategory_id");
  const subcategories = options.categories.filter((category) => category.parent_id && String(category.parent_id) === String(categoryId));
  const parentCategories = options.categories.filter((category) => !category.parent_id);

  useEffect(() => {
    if (!subcategoryId) return;
    if (!subcategories.some((category) => String(category.id) === String(subcategoryId))) {
      form.setValue("subcategory_id", "", { shouldDirty: true, shouldValidate: true });
    }
  }, [form, subcategories, subcategoryId]);

  return (
    <div className="space-y-5">
      <SectionHeader title="Basic Information" description="Name the product, connect it to catalog taxonomy, and add the short merchandising copy." />
      <FieldGrid>
        <Input label="Product Name" {...form.register("name")} error={errors.name?.message} />
        {brandsEnabled ? (
          <SelectField label="Brand" value={brandId} placeholder="Select brand" options={[{ id: "", name: "No brand" }, ...options.brands]} onChange={(value) => form.setValue("brand_id", value, { shouldDirty: true })} />
        ) : null}
        <SelectField label="Category" value={categoryId} placeholder="Select category" options={parentCategories.length ? parentCategories : options.categories} error={errors.category_id?.message} onChange={(value) => form.setValue("category_id", value, { shouldDirty: true, shouldValidate: true })} />
        <SelectField label="Subcategory" value={subcategoryId} placeholder="Select subcategory" options={[{ id: "", name: "No subcategory" }, ...subcategories]} onChange={(value) => form.setValue("subcategory_id", value, { shouldDirty: true })} />
      </FieldGrid>
      <TextAreaField label="Short Description" rows={3} {...form.register("short_description")} error={errors.short_description?.message} />
      <TextAreaField label="Full Description" rows={5} {...form.register("description")} />
      <TagInputField title="Tags" options={options.tags} values={useFieldValue(form, "tags")} onChange={(values) => form.setValue("tags", values, { shouldDirty: true })} />
    </div>
  );
}

export function PriceSection({ form }: SectionProps) {
  const errors = form.formState.errors;
  return (
    <div className="space-y-5">
      <SectionHeader title="Pricing" description="Set customer-facing pricing, margin inputs, and tax behavior." />
      <FieldGrid>
        <Input label="Regular Price" type="number" min={0} step="0.01" {...form.register("base_price_cents")} error={errors.base_price_cents?.message} />
        <Input label="Sale Price" type="number" min={0} step="0.01" {...form.register("compare_at_price_cents")} error={errors.compare_at_price_cents?.message} />
        <Input label="Cost Price" type="number" min={0} step="0.01" {...form.register("cost_price_cents")} error={errors.cost_price_cents?.message} />
        <SelectField
          label="Tax Class"
          value={useFieldValue(form, "tax_class")}
          placeholder="Select tax class"
          options={[{ id: "standard", name: "Standard" }, { id: "reduced", name: "Reduced" }, { id: "zero", name: "Zero rated" }]}
          onChange={(value) => form.setValue("tax_class", value, { shouldDirty: true })}
        />
      </FieldGrid>
      <ToggleField label="Free Shipping" description="Mark this product as eligible for free shipping promotions." checked={useFieldValue(form, "free_shipping")} onChange={(checked) => form.setValue("free_shipping", checked, { shouldDirty: true })} />
    </div>
  );
}

export function InventorySection({ form }: SectionProps) {
  const errors = form.formState.errors;
  return (
    <div className="space-y-5">
      <SectionHeader title="Inventory" description="Control stock tracking, low-stock alerts, backorders, and order quantity rules." />
      <div className="grid gap-3 sm:grid-cols-2">
        <ToggleField label="Track Inventory" description="Deduct stock when orders are placed." checked={useFieldValue(form, "track_inventory")} onChange={(checked) => form.setValue("track_inventory", checked, { shouldDirty: true, shouldValidate: true })} />
        <SelectField
          label="Stock Status"
          value={useFieldValue(form, "stock_status")}
          placeholder="Select status"
          options={[{ id: "in_stock", name: "In stock" }, { id: "out_of_stock", name: "Out of stock" }, { id: "preorder", name: "Preorder" }]}
          onChange={(value) => form.setValue("stock_status", value as ProductWizardValues["stock_status"], { shouldDirty: true })}
        />
      </div>
      <FieldGrid>
        <Input label="Stock Quantity" type="number" min={0} {...form.register("stock_quantity")} error={errors.stock_quantity?.message} />
        <Input label="Low Stock Alert" type="number" min={0} {...form.register("low_stock_threshold")} error={errors.low_stock_threshold?.message} />
        <SelectField
          label="Backorders"
          value={useFieldValue(form, "backorders")}
          placeholder="Select policy"
          options={[{ id: "deny", name: "Do not allow" }, { id: "allow", name: "Allow" }, { id: "notify", name: "Allow and notify customer" }]}
          onChange={(value) => form.setValue("backorders", value as ProductWizardValues["backorders"], { shouldDirty: true })}
        />
        <Input label="Minimum Order Quantity" type="number" min={1} {...form.register("min_order_quantity")} error={errors.min_order_quantity?.message} />
        <Input label="Maximum Order Quantity" type="number" min={1} {...form.register("max_order_quantity")} error={errors.max_order_quantity?.message} />
      </FieldGrid>
    </div>
  );
}

export function MediaSection({ form }: SectionProps) {
  return (
    <div className="space-y-6">
      <SectionHeader title="Images & Media" description="Upload the primary product image and sortable gallery assets with alt text." />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <ProductImageUploader value={useFieldValue(form, "featured_image")} onChange={(image) => form.setValue("featured_image", image, { shouldDirty: true })} />
        <GalleryUploader values={useFieldValue(form, "gallery_images")} onChange={(images) => form.setValue("gallery_images", images, { shouldDirty: true, shouldValidate: true })} />
      </div>
    </div>
  );
}

export function VariantSection({ form, options }: SectionProps) {
  const variants = useFieldValue(form, "variants");
  const selectedAttributes = useFieldValue(form, "attribute_values");
  const [attributeSearch, setAttributeSearch] = useState("");
  const [attributeOptions, setAttributeOptions] = useState(options.attribute_values);
  const [loadingAttributes, setLoadingAttributes] = useState(false);
  const [openVariantIds, setOpenVariantIds] = useState<string[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setLoadingAttributes(true);
      try {
        const response = await productManagementService.options({ attribute_search: attributeSearch });
        setAttributeOptions(response.data.options.attribute_values ?? []);
      } finally {
        setLoadingAttributes(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [attributeSearch]);

  useEffect(() => {
    setAttributeOptions(options.attribute_values);
  }, [options.attribute_values]);

  const visibleAttributeOptions = useMemo(() => {
    const selected = options.attribute_values.filter((value) => selectedAttributes.includes(Number(value.id)));
    const merged = [...selected, ...attributeOptions];
    return Array.from(new Map(merged.map((value) => [value.id, value])).values());
  }, [attributeOptions, options.attribute_values, selectedAttributes]);

  const valuesById = useMemo(() => new Map(visibleAttributeOptions.map((value) => [Number(value.id), value])), [visibleAttributeOptions]);
  const groupedAttributes = useMemo(() => {
    const grouped = new Map<number, { id: number; name: string; type?: string | null; values: typeof visibleAttributeOptions }>();
    visibleAttributeOptions.forEach((value) => {
      const attributeId = Number(value.attribute_id ?? 0);
      if (!attributeId) return;
      const attribute = options.attributes.find((item) => Number(item.id) === attributeId);
      const group = grouped.get(attributeId) ?? { id: attributeId, name: attribute?.name ?? "Attribute", type: attribute?.type, values: [] };
      group.values.push(value);
      grouped.set(attributeId, group);
    });
    return Array.from(grouped.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [options.attributes, visibleAttributeOptions]);

  const generatedCombinations = useMemo(() => {
    const selectedGroups = groupedAttributes
      .map((group) => group.values.filter((value) => selectedAttributes.includes(Number(value.id))).map((value) => Number(value.id)))
      .filter((values) => values.length > 0);

    if (!selectedGroups.length) return [];

    return selectedGroups.reduce<number[][]>((combinations, group) => {
      if (!combinations.length) return group.map((value) => [value]);
      return combinations.flatMap((combination) => group.map((value) => [...combination, value]));
    }, []);
  }, [groupedAttributes, selectedAttributes]);

  function variantKey(attributeValues: number[]) {
    return [...attributeValues].sort((a, b) => a - b).join(":");
  }

  function variantName(attributeValues: number[]) {
    return attributeValues.map((id) => valuesById.get(id)?.name ?? `Value ${id}`).join(" / ");
  }

  useEffect(() => {
    if (selectedAttributes.length > 0 && generatedCombinations.length === 0) {
      return;
    }

    const existingByKey = new Map(variants.map((variant) => [variantKey(variant.attribute_values), variant]));
    const generated: ProductVariantDraft[] = generatedCombinations.map((combination) => {
      const key = variantKey(combination);
      const existing = existingByKey.get(key);
      return existing ?? {
        id: `variant-${key || crypto.randomUUID()}`,
        price_cents: undefined,
        compare_at_price_cents: undefined,
        cost_price_cents: undefined,
        stock_quantity: "" as const,
        track_inventory: null,
        status: "active" as const,
        attribute_values: combination,
      };
    });

    const currentKeys = variants.map((variant) => variantKey(variant.attribute_values)).join("|");
    const nextKeys = generated.map((variant) => variantKey(variant.attribute_values)).join("|");
    if (currentKeys !== nextKeys || variants.length !== generated.length) {
      form.clearErrors("variants");
      form.setValue("variants", generated, { shouldDirty: true, shouldValidate: false });
      setOpenVariantIds((ids) => ids.filter((id) => generated.some((variant) => variant.id === id)));
    }
  }, [form, generatedCombinations, selectedAttributes, variants]);

  function updateVariant(id: string, patch: Partial<ProductVariantDraft>) {
    form.clearErrors("variants");
    form.setValue("variants", variants.map((variant) => variant.id === id ? { ...variant, ...patch } : variant), { shouldDirty: true, shouldValidate: false });
  }

  function toggleAttributeValue(id: number, checked: boolean) {
    form.setValue("attribute_values", checked ? [...selectedAttributes, id] : selectedAttributes.filter((value) => value !== id), { shouldDirty: true });
  }

  function toggleAccordion(id: string) {
    setOpenVariantIds((ids) => ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]);
  }

  return (
    <div className="space-y-5">
      <SectionHeader title="Attributes & Variants" description="Select attribute values. Variant combinations are generated automatically and inherit product defaults unless overridden." />
      <div className="rounded-lg border border-border bg-background">
        <div className="border-b border-border p-3">
          <input
            className="h-10 w-full rounded-lg border border-border bg-muted px-3 text-sm outline-none transition focus:border-primary focus:bg-background"
            value={attributeSearch}
            onChange={(event) => setAttributeSearch(event.target.value)}
            placeholder="Search attribute values"
          />
        </div>
        <div className="max-h-80 space-y-4 overflow-y-auto p-3">
          {loadingAttributes ? <p className="text-sm text-muted-foreground">Searching...</p> : groupedAttributes.length ? groupedAttributes.map((group) => (
            <div key={group.id} className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold">{group.name}</p>
                <span className="text-xs text-muted-foreground">{group.values.filter((value) => selectedAttributes.includes(Number(value.id))).length} selected</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {group.values.map((value) => {
                  const id = Number(value.id);
                  const checked = selectedAttributes.includes(id);
                  return (
                    <label key={value.id} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted">
                      <input type="checkbox" checked={checked} onChange={(event) => toggleAttributeValue(id, event.target.checked)} className="h-4 w-4 rounded border-border" />
                      <span>{value.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )) : <p className="text-sm text-muted-foreground">No attribute values available.</p>}
        </div>
      </div>
      <div className="space-y-3">
        {variants.length ? variants.map((variant, index) => (
          <div key={variant.id} className="rounded-lg border border-border bg-background">
            <div className="flex items-center gap-3 p-4">
              <input
                type="checkbox"
                checked={variant.status === "active"}
                onChange={(event) => updateVariant(variant.id, { status: event.target.checked ? "active" : "inactive" })}
                className="h-4 w-4 rounded border-border"
                aria-label={`Enable ${variantName(variant.attribute_values)}`}
              />
              <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => toggleAccordion(variant.id)}>
                {openVariantIds.includes(variant.id) ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">Variant: {variantName(variant.attribute_values) || index + 1}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">{variant.attribute_values.map((id) => valuesById.get(id)?.name ?? id).join(" / ")}</span>
                </span>
              </button>
            </div>
            {openVariantIds.includes(variant.id) ? (
              <div className="border-t border-border p-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <Input label="Price" type="number" min={0} step="0.01" placeholder="Use product price" value={variant.price_cents ?? ""} onChange={(event) => updateVariant(variant.id, { price_cents: event.target.value ? Number(event.target.value) : undefined })} />
                  <Input label="Compare Price" type="number" min={0} step="0.01" placeholder="Use product compare price" value={variant.compare_at_price_cents ?? ""} onChange={(event) => updateVariant(variant.id, { compare_at_price_cents: event.target.value ? Number(event.target.value) : undefined })} />
                  <Input label="Cost Price" type="number" min={0} step="0.01" placeholder="Use product cost price" value={variant.cost_price_cents ?? ""} onChange={(event) => updateVariant(variant.id, { cost_price_cents: event.target.value ? Number(event.target.value) : undefined })} />
                  <SelectField label="Track Inventory" value={variant.track_inventory === null || variant.track_inventory === undefined ? "inherit" : String(variant.track_inventory)} placeholder="Select inventory behavior" options={[{ id: "inherit", name: "Use product setting" }, { id: "true", name: "Track inventory" }, { id: "false", name: "Do not track" }]} onChange={(value) => updateVariant(variant.id, { track_inventory: value === "inherit" ? null : value === "true" })} />
                  <Input label="Quantity" type="number" min={0} placeholder="Use product stock" value={variant.stock_quantity ?? ""} onChange={(event) => updateVariant(variant.id, { stock_quantity: event.target.value ? Number(event.target.value) : "" })} />
                  <SelectField label="Status" value={variant.status} placeholder="Select status" options={[{ id: "active", name: "Active" }, { id: "inactive", name: "Inactive" }]} onChange={(value) => updateVariant(variant.id, { status: value as ProductVariantDraft["status"] })} />
                </div>
              </div>
            ) : null}
          </div>
        )) : (
          <div className="rounded-lg border border-dashed border-border bg-muted/40 p-6 text-center">
            <p className="text-sm font-semibold">No variants yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Select one or more attribute values to generate variant combinations.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function SeoSection({ form }: SectionProps) {
  const errors = form.formState.errors.seo;
  return (
    <div className="space-y-5">
      <SectionHeader title="SEO" description="Tune search metadata and social sharing assets." />
      <FieldGrid>
        <Input label="Meta Title" {...form.register("seo.meta_title")} error={errors?.meta_title?.message} />
        <Input label="Canonical URL" {...form.register("seo.canonical_url")} error={errors?.canonical_url?.message} />
        <Input label="Meta Keywords" {...form.register("seo.meta_keywords")} />
        <Input label="Open Graph Image" {...form.register("seo.og_image_url")} />
      </FieldGrid>
      <TextAreaField label="Meta Description" rows={4} {...form.register("seo.meta_description")} error={errors?.meta_description?.message} />
    </div>
  );
}

export function ShippingSection({ form }: SectionProps) {
  const errors = form.formState.errors.shipping;
  return (
    <div className="space-y-5">
      <SectionHeader title="Shipping" description="Capture package weight, dimensions, shipping class, and fulfillment notes." />
      <FieldGrid>
        <Input label="Weight (grams)" type="number" min={0} {...form.register("shipping.weight_grams")} error={errors?.weight_grams?.message} />
        <Input label="Length (cm)" type="number" min={0} {...form.register("shipping.length_cm")} error={errors?.length_cm?.message} />
        <Input label="Width (cm)" type="number" min={0} {...form.register("shipping.width_cm")} error={errors?.width_cm?.message} />
        <Input label="Height (cm)" type="number" min={0} {...form.register("shipping.height_cm")} error={errors?.height_cm?.message} />
        <SelectField
          label="Shipping Class"
          value={useFieldValue(form, "shipping").shipping_class}
          placeholder="Select class"
          options={[{ id: "standard", name: "Standard" }, { id: "fragile", name: "Fragile" }, { id: "oversized", name: "Oversized" }, { id: "digital", name: "Digital delivery" }]}
          onChange={(value) => form.setValue("shipping.shipping_class", value, { shouldDirty: true })}
        />
      </FieldGrid>
      <TextAreaField label="Package Information" rows={4} {...form.register("shipping.package_info")} error={errors?.package_info?.message} />
    </div>
  );
}

export function PublishSection({ form, options }: SectionProps) {
  const values = form.getValues();
  const checks = [
    { label: "Basic information", complete: Boolean(values.name && values.category_id && values.short_description) },
    { label: "Pricing", complete: values.base_price_cents !== "" },
    { label: "Inventory", complete: !values.track_inventory || values.stock_quantity !== "" },
    { label: "Media", complete: Boolean(values.featured_image || values.gallery_images.length) },
    { label: "SEO", complete: Boolean(values.seo.meta_title || values.seo.meta_description) },
  ];

  return (
    <div className="space-y-5">
      <SectionHeader title="Publish" description="Review the product summary, validation checks, and publication state." />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="rounded-lg border border-border bg-background p-4">
          <h3 className="text-base font-bold">{values.name || "Untitled product"}</h3>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <Summary label="Brand" value={optionName(options, "brands", values.brand_id)} />
            <Summary label="Category" value={optionName(options, "categories", values.subcategory_id || values.category_id)} />
            <Summary label="Regular Price" value={formatCurrency(Number(values.base_price_cents || 0))} />
            <Summary label="Stock" value={values.track_inventory ? String(values.stock_quantity || 0) : "Not tracked"} />
            <Summary label="Images" value={`${values.featured_image ? 1 : 0} featured, ${values.gallery_images.length} gallery`} />
            <Summary label="Variants" value={String(values.variants.length)} />
          </div>
        </div>
        <div className="rounded-lg border border-border bg-background p-4">
          <p className="text-sm font-bold">Validation Check</p>
          <div className="mt-3 space-y-2">
            {checks.map((check) => (
              <div key={check.label} className="flex items-center justify-between gap-3 text-sm">
                <span>{check.label}</span>
                <span className={check.complete ? "font-semibold text-emerald-600" : "font-semibold text-amber-600"}>{check.complete ? "Ready" : "Needs review"}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 space-y-3">
            <SelectField label="Status" value={useFieldValue(form, "status")} placeholder="Select status" options={statusOptions} onChange={(value) => form.setValue("status", value as ProductWizardValues["status"], { shouldDirty: true })} />
            <DatePicker label="Publish Date" value={useFieldValue(form, "published_at") || null} onChange={(value) => form.setValue("published_at", value, { shouldDirty: true })} />
          </div>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ToggleField label="Featured" checked={useFieldValue(form, "is_featured")} onChange={(checked) => form.setValue("is_featured", checked, { shouldDirty: true })} />
        <ToggleField label="New Arrival" checked={useFieldValue(form, "is_new")} onChange={(checked) => form.setValue("is_new", checked, { shouldDirty: true })} />
        <ToggleField label="Best Seller" checked={useFieldValue(form, "is_best_seller")} onChange={(checked) => form.setValue("is_best_seller", checked, { shouldDirty: true })} />
        <ToggleField label="Flash Sale" checked={useFieldValue(form, "is_flash_sale")} onChange={(checked) => form.setValue("is_flash_sale", checked, { shouldDirty: true })} />
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 break-words font-semibold">{value}</p>
    </div>
  );
}
