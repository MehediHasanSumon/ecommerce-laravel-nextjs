import type { BaseRecord } from "@/features/admin/shared/types";

export type ShippingStatus = "active" | "inactive";

export type ShippingZone = BaseRecord & {
  name: string;
  countries: string[];
  description?: string | null;
  status: ShippingStatus;
  methods_count: number;
  display_order: number;
};

export type ShippingMethod = BaseRecord & {
  shipping_zone_id: number;
  shipping_zone?: { id: number; name: string } | null;
  name: string;
  description?: string | null;
  delivery_time?: string | null;
  delivery_type?: string | null;
  shipping_cost: number;
  free_shipping: boolean;
  minimum_order_amount: number;
  status: ShippingStatus;
  display_order: number;
};

export type ShippingZonePayload = {
  name: string;
  countries: string[];
  description?: string | null;
  status: boolean;
  display_order?: number;
};

export type ShippingMethodPayload = {
  shipping_zone_id: number;
  name: string;
  delivery_time?: string | null;
  shipping_cost: number;
  free_shipping: boolean;
  minimum_order_amount?: number;
  status: boolean;
  display_order?: number;
  description?: string | null;
  delivery_type?: string | null;
};
