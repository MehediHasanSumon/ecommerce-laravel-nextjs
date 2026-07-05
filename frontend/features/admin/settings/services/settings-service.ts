"use client";

import { AdminApiService } from "@/features/admin/shared/api";
import { useSettingsStore } from "@/store/settings-store";

export class SettingsApiService extends AdminApiService {
  get<T>(path: string) {
    return this.unwrap<T>(this.client.get(`/admin/settings/${path}`));
  }

  update<TPayload, TResponse>(path: string, payload: TPayload) {
    return this.unwrap<TResponse>(this.client.put(`/admin/settings/${path}`, payload)).then(
      async (response) => {
        await useSettingsStore.getState().refreshSettings();
        return response;
      },
    );
  }

  upload(path: string, file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return this.unwrap<{ url: string }>(this.client.post(`/admin/settings/${path}/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }));
  }

  test(path: string) {
    return this.unwrap<{ status: string }>(this.client.post(`/admin/settings/${path}/test`));
  }
}

export const settingsApi = new SettingsApiService();
