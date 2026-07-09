"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ProductOptions, ProductRecord } from "@/features/admin/products/types";
import { productManagementService } from "@/features/admin/products/services/product-management-service";
import { toAppError } from "@/lib/errors";
import { routePaths } from "@/constants/routes";
import { ProductFormLayout } from "@/features/admin/products/components/wizard/product-form-layout";
import {
  BasicInfoSection,
  InventorySection,
  MediaSection,
  PriceSection,
  PublishSection,
  SeoSection,
  ShippingSection,
  VariantSection,
} from "@/features/admin/products/components/wizard/product-wizard-sections";
import {
  emptyProductWizardValues,
  productPayloadFromValues,
  productWizardSchema,
  productWizardSteps,
  stepFields,
  valuesFromProduct,
} from "@/features/admin/products/components/wizard/product-wizard-types";
import type { ProductWizardMode, ProductWizardStepId, ProductWizardValues } from "@/features/admin/products/components/wizard/product-wizard-types";
import { ErrorSummary } from "@/features/admin/products/components/wizard/product-wizard-fields";

const emptyOptions: ProductOptions = {
  brands: [],
  categories: [],
  attributes: [],
  attribute_values: [],
  tags: [],
  warehouses: [],
  products: [],
};

function stripFileValues(values: ProductWizardValues): ProductWizardValues {
  return {
    ...values,
    featured_image: values.featured_image ? { ...values.featured_image, file: undefined } : null,
    gallery_images: values.gallery_images.map((image) => ({ ...image, file: undefined })),
  };
}

function normalizeCategorySelection(values: ProductWizardValues, options: ProductOptions): ProductWizardValues {
  const category = options.categories.find((item) => String(item.id) === String(values.category_id));
  if (category?.parent_id) {
    return {
      ...values,
      category_id: String(category.parent_id),
      subcategory_id: String(category.id),
    };
  }

  const subcategory = options.categories.find((item) => String(item.id) === String(values.subcategory_id));
  if (subcategory && String(subcategory.parent_id ?? "") !== String(values.category_id)) {
    return {
      ...values,
      subcategory_id: "",
    };
  }

  return values;
}

export function ProductWizardPage({ mode, productId }: { mode: ProductWizardMode; productId?: number }) {
  const router = useRouter();
  const [options, setOptions] = useState<ProductOptions>(emptyOptions);
  const [loading, setLoading] = useState(mode === "edit");
  const [activeStep, setActiveStep] = useState(0);
  const [initialProduct, setInitialProduct] = useState<ProductRecord | null>(null);
  const draftKey = useMemo(() => `product-wizard-${mode}-${productId ?? "new"}`, [mode, productId]);
  const form = useForm<ProductWizardValues>({
    resolver: zodResolver(productWizardSchema) as Resolver<ProductWizardValues>,
    defaultValues: emptyProductWizardValues(),
    mode: "onBlur",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [optionResponse, productResponse] = await Promise.all([
        productManagementService.options(),
        mode === "edit" && productId ? productManagementService.get("products", productId) : Promise.resolve(null),
      ]);
      setOptions(optionResponse.data.options ?? emptyOptions);
      const record = productResponse?.data.item ?? null;
      setInitialProduct(record);
      const loadedOptions = optionResponse.data.options ?? emptyOptions;
      const baseValues = valuesFromProduct(record, loadedOptions);
      const saved = typeof window !== "undefined" ? window.localStorage.getItem(draftKey) : null;
      form.reset(normalizeCategorySelection(saved ? { ...baseValues, ...JSON.parse(saved) } : baseValues, loadedOptions));
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setLoading(false);
    }
  }, [draftKey, form, mode, productId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/incompatible-library
    const subscription = form.watch((values) => {
      try {
        window.localStorage.setItem(draftKey, JSON.stringify(stripFileValues(values as ProductWizardValues)));
      } catch {
        // Draft persistence is best effort.
      }
    });
    return () => subscription.unsubscribe();
  }, [draftKey, form]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!form.formState.isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [form.formState.isDirty]);

  async function validateStep(step: number) {
    const stepId = productWizardSteps[step].id as ProductWizardStepId;
    return form.trigger(stepFields[stepId] as Array<keyof ProductWizardValues>);
  }

  async function goToStep(step: number) {
    if (step <= activeStep) {
      setActiveStep(step);
      return;
    }
    const valid = await validateStep(activeStep);
    if (valid) setActiveStep(step);
  }

  async function next() {
    const valid = await validateStep(activeStep);
    if (!valid) return;
    setActiveStep((current) => Math.min(current + 1, productWizardSteps.length - 1));
  }

  function saveDraft() {
    window.localStorage.setItem(draftKey, JSON.stringify(stripFileValues(form.getValues())));
    toast.success("Product draft saved.");
  }

  async function submit(publish: boolean) {
    const valid = await form.trigger();
    if (!valid) {
      toast.error("Resolve validation errors before publishing.");
      return;
    }

    const values = form.getValues();
    const payload = productPayloadFromValues(values, publish);
    try {
      if (mode === "edit" && productId) {
        await productManagementService.update("products", productId, payload);
        toast.success(publish ? "Product updated and published." : "Product updated.");
      } else {
        await productManagementService.create("products", payload);
        toast.success(publish ? "Product published." : "Product draft saved.");
      }
      window.localStorage.removeItem(draftKey);
      router.push(routePaths.adminProducts);
      router.refresh();
    } catch (error) {
      toast.error(toAppError(error).message);
    }
  }

  const currentStepId = productWizardSteps[activeStep].id as ProductWizardStepId;
  const title = mode === "edit" ? `Edit ${initialProduct?.name ?? "Product"}` : "Create Product";

  if (loading) {
    return (
      <div className="flex min-h-80 items-center justify-center rounded-lg border border-border bg-card">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <ProductFormLayout
      title={title}
      description="Build complete catalog records through focused steps with validation, media handling, variants, SEO, shipping, and publish controls."
      activeStep={activeStep}
      isSubmitting={form.formState.isSubmitting}
      submitLabel={mode === "edit" ? "Update Product" : "Publish Product"}
      onStepClick={goToStep}
      onPrevious={() => setActiveStep((current) => Math.max(current - 1, 0))}
      onNext={next}
      onSaveDraft={saveDraft}
      onSubmit={() => void submit(true)}
    >
      <ErrorSummary errors={form.formState.errors} />
      <div className="mt-4">
        {currentStepId === "basic" ? <BasicInfoSection form={form} options={options} /> : null}
        {currentStepId === "pricing" ? <PriceSection form={form} options={options} /> : null}
        {currentStepId === "inventory" ? <InventorySection form={form} options={options} /> : null}
        {currentStepId === "media" ? <MediaSection form={form} options={options} /> : null}
        {currentStepId === "variants" ? <VariantSection form={form} options={options} /> : null}
        {currentStepId === "seo" ? <SeoSection form={form} options={options} /> : null}
        {currentStepId === "shipping" ? <ShippingSection form={form} options={options} /> : null}
        {currentStepId === "publish" ? <PublishSection form={form} options={options} /> : null}
      </div>
      {currentStepId === "publish" ? (
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => void submit(false)} isLoading={form.formState.isSubmitting}>Save as Draft</Button>
        </div>
      ) : null}
    </ProductFormLayout>
  );
}
