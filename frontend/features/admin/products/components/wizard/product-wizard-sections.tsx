"use client";

import { Plus, Trash2 } from "lucide-react";
import { useEffect } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import type { ProductOptions } from "@/features/admin/products/types";
import { formatCurrency } from "@/utils/format";
import {
  FieldGrid,
  GalleryUploader,
  MultiSelectField,
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
        <SelectField label="Brand" value={useFieldValue(form, "brand_id")} placeholder="Select brand" options={[{ id: "", name: "No brand" }, ...options.brands]} onChange={(value) => form.setValue("brand_id", value, { shouldDirty: true })} />
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
      <SectionHeader title="Pricing" description="Set customer-facing pricing, margin inputs, currency, and tax behavior." />
      <FieldGrid>
        <Input label="Regular Price (cents)" type="number" min={0} {...form.register("base_price_cents")} error={errors.base_price_cents?.message} />
        <Input label="Sale Price (cents)" type="number" min={0} {...form.register("compare_at_price_cents")} error={errors.compare_at_price_cents?.message} />
        <Input label="Cost Price (cents)" type="number" min={0} {...form.register("cost_price_cents")} error={errors.cost_price_cents?.message} />
        <Input label="Currency" maxLength={3} {...form.register("currency")} error={errors.currency?.message} />
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

  function addVariant() {
    const next: ProductVariantDraft = {
      id: crypto.randomUUID(),
      status: "active",
      attribute_values: selectedAttributes,
    };
    form.setValue("variants", [...variants, next], { shouldDirty: true });
  }

  function updateVariant(id: string, patch: Partial<ProductVariantDraft>) {
    form.setValue("variants", variants.map((variant) => variant.id === id ? { ...variant, ...patch } : variant), { shouldDirty: true });
  }

  return (
    <div className="space-y-5">
      <SectionHeader title="Attributes & Variants" description="Attach attribute values and generate sellable variant rows with price, stock, and images." />
      <MultiSelectField title="Attributes" options={options.attribute_values.map((value) => ({ id: value.id, name: `${value.name}${value.type ? ` (${value.type})` : ""}` }))} values={selectedAttributes} onChange={(values) => form.setValue("attribute_values", values, { shouldDirty: true })} />
      <div className="flex justify-end">
        <Button type="button" size="sm" icon={<Plus className="h-4 w-4" />} onClick={addVariant}>Generate Variant</Button>
      </div>
      <div className="space-y-3">
        {variants.length ? variants.map((variant, index) => (
          <div key={variant.id} className="rounded-lg border border-border bg-background p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold">Variant {index + 1}</p>
              <Button type="button" size="icon" variant="ghost" title="Remove variant" icon={<Trash2 className="h-4 w-4" />} onClick={() => form.setValue("variants", variants.filter((item) => item.id !== variant.id), { shouldDirty: true })} />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <Input label="Variant Price" type="number" value={variant.price_cents ?? ""} onChange={(event) => updateVariant(variant.id, { price_cents: event.target.value ? Number(event.target.value) : undefined })} />
              <Input label="Variant Stock" type="number" value={variant.stock_quantity ?? ""} onChange={(event) => updateVariant(variant.id, { stock_quantity: event.target.value ? Number(event.target.value) : undefined })} />
              <Input label="Variant Image URL" value={variant.image_url ?? ""} onChange={(event) => updateVariant(variant.id, { image_url: event.target.value })} />
              <SelectField label="Status" value={variant.status} placeholder="Select status" options={[{ id: "active", name: "Active" }, { id: "inactive", name: "Inactive" }]} onChange={(value) => updateVariant(variant.id, { status: value as ProductVariantDraft["status"] })} />
            </div>
          </div>
        )) : (
          <div className="rounded-lg border border-dashed border-border bg-muted/40 p-6 text-center">
            <p className="text-sm font-semibold">No variants yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Select attributes and generate variant rows when this product has multiple options.</p>
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
    { label: "Pricing", complete: values.base_price_cents !== "" && Boolean(values.currency) },
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
            <Summary label="Regular Price" value={formatCurrency(Number(values.base_price_cents || 0) / 100)} />
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
