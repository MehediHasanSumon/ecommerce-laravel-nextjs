"use client";

import { CheckCircle2, ChevronDown, ChevronRight, Star, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
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
import { computeValidationReadiness, optionName } from "@/features/admin/products/components/wizard/product-wizard-types";

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
    if (!subcategoryId || !options.categories.length) return;
    if (!subcategories.some((category) => String(category.id) === String(subcategoryId))) {
      form.setValue("subcategory_id", "", { shouldDirty: true, shouldValidate: true });
    }
  }, [form, options.categories.length, subcategories, subcategoryId]);

  return (
    <div className="space-y-5">
      <SectionHeader title="Basic Information" description="Name the product, connect it to catalog taxonomy, and add the short merchandising copy." />
      <FieldGrid>
        <Input label="Product Name" {...form.register("name")} error={errors.name?.message} />
        {brandsEnabled ? (
          <SelectField label="Brand" value={brandId} placeholder="Select brand" options={[{ id: "", name: "No brand" }, ...options.brands]} onChange={(value) => form.setValue("brand_id", value, { shouldDirty: true })} />
        ) : null}
        <SelectField
          label="Category"
          value={categoryId}
          placeholder="Select category"
          options={parentCategories.length ? parentCategories : options.categories}
          error={errors.category_id?.message}
          onChange={(value) => {
            form.setValue("category_id", value, { shouldDirty: true, shouldValidate: true });
            form.setValue("subcategory_id", "", { shouldDirty: true, shouldValidate: true });
          }}
        />
        <SelectField label="Subcategory" value={subcategoryId} placeholder="Select subcategory" options={[{ id: "", name: "No subcategory" }, ...subcategories]} onChange={(value) => form.setValue("subcategory_id", value, { shouldDirty: true })} />
      </FieldGrid>
      <TextAreaField label="Short Description" rows={3} {...form.register("short_description")} error={errors.short_description?.message} />
      <TextAreaField label="Full Description" rows={5} {...form.register("description")} />
      <TagInputField title="Tags" options={options.tags} values={useFieldValue(form, "tags")} onChange={(values) => form.setValue("tags", values, { shouldDirty: true })} />
    </div>
  );
}

