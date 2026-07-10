"use client";

import { AdminApiService } from "@/features/admin/shared/api";
import type { ApiEnvelope } from "@/features/admin/shared/types";
import type { HeroSectionPayload, HeroSettings, HeroSlide } from "@/features/admin/hero-section/types";
import { useSettingsStore } from "@/store/settings-store";

type SlideData = { item: HeroSlide };

class HeroSectionService extends AdminApiService {
  get() {
    return this.unwrap<HeroSectionPayload>(this.client.get("/admin/settings/hero-section"));
  }

  updateSettings(payload: HeroSettings) {
    return this.afterWrite(this.unwrap<{ settings: HeroSettings }>(this.client.put("/admin/settings/hero-section", payload)));
  }

  createSlide(payload: HeroSlide) {
    return this.afterWrite(this.unwrap<SlideData>(this.client.post("/admin/hero-slides", payload)));
  }

  updateSlide(id: number, payload: HeroSlide) {
    return this.afterWrite(this.unwrap<SlideData>(this.client.put(`/admin/hero-slides/${id}`, payload)));
  }

  duplicateSlide(id: number) {
    return this.afterWrite(this.unwrap<SlideData>(this.client.post(`/admin/hero-slides/${id}/duplicate`)));
  }

  deleteSlide(id: number) {
    return this.afterWrite(this.unwrap<Record<string, never>>(this.client.delete(`/admin/hero-slides/${id}`)));
  }

  reorderSlides(slides: Array<{ id: number; sort_order: number }>) {
    return this.afterWrite(this.unwrap<{ slides: HeroSlide[] }>(this.client.post("/admin/hero-slides/reorder", { slides })));
  }

  uploadImage(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return this.unwrap<{ url: string }>(this.client.post("/admin/settings/hero-section/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }));
  }

  private async afterWrite<T>(request: Promise<ApiEnvelope<T>>) {
    const response = await request;
    await useSettingsStore.getState().refreshSettings();
    return response;
  }
}

export const heroSectionService = new HeroSectionService();
