"use client";

import { AdminApiService, cleanParams } from "@/features/admin/shared/api";
import type { ApiEnvelope, QueryState } from "@/features/admin/shared/types";
import type { ProductModule, ProductModulePayload, ProductOptions, ProductRecord } from "@/features/admin/products/types";
import { useSettingsStore } from "@/store/settings-store";

type ProductModuleListData = {
  items: ProductRecord[];
  options: ProductOptions;
};

class ProductManagementService extends AdminApiService {
  private async refreshRuntimeSettingsFor(module: ProductModule) {
    if (module === "categories" || module === "collections" || module === "currencies") {
      await useSettingsStore.getState().refreshSettings();
    }
  }

  private hasFile(value: unknown): boolean {
    if (value instanceof File) return true;
    if (Array.isArray(value)) return value.some((item) => this.hasFile(item));
    if (value && typeof value === "object") {
      return Object.values(value).some((item) => this.hasFile(item));
    }
    return false;
  }

  private appendFormValue(formData: FormData, key: string, value: unknown) {
    if (value === undefined || value === null || value === "") {
      return;
    }

    if (value instanceof File) {
      formData.append(key, value);
      return;
    }

    if (Array.isArray(value)) {
      if (value.every((item) => item instanceof File)) {
        value.forEach((file) => formData.append(`${key}[]`, file));
        return;
      }
      formData.append(key, JSON.stringify(value));
      return;
    }

    if (typeof value === "object") {
      formData.append(key, JSON.stringify(value));
      return;
    }

    formData.append(key, String(value));
  }

  private toRequestPayload(payload: ProductModulePayload) {
    if (!this.hasFile(payload)) {
      return payload;
    }

    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      this.appendFormValue(formData, key, value);
    });

    return formData;
  }

  list(module: ProductModule, query: Partial<QueryState>) {
    return this.unwrap<ProductModuleListData>(
      this.client.get(`/admin/product-management/${module}`, { params: cleanParams(query) }),
    );
  }

  create(module: ProductModule, payload: ProductModulePayload) {
    const requestPayload = this.toRequestPayload(payload);
    return this.unwrap<{ item: ProductRecord }>(
      this.client.post(`/admin/product-management/${module}`, requestPayload, requestPayload instanceof FormData ? {
        headers: { "Content-Type": "multipart/form-data" },
      } : undefined),
    ).then(async (response) => {
      await this.refreshRuntimeSettingsFor(module);
      return response;
    });
  }

  get(module: ProductModule, id: number) {
    return this.unwrap<{ item: ProductRecord }>(
      this.client.get(`/admin/product-management/${module}/${id}`),
    );
  }

  options() {
    return this.unwrap<{ options: ProductOptions }>(
      this.client.get("/admin/product-options"),
    );
  }

  update(module: ProductModule, id: number, payload: ProductModulePayload) {
    const requestPayload = this.toRequestPayload(payload);
    if (requestPayload instanceof FormData) {
      requestPayload.append("_method", "PUT");
      return this.unwrap<{ item: ProductRecord }>(
        this.client.post(`/admin/product-management/${module}/${id}`, requestPayload, {
          headers: { "Content-Type": "multipart/form-data" },
        }),
      ).then(async (response) => {
        await this.refreshRuntimeSettingsFor(module);
        return response;
      });
    }

    return this.unwrap<{ item: ProductRecord }>(
      this.client.put(`/admin/product-management/${module}/${id}`, requestPayload),
    ).then(async (response) => {
      await this.refreshRuntimeSettingsFor(module);
      return response;
    });
  }

  delete(module: ProductModule, id: number) {
    return this.unwrap<Record<string, never>>(
      this.client.delete(`/admin/product-management/${module}/${id}`),
    ).then(async (response) => {
      await this.refreshRuntimeSettingsFor(module);
      return response;
    });
  }

  bulkDelete(module: ProductModule, ids: number[]) {
    return this.unwrap<{ deleted: number }>(
      this.client.delete(`/admin/product-management/${module}/bulk`, { data: { ids } }),
    ).then(async (response) => {
      await this.refreshRuntimeSettingsFor(module);
      return response;
    });
  }
}

export const productManagementService = new ProductManagementService();
export type ProductModuleListResponse = ApiEnvelope<ProductModuleListData>;
