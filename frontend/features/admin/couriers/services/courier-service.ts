"use client";

import { AdminApiService, cleanParams } from "@/features/admin/shared/api";
import type {
  CourierProviderMetadata,
  CourierProviderOption,
  CourierProviderSetting,
  CourierShipment,
  CourierShipmentListResponse,
  CreateCourierShipmentPayload,
} from "@/features/admin/couriers/types";

type CourierSettingsData = {
  providers: CourierProviderSetting[];
  metadata: Record<string, CourierProviderMetadata>;
};

class CourierService extends AdminApiService {
  settings() {
    return this.unwrap<CourierSettingsData>(this.client.get("/admin/settings/couriers"));
  }

  updateSettings(providers: CourierProviderSetting[]) {
    return this.unwrap<CourierSettingsData>(this.client.put("/admin/settings/couriers", { providers }));
  }

  testConnection(provider: string) {
    return this.unwrap<{ result: Record<string, unknown> }>(
      this.client.post(`/admin/settings/couriers/${encodeURIComponent(provider)}/test`),
    );
  }

  locations(provider: string, type: "stores" | "cities" | "zones" | "areas", params: Record<string, number> = {}) {
    return this.unwrap<{ items: Array<Record<string, unknown>> }>(
      this.client.get(`/admin/settings/couriers/${encodeURIComponent(provider)}/locations/${type}`, {
        params: cleanParams(params),
      }),
    );
  }

  options() {
    return this.unwrap<{ providers: CourierProviderOption[] }>(this.client.get("/admin/shipments/options"));
  }

  shipments(query: Record<string, unknown>) {
    return this.unwrap<CourierShipmentListResponse>(
      this.client.get("/admin/shipments", { params: cleanParams(query) }),
    );
  }

  shipment(id: string) {
    return this.unwrap<{ shipment: CourierShipment }>(
      this.client.get(`/admin/shipments/${encodeURIComponent(id)}`),
    );
  }

  createForOrder(order: string, payload: CreateCourierShipmentPayload) {
    return this.unwrap<{ shipment: CourierShipment }>(
      this.client.post(`/admin/orders/${encodeURIComponent(order)}/courier-shipment`, payload),
    );
  }

  sync(id: string) {
    return this.unwrap<{ shipment: CourierShipment }>(
      this.client.post(`/admin/shipments/${encodeURIComponent(id)}/sync`),
    );
  }

  cancel(id: string) {
    return this.unwrap<{ shipment: CourierShipment }>(
      this.client.post(`/admin/shipments/${encodeURIComponent(id)}/cancel`),
    );
  }

  bulkCreate(orderIds: string[], provider: string) {
    return this.unwrap<{ queued: number }>(
      this.client.post("/admin/shipments/bulk-create", { order_ids: orderIds, provider }),
    );
  }

  bulkSync(shipmentIds: string[]) {
    return this.unwrap<{ queued: number }>(
      this.client.post("/admin/shipments/bulk-sync", { shipment_ids: shipmentIds }),
    );
  }

  calculateCharge(payload: Record<string, string | number>) {
    return this.unwrap<{
      available: boolean;
      charge: {
        delivery_charge_cents: number;
        cod_charge_cents: number;
        weight_charge_cents: number;
        zone_charge_cents: number;
        return_charge_cents: number;
      } | null;
    }>(this.client.post("/admin/shipments/calculate-charge", payload));
  }
}

export const courierService = new CourierService();
