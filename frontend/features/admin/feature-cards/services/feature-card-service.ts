"use client";

import { AdminApiService, cleanParams } from "@/features/admin/shared/api";
import type { ApiEnvelope, QueryState } from "@/features/admin/shared/types";
import type { HomeFeatureCard, HomeFeatureCardPayload } from "@/features/admin/feature-cards/types";
import { useSettingsStore } from "@/store/settings-store";

type ListData = { items: HomeFeatureCard[] };
type ItemData = { item: HomeFeatureCard };

export class FeatureCardService extends AdminApiService {
  list(query: Partial<QueryState>) {
    return this.unwrap<ListData>(this.client.get("/admin/feature-cards", { params: cleanParams(query) }));
  }

  create(payload: HomeFeatureCardPayload) {
    return this.afterWrite(this.unwrap<ItemData>(this.client.post("/admin/feature-cards", payload)));
  }

  update(id: number, payload: HomeFeatureCardPayload) {
    return this.afterWrite(this.unwrap<ItemData>(this.client.put(`/admin/feature-cards/${id}`, payload)));
  }

  delete(id: number) {
    return this.afterWrite(this.unwrap<Record<string, never>>(this.client.delete(`/admin/feature-cards/${id}`)));
  }

  reorder(cards: Array<{ id: number; sort_order: number }>) {
    return this.afterWrite(this.unwrap<ListData>(this.client.post("/admin/feature-cards/reorder", { cards })));
  }

  private async afterWrite<T>(request: Promise<ApiEnvelope<T>>) {
    const response = await request;
    await useSettingsStore.getState().refreshSettings();
    return response;
  }
}

export const featureCardService = new FeatureCardService();
