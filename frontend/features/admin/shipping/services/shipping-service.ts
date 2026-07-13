"use client";

import { AdminApiService, cleanParams } from "@/features/admin/shared/api";
import type { QueryState } from "@/features/admin/shared/types";
import type {
  ShippingMethod,
  ShippingMethodPayload,
  ShippingZone,
  ShippingZonePayload,
} from "@/features/admin/shipping/types";

type ZoneListData = {
  zones: ShippingZone[];
};

type MethodListData = {
  methods: ShippingMethod[];
  zones: ShippingZone[];
};

class ShippingService extends AdminApiService {
  zones(query: Partial<QueryState>) {
    return this.unwrap<ZoneListData>(this.client.get("/admin/shipping-zones", { params: cleanParams(query) }));
  }

  createZone(payload: ShippingZonePayload) {
    return this.unwrap<{ zone: ShippingZone }>(this.client.post("/admin/shipping-zones", payload));
  }

  updateZone(id: number, payload: ShippingZonePayload) {
    return this.unwrap<{ zone: ShippingZone }>(this.client.put(`/admin/shipping-zones/${id}`, payload));
  }

  deleteZone(id: number) {
    return this.unwrap<Record<string, never>>(this.client.delete(`/admin/shipping-zones/${id}`));
  }

  bulkDeleteZones(ids: number[]) {
    return this.unwrap<{ deleted: number }>(this.client.delete("/admin/shipping-zones/bulk", { data: { ids } }));
  }

  reorderZones(items: Array<{ id: number; sort_order: number }>) {
    return this.unwrap<{ updated: number }>(this.client.post("/admin/shipping-zones/reorder", { items }));
  }

  methods(query: Partial<QueryState> & { shipping_zone_id?: string | number }) {
    return this.unwrap<MethodListData>(this.client.get("/admin/shipping-methods", { params: cleanParams(query) }));
  }

  createMethod(payload: ShippingMethodPayload) {
    return this.unwrap<{ method: ShippingMethod }>(this.client.post("/admin/shipping-methods", payload));
  }

  updateMethod(id: number, payload: ShippingMethodPayload) {
    return this.unwrap<{ method: ShippingMethod }>(this.client.put(`/admin/shipping-methods/${id}`, payload));
  }

  deleteMethod(id: number) {
    return this.unwrap<Record<string, never>>(this.client.delete(`/admin/shipping-methods/${id}`));
  }

  bulkDeleteMethods(ids: number[]) {
    return this.unwrap<{ deleted: number }>(this.client.delete("/admin/shipping-methods/bulk", { data: { ids } }));
  }

  reorderMethods(items: Array<{ id: number; sort_order: number }>) {
    return this.unwrap<{ updated: number }>(this.client.post("/admin/shipping-methods/reorder", { items }));
  }
}

export const shippingService = new ShippingService();
