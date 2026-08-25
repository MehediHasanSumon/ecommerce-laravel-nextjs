"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  FileText,
  ImagePlus,
  Layers,
  ListOrdered,
  Loader2,
  Package,
  Plus,
  Sparkles,
  Star,
  Tag as TagIcon,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { productManagementService } from "@/features/admin/products/services/product-management-service";
import type { ProductOptions, ProductRecord } from "@/features/admin/products/types";
import {
  emptyProductFormValues,
  generateCartesianVariants,
  productFormSchema,
  productPayloadFromFormValues,
  valuesFromProductRecord,
  type ProductFormValues,
  type ProductMediaItem,
  type VariantItem,
} from "./product-form-types";
import { toAppError } from "@/lib/errors";
import { routePaths } from "@/constants/routes";
import { selectBrandsEnabled, selectCurrencySymbol, useSettingsStore } from "@/store/settings-store";
import { toast } from "sonner";
import { cn } from "@/utils/cn";

interface ProductFormPageProps {
  mode: "create" | "edit";
  productId?: number;
}

export function ProductFormPage({ mode, productId }: ProductFormPageProps) {
  const router = useRouter();
  const brandsEnabled = useSettingsStore(selectBrandsEnabled);
  const currencySymbol = useSettingsStore(selectCurrencySymbol);

  const [loading, setLoading] = useState(mode === "edit");
  const [submitting, setSubmitting] = useState(false);
  const [options, setOptions] = useState<ProductOptions>({
    brands: [],
    categories: [],
    attributes: [],
    attribute_values: [],
    tags: [],
    products: [],
    collections: [],
    customers: [],
  });

  const [values, setValues] = useState<ProductFormValues>(emptyProductFormValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newTagInput, setNewTagInput] = useState("");

  // Load product options and product data (if edit mode)
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [optRes, prodRes] = await Promise.all([
          productManagementService.options(),
          mode === "edit" && productId ? productManagementService.get("products", productId) : Promise.resolve(null),
        ]);

        if (!isMounted) return;

        const loadedOptions = (optRes.data?.options || (optRes as unknown as { options: ProductOptions }).options) ?? options;
        setOptions(loadedOptions);

        const loadedProduct = prodRes?.data?.item || (prodRes as unknown as { item?: ProductRecord })?.item;
        if (loadedProduct) {
          const formValues = valuesFromProductRecord(loadedProduct, loadedOptions);
          setValues(formValues);
        }
      } catch (err) {
        if (!isMounted) return;
        const appErr = toAppError(err);
        toast.error(appErr.message || "Failed to load product data.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [mode, productId]);

  // Handle simple change
  const handleChange = <K extends keyof ProductFormValues>(field: K, val: ProductFormValues[K]) => {
    setValues((prev) => ({ ...prev, [field]: val }));
    if (errors[field as string]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field as string];
        return next;
      });
    }
  };

  // Categories & Sub-Categories
  const parentCategories = useMemo(() => {
    return options.categories.filter((c) => !c.parent_id);
  }, [options.categories]);

  const subCategories = useMemo(() => {
    if (!values.category_id) return [];
    return options.categories.filter((c) => Number(c.parent_id) === Number(values.category_id));
  }, [options.categories, values.category_id]);

  const handleCategoryChange = (val: string) => {
    const nextCatId = val === "none" ? "" : val;
    setValues((prev) => ({
      ...prev,
      category_id: nextCatId,
      sub_category_id: "", // reset sub category when category changes
    }));
    if (errors.category_id) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.category_id;
        return next;
      });
    }
  };

  const handleSubCategoryChange = (val: string) => {
    const nextSubCatId = val === "none" ? "" : val;
    setValues((prev) => ({
      ...prev,
      sub_category_id: nextSubCatId,
    }));
  };

  // Filter variant-defining attributes
  const variantDefiningAttributes = useMemo(() => {
    const list = options.attributes.filter((a) => a.is_variant_defining !== false);
    return list.length > 0 ? list : options.attributes;
  }, [options.attributes]);

  // Attribute values grouped by attribute ID
  const attributeValuesByAttr = useMemo(() => {
    const map = new Map<number, Array<{ id: number; name: string }>>();
    options.attribute_values.forEach((v) => {
      const attrId = Number(v.attribute_id);
      if (!map.has(attrId)) {
        map.set(attrId, []);
      }
      map.get(attrId)!.push({ id: Number(v.id), name: v.name });
    });
    return map;
  }, [options.attribute_values]);

  // Toggle attribute value checkbox
  const handleToggleAttributeValue = (attributeId: number, valueId: number) => {
    setValues((prev) => {
      const currentSelected = prev.selected_attribute_values[attributeId] || [];
      const isSelected = currentSelected.includes(valueId);
      const nextSelected = isSelected
        ? currentSelected.filter((id) => id !== valueId)
        : [...currentSelected, valueId];

      const nextMap = {
        ...prev.selected_attribute_values,
        [attributeId]: nextSelected,
      };

      if (nextSelected.length === 0) {
        delete nextMap[attributeId];
      }

      return {
        ...prev,
        selected_attribute_values: nextMap,
      };
    });
  };

  // Generate Cartesian Variants
  const handleGenerateVariants = () => {
    const generated = generateCartesianVariants(
      values.selected_attribute_values,
      options,
      values.variants,
      {
        samePricing: values.same_pricing_for_all,
        cost: values.global_cost_price,
        regular: values.global_regular_price,
        selling: values.global_selling_price,
      }
    );

    if (generated.length === 0) {
      toast.warning("Please select values from at least one attribute to generate variants.");
      return;
    }

    setValues((prev) => ({
      ...prev,
      variants: generated,
    }));

    toast.success(`Generated ${generated.length} variant combinations.`);
  };

  // Handle global pricing changes when "Same pricing for all variants" is checked
  const handleGlobalPricingChange = (
    field: "global_cost_price" | "global_regular_price" | "global_selling_price",
    value: number | ""
  ) => {
    setValues((prev) => {
      const next = { ...prev, [field]: value };
      if (prev.same_pricing_for_all && prev.variants.length > 0) {
        const variantPriceField =
          field === "global_cost_price"
            ? "cost_price"
            : field === "global_regular_price"
            ? "regular_price"
            : "selling_price";

        next.variants = prev.variants.map((v) => ({
          ...v,
          [variantPriceField]: value,
        }));
      }
      return next;
    });
  };

  // Toggle "Same pricing for all variants"
  const handleToggleSamePricing = (checked: boolean) => {
    setValues((prev) => {
      const next = { ...prev, same_pricing_for_all: checked };
      if (checked && prev.variants.length > 0) {
        next.variants = prev.variants.map((v) => ({
          ...v,
          cost_price: prev.global_cost_price,
          regular_price: prev.global_regular_price,
          selling_price: prev.global_selling_price,
        }));
      }
      return next;
    });
  };

  // Update specific variant row in table
  const handleVariantRowChange = <K extends keyof VariantItem>(
    index: number,
    field: K,
    val: VariantItem[K]
  ) => {
    setValues((prev) => {
      const nextVariants = [...prev.variants];
      if (!nextVariants[index]) return prev;

      if (field === "is_primary" && val === true) {
        // Enforce single primary variant
        nextVariants.forEach((v, i) => {
          v.is_primary = i === index;
        });
      } else {
        nextVariants[index] = {
          ...nextVariants[index],
          [field]: val,
        };
      }

      return {
        ...prev,
        variants: nextVariants,
      };
    });
  };

  // Remove variant from table
  const handleRemoveVariant = (index: number) => {
    setValues((prev) => {
      const nextVariants = prev.variants.filter((_, i) => i !== index);
      // If the removed variant was primary, reassign primary to the first surviving variant
      if (nextVariants.length > 0 && !nextVariants.some((v) => v.is_primary)) {
        nextVariants[0].is_primary = true;
      }
      return {
        ...prev,
        variants: nextVariants,
      };
    });
  };

  // Image Upload Handling
  const handleImageFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newMediaItems: ProductMediaItem[] = Array.from(files).map((file, idx) => ({
      id: `local-${Date.now()}-${idx}-${Math.random()}`,
      url: URL.createObjectURL(file),
      file,
      alt_text: "",
      is_primary: false,
      type: "gallery",
    }));

    setValues((prev) => {
      if (!prev.featured_image) {
        const [first, ...rest] = newMediaItems;
        first.is_primary = true;
        first.type = "featured";
        return {
          ...prev,
          featured_image: first,
          gallery_images: [...prev.gallery_images, ...rest],
        };
      }
      return {
        ...prev,
        gallery_images: [...prev.gallery_images, ...newMediaItems],
      };
    });
  };

  // Set Gallery Image as Primary
  const handleSetPrimaryImage = (index: number) => {
    setValues((prev) => {
      const target = prev.gallery_images[index];
      if (!target) return prev;

      const previousPrimary = prev.featured_image;
      const nextGallery = prev.gallery_images.filter((_, i) => i !== index);

      if (previousPrimary) {
        previousPrimary.is_primary = false;
        previousPrimary.type = "gallery";
        nextGallery.unshift(previousPrimary);
      }

      target.is_primary = true;
      target.type = "featured";

      return {
        ...prev,
        featured_image: target,
        gallery_images: nextGallery,
      };
    });
  };

  // Remove Image
  const handleRemoveImage = (type: "featured" | "gallery", index?: number) => {
    setValues((prev) => {
      if (type === "featured") {
        if (prev.gallery_images.length > 0) {
          const [nextPrimary, ...restGallery] = prev.gallery_images;
          nextPrimary.is_primary = true;
          nextPrimary.type = "featured";
          return {
            ...prev,
            featured_image: nextPrimary,
            gallery_images: restGallery,
          };
        }
        return {
          ...prev,
          featured_image: null,
        };
      }

      if (typeof index === "number") {
        return {
          ...prev,
          gallery_images: prev.gallery_images.filter((_, i) => i !== index),
        };
      }

      return prev;
    });
  };

  // Feature Handlers
  const handleToggleFeatures = (checked: boolean) => {
    setValues((prev) => {
      const nextFeatures = checked && prev.features.length === 0 ? [{ value: "" }] : prev.features;
      return {
        ...prev,
        enable_features: checked,
        features: nextFeatures,
      };
    });
  };

  const handleAddFeature = () => {
    setValues((prev) => ({
      ...prev,
      features: [...prev.features, { value: "" }],
    }));
  };

  const handleFeatureChange = (index: number, val: string) => {
    setValues((prev) => {
      const next = [...prev.features];
      if (next[index]) {
        next[index] = { ...next[index], value: val };
      }
      return { ...prev, features: next };
    });
  };

  const handleRemoveFeature = (index: number) => {
    setValues((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }));
  };

  // Specification Handlers
  const handleToggleSpecifications = (checked: boolean) => {
    setValues((prev) => {
      const nextSpecs = checked && prev.specifications.length === 0 ? [{ name: "", value: "", group_name: "" }] : prev.specifications;
      return {
        ...prev,
        enable_specifications: checked,
        specifications: nextSpecs,
      };
    });
  };

  const handleAddSpecification = () => {
    setValues((prev) => ({
      ...prev,
      specifications: [...prev.specifications, { name: "", value: "", group_name: "" }],
    }));
  };

  const handleSpecificationChange = (
    index: number,
    field: "name" | "value" | "group_name",
    val: string
  ) => {
    setValues((prev) => {
      const next = [...prev.specifications];
      if (next[index]) {
        next[index] = { ...next[index], [field]: val };
      }
      return { ...prev, specifications: next };
    });
  };

  const handleRemoveSpecification = (index: number) => {
    setValues((prev) => ({
      ...prev,
      specifications: prev.specifications.filter((_, i) => i !== index),
    }));
  };

  // Tag Handlers
  const handleAddTag = (tagName: string) => {
    const trimmed = tagName.trim();
    if (!trimmed) return;
    if (values.tags.includes(trimmed)) return;
    setValues((prev) => ({
      ...prev,
      tags: [...prev.tags, trimmed],
    }));
    setNewTagInput("");
  };

  const handleRemoveTag = (tagName: string) => {
    setValues((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tagName),
    }));
  };

  // Submit form
  const handleSubmit = async (targetStatus?: "draft" | "active" | "archived") => {
    const valuesToSubmit = {
      ...values,
      status: targetStatus || values.status,
    };

    const parseResult = productFormSchema.safeParse(valuesToSubmit);
    if (!parseResult.success) {
      const newErrors: Record<string, string> = {};
      parseResult.error.issues.forEach((issue) => {
        const pathKey = issue.path.join(".");
        newErrors[pathKey] = issue.message;
      });
      setErrors(newErrors);
      toast.error(parseResult.error.issues[0]?.message || "Please fix validation errors in the form.");
      return;
    }

    setSubmitting(true);
    setErrors({});

    try {
      const payload = productPayloadFromFormValues(valuesToSubmit);
      if (mode === "create") {
        await productManagementService.create("products", payload);
        toast.success("Product created successfully.");
      } else if (productId) {
        await productManagementService.update("products", productId, payload);
        toast.success("Product updated successfully.");
      }
      router.push(routePaths.adminProducts);
    } catch (err) {
      const appErr = toAppError(err);
      if (appErr.validationErrors) {
        const flat: Record<string, string> = {};
        Object.entries(appErr.validationErrors).forEach(([k, v]) => {
          flat[k] = Array.isArray(v) ? v[0] : String(v);
        });
        setErrors(flat);
      }
      toast.error(appErr.message || "Failed to save product.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading product details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => router.push(routePaths.adminProducts)}
          className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {mode === "create" ? "Create Product" : "Edit Product"}
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Single-page product management with automatic SKU generation and variant pricing.
          </p>
        </div>
      </div>

      {/* 1. Basic Information Section */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <div className="mb-5 flex items-center gap-2.5 border-b border-border pb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Basic Information</h2>
            <p className="text-xs text-muted-foreground">General details and product categorization</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Product Name */}
          <div className="sm:col-span-2 lg:col-span-4 space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Product Name <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="e.g. Premium Cotton Crewneck T-Shirt"
              value={values.name}
              onChange={(e) => handleChange("name", e.target.value)}
              error={errors.name}
            />
          </div>

          {/* Brand */}
          {brandsEnabled && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Brand</label>
              <Select
                value={values.brand_id || "none"}
                onValueChange={(val) => handleChange("brand_id", val === "none" ? "" : val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Brand (Optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None / No Brand</SelectItem>
                  {options.brands.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Category (Required) */}
          <div className={cn("space-y-1.5", !brandsEnabled && "sm:col-span-1 lg:col-span-2")}>
            <label className="text-xs font-medium text-foreground">
              Category <span className="text-destructive">*</span>
            </label>
            <Select
              value={values.category_id || "none"}
              onValueChange={handleCategoryChange}
            >
              <SelectTrigger className={cn("w-full", errors.category_id && "border-destructive")}>
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select Category</SelectItem>
                {parentCategories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category_id && <p className="text-xs text-destructive">{errors.category_id}</p>}
          </div>

          {/* Sub Category (Optional - Filtered by selected Category) */}
          <div className={cn("space-y-1.5", !brandsEnabled && "sm:col-span-1 lg:col-span-2")}>
            <label className="text-xs font-medium text-foreground">
              Sub Category <span className="text-muted-foreground text-[11px]">(Optional)</span>
            </label>
            <Select
              value={values.sub_category_id || "none"}
              onValueChange={handleSubCategoryChange}
              disabled={!values.category_id || subCategories.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    !values.category_id
                      ? "Select Category First"
                      : subCategories.length === 0
                      ? "No Sub Categories"
                      : "Select Sub Category (Optional)"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None / No Sub Category</SelectItem>
                {subCategories.map((sc) => (
                  <SelectItem key={sc.id} value={String(sc.id)}>
                    {sc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className={cn("space-y-1.5", !brandsEnabled ? "sm:col-span-2 lg:col-span-4" : "")}>
            <label className="text-xs font-medium text-foreground">Product Status</label>
            <Select
              value={values.status}
              onValueChange={(val) => handleChange("status", val as "draft" | "active" | "archived")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active (Published in store)</SelectItem>
                <SelectItem value="draft">Draft (Hidden from store)</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="sm:col-span-2 lg:col-span-4 space-y-1.5">
            <label className="text-xs font-medium text-foreground">Product Description</label>
            <textarea
              rows={4}
              className="w-full rounded-2xl border border-border/80 bg-background/90 px-4 py-3 text-sm text-foreground transition duration-200 placeholder:text-muted-foreground/80 hover:border-border hover:bg-background focus:border-primary focus:bg-background focus:outline-none focus:ring-0"
              placeholder="Detailed description of the product, materials, care instructions, etc."
              value={values.description}
              onChange={(e) => handleChange("description", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* 2. Variants & Pricing Section */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <div className="mb-5 flex flex-col gap-3 border-b border-border pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Variants & Pricing</h2>
              <p className="text-xs text-muted-foreground">Configure pricing, SKU generation, and attribute variations</p>
            </div>
          </div>

          {/* Product Type Toggle */}
          <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
            <button
              type="button"
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                values.product_type === "simple"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => handleChange("product_type", "simple")}
            >
              Simple Product
            </button>
            <button
              type="button"
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                values.product_type === "variable"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => handleChange("product_type", "variable")}
            >
              Variable Product
            </button>
          </div>
        </div>

        {/* Simple Product Fields */}
        {values.product_type === "simple" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Cost Price ({currencySymbol})
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={values.simple_cost_price}
                onChange={(e) => handleChange("simple_cost_price", e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Regular Price ({currencySymbol})
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={values.simple_regular_price}
                onChange={(e) => handleChange("simple_regular_price", e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Selling Price ({currencySymbol}) <span className="text-destructive">*</span>
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={values.simple_selling_price}
                onChange={(e) => handleChange("simple_selling_price", e.target.value === "" ? "" : Number(e.target.value))}
                error={errors.simple_selling_price}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Stock Quantity <span className="text-destructive">*</span>
              </label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={values.simple_stock_quantity}
                onChange={(e) => handleChange("simple_stock_quantity", e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>
          </div>
        )}

        {/* Variable Product Fields */}
        {values.product_type === "variable" && (
          <div className="space-y-5">
            {/* Attribute & Values Selection */}
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  1. Select Variant-Defining Attributes & Values
                </h3>
              </div>

              {variantDefiningAttributes.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No variant-defining attributes found. Please configure attributes in Attribute Settings.
                </p>
              ) : (
                <div className="space-y-3">
                  {variantDefiningAttributes.map((attr) => {
                    const attrValues = attributeValuesByAttr.get(Number(attr.id)) || [];
                    const selectedVals = values.selected_attribute_values[Number(attr.id)] || [];

                    return (
                      <div key={attr.id} className="rounded-md border border-border bg-background p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground">
                            {attr.name} ({selectedVals.length} selected)
                          </span>
                        </div>

                        {attrValues.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No values available for {attr.name}.</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {attrValues.map((val) => {
                              const isChecked = selectedVals.includes(val.id);
                              return (
                                <button
                                  key={val.id}
                                  type="button"
                                  onClick={() => handleToggleAttributeValue(Number(attr.id), val.id)}
                                  className={cn(
                                    "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                                    isChecked
                                      ? "bg-primary text-primary-foreground shadow-xs"
                                      : "border border-border bg-muted/30 text-muted-foreground hover:bg-muted"
                                  )}
                                >
                                  {isChecked && <Check className="h-3 w-3" />}
                                  {val.name}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Generate Variants Button */}
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                <span className="text-xs text-muted-foreground">
                  Click generate to compute all combinations automatically.
                </span>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleGenerateVariants}
                  className="flex items-center gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Generate Variants
                </Button>
              </div>
            </div>

            {/* Same Pricing for All Variants Section */}
            <div className="rounded-lg border border-border bg-muted/10 p-4">
              <div className="mb-3">
                <Checkbox
                  label="Same pricing for all variants"
                  description="Stock quantity remains independently configurable per variant."
                  checked={values.same_pricing_for_all}
                  onChange={(e) => handleToggleSamePricing(e.target.checked)}
                />
              </div>

              {values.same_pricing_for_all && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Cost Price ({currencySymbol})
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={values.global_cost_price}
                      onChange={(e) =>
                        handleGlobalPricingChange(
                          "global_cost_price",
                          e.target.value === "" ? "" : Number(e.target.value)
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Regular Price ({currencySymbol})
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={values.global_regular_price}
                      onChange={(e) =>
                        handleGlobalPricingChange(
                          "global_regular_price",
                          e.target.value === "" ? "" : Number(e.target.value)
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Selling Price ({currencySymbol}) <span className="text-destructive">*</span>
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={values.global_selling_price}
                      onChange={(e) =>
                        handleGlobalPricingChange(
                          "global_selling_price",
                          e.target.value === "" ? "" : Number(e.target.value)
                        )
                      }
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Generated Variants Table */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  2. Generated Variants ({values.variants.length})
                </h3>
                {values.variants.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    Click the star icon to select the Primary Variant.
                  </span>
                )}
              </div>

              {errors.variants && (
                <p className="mb-2 text-xs text-destructive">{errors.variants}</p>
              )}

              {values.variants.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-8 text-center text-muted-foreground">
                  <Package className="mb-2 h-7 w-7 text-muted-foreground/40" />
                  <p className="text-xs font-medium">No variants generated yet.</p>
                  <p className="text-xs text-muted-foreground">
                    Select attributes above and click &quot;Generate Variants&quot;.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
                      <tr>
                        <th className="px-3.5 py-2.5">Variant</th>
                        <th className="px-3.5 py-2.5">Cost ({currencySymbol})</th>
                        <th className="px-3.5 py-2.5">Regular ({currencySymbol})</th>
                        <th className="px-3.5 py-2.5">Selling ({currencySymbol}) *</th>
                        <th className="px-3.5 py-2.5">Stock *</th>
                        <th className="px-3.5 py-2.5 text-center">Primary</th>
                        <th className="px-3.5 py-2.5">Status</th>
                        <th className="px-3.5 py-2.5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {values.variants.map((v, index) => (
                        <tr
                          key={v.combination_key || index}
                          className={cn(
                            "transition-colors hover:bg-muted/30",
                            v.is_primary && "bg-primary/5 font-medium"
                          )}
                        >
                          {/* Variant Label */}
                          <td className="px-3.5 py-2.5">
                            <span className="font-semibold text-foreground">
                              {v.combination_label}
                            </span>
                          </td>

                          {/* Cost Price */}
                          <td className="px-3.5 py-2.5">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              disabled={values.same_pricing_for_all}
                              className="h-8 w-24 rounded-lg text-xs"
                              value={v.cost_price}
                              onChange={(e) =>
                                handleVariantRowChange(
                                  index,
                                  "cost_price",
                                  e.target.value === "" ? "" : Number(e.target.value)
                                )
                              }
                            />
                          </td>

                          {/* Regular Price */}
                          <td className="px-3.5 py-2.5">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              disabled={values.same_pricing_for_all}
                              className="h-8 w-24 rounded-lg text-xs"
                              value={v.regular_price}
                              onChange={(e) =>
                                handleVariantRowChange(
                                  index,
                                  "regular_price",
                                  e.target.value === "" ? "" : Number(e.target.value)
                                )
                              }
                            />
                          </td>

                          {/* Selling Price */}
                          <td className="px-3.5 py-2.5">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              disabled={values.same_pricing_for_all}
                              className="h-8 w-24 rounded-lg text-xs"
                              value={v.selling_price}
                              onChange={(e) =>
                                handleVariantRowChange(
                                  index,
                                  "selling_price",
                                  e.target.value === "" ? "" : Number(e.target.value)
                                )
                              }
                            />
                          </td>

                          {/* Stock Quantity */}
                          <td className="px-3.5 py-2.5">
                            <Input
                              type="number"
                              min="0"
                              className="h-8 w-20 rounded-lg text-xs"
                              value={v.stock_quantity}
                              onChange={(e) =>
                                handleVariantRowChange(
                                  index,
                                  "stock_quantity",
                                  e.target.value === "" ? "" : Number(e.target.value)
                                )
                              }
                            />
                          </td>

                          {/* Primary Selector */}
                          <td className="px-3.5 py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleVariantRowChange(index, "is_primary", true)}
                              title={v.is_primary ? "Primary Variant" : "Set as Primary"}
                              className={cn(
                                "inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors",
                                v.is_primary
                                  ? "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
                                  : "text-muted-foreground hover:bg-muted"
                              )}
                            >
                              <Star
                                className={cn(
                                  "h-4 w-4",
                                  v.is_primary && "fill-amber-500 text-amber-500"
                                )}
                              />
                            </button>
                          </td>

                          {/* Status */}
                          <td className="px-3.5 py-2.5">
                            <Select
                              value={v.status}
                              onValueChange={(val) =>
                                handleVariantRowChange(
                                  index,
                                  "status",
                                  val as "active" | "inactive"
                                )
                              }
                            >
                              <SelectTrigger className="h-8 w-24 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>

                          {/* Action */}
                          <td className="px-3.5 py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveVariant(index)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. Images & Media Section */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <div className="mb-5 flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ImagePlus className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Images & Media</h2>
              <p className="text-xs text-muted-foreground">Upload product cover and gallery photos</p>
            </div>
          </div>
        </div>

        {/* Dropzone */}
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/10 p-6 transition-colors hover:border-primary hover:bg-primary/5">
          <UploadCloud className="mb-2 h-8 w-8 text-primary" />
          <span className="text-xs font-semibold text-foreground">Click to upload images</span>
          <span className="text-xs text-muted-foreground">
            PNG, JPG, WEBP up to 10MB (First uploaded image will be cover)
          </span>
          <input
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => handleImageFilesSelected(e.target.files)}
          />
        </label>

        {/* Images Grid */}
        {(values.featured_image || values.gallery_images.length > 0) && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {/* Primary Cover Image */}
            {values.featured_image && (
              <div className="group relative aspect-square overflow-hidden rounded-lg border-2 border-primary bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={values.featured_image.url}
                  alt="Cover"
                  className="h-full w-full object-cover"
                />
                <span className="absolute left-1.5 top-1.5 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                  Cover
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveImage("featured")}
                  className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Gallery Images */}
            {values.gallery_images.map((img, idx) => (
              <div
                key={img.id || idx}
                className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={`Gallery ${idx + 1}`} className="h-full w-full object-cover" />
                <div className="absolute inset-0 flex flex-col items-center justify-between bg-black/40 p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => handleRemoveImage("gallery", idx)}
                    className="self-end rounded-full bg-black/60 p-1 text-white hover:bg-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetPrimaryImage(idx)}
                    className="rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white hover:bg-primary"
                  >
                    Set as Cover
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Optional Features & Specifications Checkboxes Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-xs sm:flex-row sm:items-center sm:gap-6">
        <Checkbox
          label="Add Key Features"
          description="Bullet points for product overview"
          checked={values.enable_features}
          onChange={(e) => handleToggleFeatures(e.target.checked)}
        />
        <div className="hidden h-6 w-px bg-border sm:block" />
        <Checkbox
          label="Add Specifications"
          description="Technical attributes and specifications"
          checked={values.enable_specifications}
          onChange={(e) => handleToggleSpecifications(e.target.checked)}
        />
      </div>

      {/* 4. Features Section (Only shown when Add Key Features is checked) */}
      {values.enable_features && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Key Features</h2>
                <p className="text-xs text-muted-foreground">Highlight top bullet points and selling highlights</p>
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleAddFeature}
              className="flex items-center gap-1 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Feature
            </Button>
          </div>

          <div className="space-y-2">
            {values.features.map((f, idx) => (
              <div key={idx} className="flex items-center gap-2 w-full">
                <div className="flex-1">
                  <Input
                    className="h-10 text-xs"
                    placeholder="e.g. 100% Breathable Organic Cotton"
                    value={f.value}
                    onChange={(e) => handleFeatureChange(idx, e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveFeature(idx)}
                  className="rounded p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Specifications Section (Only shown when Add Specifications is checked) */}
      {values.enable_specifications && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ListOrdered className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Specifications</h2>
                <p className="text-xs text-muted-foreground">Add technical properties (e.g. RAM, Storage, Material)</p>
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleAddSpecification}
              className="flex items-center gap-1 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Specification
            </Button>
          </div>

          <div className="space-y-2.5">
            {values.specifications.map((s, idx) => (
              <div key={idx} className="grid grid-cols-1 gap-2 sm:grid-cols-12 sm:items-center w-full">
                <div className="sm:col-span-3">
                  <Input
                    className="h-10 text-xs"
                    placeholder="Group (e.g. General)"
                    value={s.group_name || ""}
                    onChange={(e) => handleSpecificationChange(idx, "group_name", e.target.value)}
                  />
                </div>
                <div className="sm:col-span-4">
                  <Input
                    className="h-10 text-xs"
                    placeholder="Name (e.g. Material)"
                    value={s.name}
                    onChange={(e) => handleSpecificationChange(idx, "name", e.target.value)}
                  />
                </div>
                <div className="sm:col-span-4">
                  <Input
                    className="h-10 text-xs"
                    placeholder="Value (e.g. 100% Cotton)"
                    value={s.value}
                    onChange={(e) => handleSpecificationChange(idx, "value", e.target.value)}
                  />
                </div>
                <div className="flex justify-end sm:col-span-1">
                  <button
                    type="button"
                    onClick={() => handleRemoveSpecification(idx)}
                    className="rounded p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Tags Section */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <div className="mb-4 flex items-center gap-2.5 border-b border-border pb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <TagIcon className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Tags</h2>
            <p className="text-xs text-muted-foreground">Select or enter keywords for product discovery</p>
          </div>
        </div>

        <div className="space-y-3">
          {/* New Tag Input */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Type tag name and press Enter or Add Tag"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag(newTagInput);
                  }
                }}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleAddTag(newTagInput)}
            >
              Add Tag
            </Button>
          </div>

          {/* Selected Tags Chips */}
          {values.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {values.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="rounded text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Suggestions from existing tags */}
          {options.tags.length > 0 && (
            <div className="pt-2">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Suggested Tags:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {options.tags
                  .filter((t) => !values.tags.includes(t.name))
                  .slice(0, 10)
                  .map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleAddTag(t.name)}
                      className="rounded border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                    >
                      + {t.name}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Form Bottom Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          disabled={submitting}
          onClick={() => router.push(routePaths.adminProducts)}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={submitting}
          onClick={() => handleSubmit("draft")}
        >
          Save as Draft
        </Button>
        <Button
          type="button"
          variant="primary"
          disabled={submitting}
          onClick={() => handleSubmit(values.status === "draft" ? "active" : values.status)}
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : mode === "create" ? (
            "Save Product"
          ) : (
            "Update Product"
          )}
        </Button>
      </div>
    </div>
  );
}
