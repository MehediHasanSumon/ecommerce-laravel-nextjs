"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { productManagementService } from "@/features/admin/products/services/product-management-service";
import {
  ProductForm,
  productModuleConfigs,
  type DrawerMode,
} from "@/features/admin/products/components/product-management-content";
import type { ProductModulePayload, ProductOptions, ProductRecord } from "@/features/admin/products/types";
import type { ApiValidationErrors } from "@/types/auth";
import { routePaths } from "@/constants/routes";
import { toAppError } from "@/lib/errors";
import { hasPermission } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth-store";

const emptyOptions: ProductOptions = {
  brands: [],
  categories: [],
  attributes: [],
  attribute_values: [],
  tags: [],
  warehouses: [],
  products: [],
};

function firstValidationMessage(errors: ApiValidationErrors | undefined) {
  if (!errors) return null;
  const first = Object.entries(errors)[0];
  if (!first) return null;

  return `${first[0]}: ${first[1]?.[0] ?? "Invalid value."}`;
}

export function CollectionFormPage({ mode, collectionId }: { mode: DrawerMode; collectionId?: number }) {
  const router = useRouter();
  const config = productModuleConfigs.collections;
  useAuthStore((state) => state.user?.permissions);
  const canSave = hasPermission(mode === "edit" ? "can_edit_collection" : "can_create_collection");
  const [item, setItem] = useState<ProductRecord | null>(null);
  const [options, setOptions] = useState<ProductOptions>(emptyOptions);
  const [loading, setLoading] = useState(mode === "edit");

  const title = mode === "create" ? "Create Collection" : "Edit Collection";
  const description = mode === "create"
    ? "Create a storefront collection with rules, assigned products, scheduling, discounts, banners, and SEO."
    : "Update collection rules, assigned products, display behavior, scheduling, discounts, banners, and SEO.";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [optionsResponse, itemResponse] = await Promise.all([
        productManagementService.options(),
        mode === "edit" && collectionId
          ? productManagementService.get("collections", collectionId)
          : Promise.resolve(null),
      ]);
      setOptions(optionsResponse.data.options ?? emptyOptions);
      setItem(itemResponse?.data.item ?? null);
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setLoading(false);
    }
  }, [collectionId, mode]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!canSave) {
      router.replace(routePaths.adminCollections);
    }
  }, [canSave, router]);

  const submit = useCallback(async (values: ProductModulePayload) => {
    try {
      if (mode === "create") {
        await productManagementService.create("collections", values);
        toast.success("Collection created successfully.");
      } else if (collectionId) {
        await productManagementService.update("collections", collectionId, values);
        toast.success("Collection updated successfully.");
      }
      router.push(routePaths.adminCollections);
    } catch (error) {
      const appError = toAppError(error);
      toast.error(firstValidationMessage(appError.validationErrors) ?? appError.message);
    }
  }, [collectionId, mode, router]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            icon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => router.push(routePaths.adminCollections)}
          >
            Back to Collections
          </Button>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <section className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5">
        {loading ? (
          <div className="space-y-4">
            <div className="h-10 animate-pulse rounded-lg bg-muted" />
            <div className="h-80 animate-pulse rounded-lg bg-muted" />
          </div>
        ) : (
          <ProductForm
            config={config}
            item={item}
            options={options}
            mode={mode}
            onCancel={() => router.push(routePaths.adminCollections)}
            onSubmit={submit}
          />
        )}
      </section>
    </div>
  );
}