export function PricingInventorySection({ form }: SectionProps) {
  const errors = form.formState.errors;
  const pricingMode = useFieldValue(form, "pricing_mode");
  const trackInventory = useFieldValue(form, "track_inventory");
  const variants = useFieldValue(form, "variants");
  const hasVariants = variants.length > 0;

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Pricing & Inventory"
        description="Set product-level base pricing and inventory tracking defaults."
      />

      {hasVariants && pricingMode === "variant" ? (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-semibold text-foreground">Independent Variant Pricing Active</p>
          <p className="mt-1 text-xs text-muted-foreground">
            This product has {variants.length} variant(s) with independent pricing configured in the next step. To use global product pricing instead, clear the individual variant prices in the Variants step.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <FieldGrid>
            <Input
              label="Sell Price"
              type="number"
              min={0}
              step="0.01"
              placeholder="0.00"
              {...form.register("base_price_cents")}
              error={errors.base_price_cents?.message}
            />
            <Input
              label="Regular (Compare-At) Price"
              type="number"
              min={0}
              step="0.01"
              placeholder="0.00"
              {...form.register("compare_at_price_cents")}
              error={errors.compare_at_price_cents?.message}
            />
            <Input
              label="Cost Price"
              type="number"
              min={0}
              step="0.01"
              placeholder="0.00"
              {...form.register("cost_price_cents")}
              error={errors.cost_price_cents?.message}
            />
          </FieldGrid>

          {!hasVariants ? (
            <div className="space-y-4 rounded-lg border border-border bg-card p-4">
              <ToggleField
                label="Track Inventory"
                description="Automatically track and deduct stock when orders are placed."
                checked={trackInventory}
                onChange={(checked) => form.setValue("track_inventory", checked, { shouldDirty: true, shouldValidate: true })}
              />
              {trackInventory ? (
                <FieldGrid>
                  <Input
                    label="Stock Quantity"
                    type="number"
                    min={0}
                    {...form.register("stock_quantity")}
                    error={errors.stock_quantity?.message}
                  />
                  <Input
                    label="Low Stock Alert Threshold"
                    type="number"
                    min={0}
                    {...form.register("low_stock_threshold")}
                    error={errors.low_stock_threshold?.message}
                  />
                </FieldGrid>
              ) : null}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Inventory for this product will be tracked per variant in the Variants step.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function VariantSection({ form, options }: SectionProps) {
  const variants = useFieldValue(form, "variants");
  const pricingMode = useFieldValue(form, "pricing_mode");
  const globalSellPrice = useFieldValue(form, "base_price_cents");
  const globalRegularPrice = useFieldValue(form, "compare_at_price_cents");
  const globalCostPrice = useFieldValue(form, "cost_price_cents");
  const selectedAttributes = useFieldValue(form, "attribute_values");
  const [attributeSearch, setAttributeSearch] = useState("");
  const [attributeOptions, setAttributeOptions] = useState(options.attribute_values);
  const [loadingAttributes, setLoadingAttributes] = useState(false);
  const [openVariantIds, setOpenVariantIds] = useState<string[]>([]);
  const globalPricingFallback = useRef<{
    price_cents?: number;
    compare_at_price_cents?: number;
    cost_price_cents?: number;
  }>({});
  const variantPricingFallbackInitialized = useRef(false);

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
    const grouped = new Map<number, { id: number; name: string; type?: string | null; isVariantDefining: boolean; values: typeof visibleAttributeOptions }>();
    visibleAttributeOptions.forEach((value) => {
      const attributeId = Number(value.attribute_id ?? 0);
      if (!attributeId) return;
      const attribute = options.attributes.find((item) => Number(item.id) === attributeId);
      const group = grouped.get(attributeId) ?? {
        id: attributeId,
        name: attribute?.name ?? "Attribute",
        type: attribute?.type,
        isVariantDefining: Boolean(attribute?.is_variant_defining),
        values: [],
      };
      group.values.push(value);
      grouped.set(attributeId, group);
    });
    return Array.from(grouped.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [options.attributes, visibleAttributeOptions]);

  const generatedCombinations = useMemo(() => {
    const selectedGroups = groupedAttributes
      .filter((group) => group.isVariantDefining)
      .map((group) => group.values.filter((value) => selectedAttributes.includes(Number(value.id))).map((value) => Number(value.id)))
      .filter((values) => values.length > 0);

    if (!selectedGroups.length) return [];

    return selectedGroups.reduce<number[][]>((combinations, group) => {
      if (!combinations.length) return group.map((value) => [value]);
      return combinations.flatMap((combination) => group.map((value) => [...combination, value]));
    }, []);
  }, [groupedAttributes, selectedAttributes]);

  useEffect(() => {
    if (pricingMode === "global") {
      variantPricingFallbackInitialized.current = false;
      return;
    }
    if (variantPricingFallbackInitialized.current) return;

    const primary = variants.find((variant) => variant.is_primary) ?? variants[0];
    if (!primary) return;

    globalPricingFallback.current = {
      price_cents: primary.price_cents,
      compare_at_price_cents: primary.compare_at_price_cents,
      cost_price_cents: primary.cost_price_cents,
    };
    variantPricingFallbackInitialized.current = true;
  }, [pricingMode, variants]);

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
    const pricingSeed = variants.find((variant) => variant.is_primary) ?? variants[0];
    const generated: ProductVariantDraft[] = generatedCombinations.map((combination, index) => {
      const key = variantKey(combination);
      const existing = existingByKey.get(key);
      const generatedVariant = existing ?? {
        id: `variant-${key || crypto.randomUUID()}`,
        sku: "",
        price_cents: pricingMode === "variant" ? pricingSeed?.price_cents : undefined,
        compare_at_price_cents: pricingMode === "variant" ? pricingSeed?.compare_at_price_cents : undefined,
        cost_price_cents: pricingMode === "variant" ? pricingSeed?.cost_price_cents : undefined,
        stock_quantity: 0,
        track_inventory: true,
        status: "active" as const,
        is_primary: false,
        attribute_values: combination,
      };

      const hasPrimary = variants.some((v) => v.is_primary);
      const isPrimary = existing ? Boolean(existing.is_primary) : (!hasPrimary && index === 0);

      return { ...generatedVariant, is_primary: isPrimary };
    });

    const currentKeys = variants.map((variant) => variantKey(variant.attribute_values)).join("|");
    const nextKeys = generated.map((variant) => variantKey(variant.attribute_values)).join("|");
    if (currentKeys !== nextKeys || variants.length !== generated.length) {
      if (generated.length > 0 && !generated.some((v) => v.is_primary)) {
        generated[0].is_primary = true;
      }
      form.clearErrors("variants");
      form.setValue("variants", generated, { shouldDirty: true, shouldValidate: false });
      setOpenVariantIds((ids) => ids.filter((id) => generated.some((variant) => variant.id === id)));
    }
  }, [
    form,
    generatedCombinations,
    pricingMode,
    selectedAttributes,
    variants,
  ]);

  useEffect(() => {
    if (variants.length || pricingMode !== "variant") return;
    const fallback = globalPricingFallback.current;
    form.setValue("pricing_mode", "global", { shouldDirty: true, shouldValidate: false });
    if (globalSellPrice === "" && fallback.price_cents !== undefined) {
      form.setValue("base_price_cents", fallback.price_cents, { shouldDirty: true, shouldValidate: false });
    }
    if (globalRegularPrice === "" && fallback.compare_at_price_cents !== undefined) {
      form.setValue("compare_at_price_cents", fallback.compare_at_price_cents, { shouldDirty: true, shouldValidate: false });
    }
    if (globalCostPrice === "" && fallback.cost_price_cents !== undefined) {
      form.setValue("cost_price_cents", fallback.cost_price_cents, { shouldDirty: true, shouldValidate: false });
    }
  }, [form, globalCostPrice, globalRegularPrice, globalSellPrice, pricingMode, variants.length]);

  function setPrimaryVariant(id: string) {
    form.clearErrors("variants");
    const nextVariants = variants.map((variant) => ({
      ...variant,
      is_primary: variant.id === id,
    }));
    form.setValue("variants", nextVariants, { shouldDirty: true, shouldValidate: false });
  }

  function updateVariant(id: string, patch: Partial<ProductVariantDraft>) {
    form.clearErrors("variants");
    let nextVariants = variants.map((variant) => variant.id === id ? { ...variant, ...patch } : variant);
    if (!nextVariants.some((v) => v.is_primary)) {
      const firstActive = nextVariants.find((v) => v.status === "active") ?? nextVariants[0];
      if (firstActive) {
        nextVariants = nextVariants.map((v) => ({ ...v, is_primary: v.id === firstActive.id }));
      }
    }
    form.setValue("variants", nextVariants, { shouldDirty: true, shouldValidate: false });
  }

  function removeVariant(id: string) {
    form.clearErrors("variants");
    const filtered = variants.filter((variant) => variant.id !== id);
    if (filtered.length > 0 && !filtered.some((v) => v.is_primary)) {
      const firstActive = filtered.find((v) => v.status === "active") ?? filtered[0];
      if (firstActive) {
        firstActive.is_primary = true;
      }
    }
    form.setValue("variants", filtered, { shouldDirty: true, shouldValidate: false });
  }

  function updateVariantPricing(
    id: string,
    field: "price_cents" | "compare_at_price_cents" | "cost_price_cents",
    rawValue: string,
  ) {
    const value = rawValue === "" ? undefined : Number(rawValue);
    form.clearErrors("variants");

    if (pricingMode === "global") {
      const inherited = {
        price_cents: globalSellPrice === "" ? undefined : Number(globalSellPrice),
        compare_at_price_cents: globalRegularPrice === "" ? undefined : Number(globalRegularPrice),
        cost_price_cents: globalCostPrice === "" ? undefined : Number(globalCostPrice),
      };
      globalPricingFallback.current = inherited;
      variantPricingFallbackInitialized.current = true;

      const nextVariants = variants.map((variant) => ({
        ...variant,
        ...inherited,
        ...(variant.id === id ? { [field]: value } : {}),
      }));
      form.setValue("pricing_mode", "variant", { shouldDirty: true, shouldValidate: false });
      form.setValue("variants", nextVariants, { shouldDirty: true, shouldValidate: false });
      return;
    }

    const nextVariants = variants.map((variant) => variant.id === id ? { ...variant, [field]: value } : variant);
    const hasSpecificPricing = nextVariants.some((variant) => (
      variant.price_cents !== undefined
      || variant.compare_at_price_cents !== undefined
      || variant.cost_price_cents !== undefined
    ));

    if (hasSpecificPricing) {
      form.setValue("variants", nextVariants, { shouldDirty: true, shouldValidate: false });
      return;
    }

    const fallback = globalPricingFallback.current;
    form.setValue("base_price_cents", fallback.price_cents ?? "", { shouldDirty: true, shouldValidate: false });
    form.setValue("compare_at_price_cents", fallback.compare_at_price_cents ?? "", { shouldDirty: true, shouldValidate: false });
    form.setValue("cost_price_cents", fallback.cost_price_cents ?? "", { shouldDirty: true, shouldValidate: false });
    form.setValue("pricing_mode", "global", { shouldDirty: true, shouldValidate: false });
    form.setValue("variants", nextVariants, { shouldDirty: true, shouldValidate: false });
  }

  function toggleAttributeValue(id: number, checked: boolean) {
    form.setValue("attribute_values", checked ? [...selectedAttributes, id] : selectedAttributes.filter((value) => value !== id), { shouldDirty: true });
  }

  function toggleAccordion(id: string) {
    setOpenVariantIds((ids) => ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]);
  }

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Product Variants"
        description="Select defining attributes to generate sellable variants. Designate a Primary Variant to serve as the default storefront selection."
      />

      <div className="rounded-lg border border-border bg-background">
        <div className="border-b border-border p-3">
          <input
            className="h-10 w-full rounded-lg border border-border bg-muted px-3 text-sm outline-none transition focus:border-primary focus:bg-background"
            value={attributeSearch}
            onChange={(event) => setAttributeSearch(event.target.value)}
            placeholder="Search attributes & options (e.g., Color, Size)..."
          />
        </div>
        <div className="max-h-80 space-y-4 overflow-y-auto p-3">
          {loadingAttributes ? (
            <p className="text-sm text-muted-foreground">Searching attributes...</p>
          ) : groupedAttributes.length ? groupedAttributes.map((group) => (
            <div key={group.id} className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold">{group.name} {group.isVariantDefining ? <span className="text-xs font-normal text-primary">(Variant Defining)</span> : null}</p>
                <span className="text-xs text-muted-foreground">{group.values.filter((value) => selectedAttributes.includes(Number(value.id))).length} selected</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {group.values.map((value) => {
                  const id = Number(value.id);
                  const checked = selectedAttributes.includes(id);
                  return (
                    <label key={value.id} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted cursor-pointer transition">
                      <input type="checkbox" checked={checked} onChange={(event) => toggleAttributeValue(id, event.target.checked)} className="h-4 w-4 rounded border-border" />
                      <span>{value.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )) : (
            <p className="text-sm text-muted-foreground">No attribute values available.</p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {variants.length ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {pricingMode === "global"
                ? "Variant prices shown below are inherited from Global Pricing. Editing any price switches to independent variant pricing."
                : "Independent variant pricing is active. Clear all variant prices to restore global pricing."}
            </p>
            <span className="text-xs font-medium text-muted-foreground">
              {variants.length} variant(s) generated
            </span>
          </div>
        ) : null}

        {variants.length ? variants.map((variant, index) => (
          <div
            key={variant.id}
            className={`rounded-lg border transition ${variant.is_primary ? "border-primary/50 bg-primary/[0.02]" : "border-border bg-background"}`}
          >
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
                  <span className="flex items-center gap-2 text-sm font-bold">
                    <span>{variantName(variant.attribute_values) || `Variant ${index + 1}`}</span>
                    {variant.is_primary ? (
                      <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        <Star className="h-3 w-3 fill-primary text-primary" />
                        Primary Default
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    SKU: {variant.sku || "Auto-generated"} &bull; {pricingMode === "variant" && variant.price_cents !== undefined ? formatCurrency(variant.price_cents) : "Inherited price"}
                  </span>
                </span>
              </button>

              <div className="flex items-center gap-2">
                {!variant.is_primary && variant.status === "active" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => setPrimaryVariant(variant.id)}
                  >
                    Set as Primary
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => removeVariant(variant.id)}
                  aria-label="Remove variant"
                  icon={<Trash2 className="h-4 w-4" />}
                />
              </div>
            </div>

            {openVariantIds.includes(variant.id) ? (
              <div className="border-t border-border p-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <Input label="SKU" placeholder="Auto-generated if blank" value={variant.sku} onChange={(event) => updateVariant(variant.id, { sku: event.target.value })} />
                  <Input label="Sell Price" type="number" min={0} step="0.01" placeholder="Enter sell price" value={pricingMode === "global" ? globalSellPrice : variant.price_cents ?? ""} onChange={(event) => updateVariantPricing(variant.id, "price_cents", event.target.value)} />
                  <Input label="Regular (Compare-At) Price" type="number" min={0} step="0.01" placeholder="Enter regular price" value={pricingMode === "global" ? globalRegularPrice : variant.compare_at_price_cents ?? ""} onChange={(event) => updateVariantPricing(variant.id, "compare_at_price_cents", event.target.value)} />
                  <Input label="Cost Price" type="number" min={0} step="0.01" placeholder="Enter cost price" value={pricingMode === "global" ? globalCostPrice : variant.cost_price_cents ?? ""} onChange={(event) => updateVariantPricing(variant.id, "cost_price_cents", event.target.value)} />
                  <SelectField label="Track Inventory" value={String(variant.track_inventory)} placeholder="Select inventory behavior" options={[{ id: "true", name: "Track inventory" }, { id: "false", name: "Do not track" }]} onChange={(value) => updateVariant(variant.id, { track_inventory: value === "true" })} />
                  <Input label="Stock Quantity" type="number" min={0} placeholder="Enter quantity" value={variant.stock_quantity ?? ""} onChange={(event) => updateVariant(variant.id, { stock_quantity: event.target.value ? Number(event.target.value) : "" })} />
                  <SelectField label="Status" value={variant.status} placeholder="Select status" options={[{ id: "active", name: "Active" }, { id: "inactive", name: "Inactive" }]} onChange={(value) => updateVariant(variant.id, { status: value as ProductVariantDraft["status"] })} />
                </div>
              </div>
            ) : null}
          </div>
        )) : (
          <div className="rounded-lg border border-dashed border-border bg-muted/40 p-6 text-center">
            <p className="text-sm font-semibold">No variants defined</p>
            <p className="mt-1 text-xs text-muted-foreground">Select one or more attribute values above to generate variant combinations.</p>
          </div>
        )}
      </div>
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

export function PublishSection({ form, options, onNavigateStep }: SectionProps & { onNavigateStep?: (stepIndex: number) => void }) {
  const watched = useWatch({ control: form.control });
  const values = { ...form.getValues(), ...(watched || {}) } as ProductWizardValues;
  const hasVariants = (values.variants || []).length > 0;
  const activeVariants = (values.variants || []).filter((variant) => variant.status === "active");
  const usesGlobalPricing = values.pricing_mode === "global";
  const primaryVariant = (values.variants || []).find((v) => v.is_primary);
  const readiness = computeValidationReadiness(values);

  const checks = [
    { label: "Basic information", info: readiness.basic },
    { label: "Pricing & Inventory", info: readiness.pricing },
    { label: "Variants & Primary default", info: readiness.variants },
    { label: "Images & Media", info: readiness.media },
    { label: "Publication state", info: readiness.publish },
  ];

  return (
    <div className="space-y-5">
      <SectionHeader title="Publish & Merchandising" description="Review the product summary, validation checks, and publication state." />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="rounded-lg border border-border bg-background p-4">
          <h3 className="text-base font-bold">{values.name || "Untitled product"}</h3>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <Summary label="Brand" value={optionName(options, "brands", values.brand_id)} />
            <Summary label="Category" value={optionName(options, "categories", values.subcategory_id || values.category_id)} />
            <Summary label="Pricing Mode" value={usesGlobalPricing ? "Global Product Pricing" : "Independent Variant Pricing"} />
            <Summary label="Sell Price" value={usesGlobalPricing ? formatCurrency(Number(values.base_price_cents || 0)) : primaryVariant?.price_cents !== undefined ? `${formatCurrency(primaryVariant.price_cents)} (Primary)` : "Managed by variants"} />
            <Summary label="Stock" value={hasVariants ? "Managed by variants" : values.track_inventory ? String(values.stock_quantity || 0) : "Not tracked"} />
            <Summary label="Images" value={`${values.featured_image ? 1 : 0} featured, ${(values.gallery_images || []).length} gallery`} />
            <Summary label="Variants" value={hasVariants ? `${values.variants.length} total (${activeVariants.length} active)` : "None (Single product)"} />
          </div>
        </div>
        <div className="rounded-lg border border-border bg-background p-4">
          <p className="text-sm font-bold">Validation Readiness</p>
          <div className="mt-3 space-y-2">
            {checks.map((check) => (
              <button
                key={check.label}
                type="button"
                className="flex w-full items-center justify-between gap-3 rounded-md p-1.5 text-left text-sm transition hover:bg-muted/60"
                onClick={() => onNavigateStep?.(check.info.stepIndex)}
              >
                <span className="flex items-center gap-1.5 truncate">
                  <CheckCircle2 className={`h-4 w-4 shrink-0 ${check.info.isValid ? "text-emerald-600" : "text-amber-600"}`} />
                  <span className="truncate">{check.label}</span>
                </span>
                <span className={check.info.isValid ? "shrink-0 text-xs font-semibold text-emerald-600" : "shrink-0 text-xs font-semibold text-amber-600"}>
                  {check.info.isValid ? "Ready" : "Needs review"}
                </span>
              </button>
            ))}
          </div>
          <div className="mt-5 space-y-3">
            <SelectField label="Status" value={useFieldValue(form, "status")} placeholder="Select status" options={statusOptions} onChange={(value) => form.setValue("status", value as ProductWizardValues["status"], { shouldDirty: true })} />
            <DatePicker label="Publish Date" value={useFieldValue(form, "published_at") || null} onChange={(value) => form.setValue("published_at", value, { shouldDirty: true })} />
          </div>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <ToggleField label="Featured" checked={useFieldValue(form, "is_featured")} onChange={(checked) => form.setValue("is_featured", checked, { shouldDirty: true })} />
        <ToggleField label="New Arrival" checked={useFieldValue(form, "is_new")} onChange={(checked) => form.setValue("is_new", checked, { shouldDirty: true })} />
        <ToggleField label="Best Seller" checked={useFieldValue(form, "is_best_seller")} onChange={(checked) => form.setValue("is_best_seller", checked, { shouldDirty: true })} />
        <ToggleField label="Flash Sale" checked={useFieldValue(form, "is_flash_sale")} onChange={(checked) => form.setValue("is_flash_sale", checked, { shouldDirty: true })} />
        <ToggleField label="Free Shipping" description="Eligible for free shipping." checked={useFieldValue(form, "free_shipping")} onChange={(checked) => form.setValue("free_shipping", checked, { shouldDirty: true })} />
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

