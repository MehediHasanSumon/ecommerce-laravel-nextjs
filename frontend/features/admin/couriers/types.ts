import type { PaginationMeta } from "@/features/admin/shared/types";

export type CourierCapabilities = {
  create: boolean;
  cancel: boolean;
  track: boolean;
  remote_status: boolean;
  charge: boolean;
  cod_status: boolean;
  locations: boolean;
  stores: boolean;
  label: boolean;
  webhook: boolean;
};

export type CourierProviderMetadata = {
  label: string;
  capabilities: CourierCapabilities;
};

export type CourierProviderSetting = {
  id: number;
  provider: "steadfast" | "pathao";
  enabled: boolean;
  sandbox_mode: boolean;
  api_base_url: string | null;
  api_key: string;
  api_secret: string;
  webhook_secret: string;
  default_store_id: string | null;
  default_parcel_type: string;
  default_item_description: string | null;
  default_delivery_type: string | null;
  default_payment_type: "cash_on_delivery" | "prepaid" | "outstanding";
  default_weight: number;
  cod_amount_rule: "order_total" | "outstanding" | "zero" | "custom";
  custom_cod_amount: number;
  additional_configuration: Record<string, unknown>;
  display_order: number;
  credentials_configured: boolean;
  updated_at: string | null;
};

export type CourierProviderOption = {
  provider: "steadfast" | "pathao";
  label: string;
  capabilities: CourierCapabilities;
  defaults: {
    storeId: string | null;
    parcelType: string;
    itemDescription: string | null;
    deliveryType: string | null;
    paymentType: string;
    weight: number;
  };
};

export type CourierShipmentEvent = {
  id: number;
  status: string;
  rawStatus: string | null;
  title: string;
  description: string | null;
  occurredAt: string | null;
};

export type CourierApiLog = {
  id: string;
  operation: string;
  method: string;
  endpoint: string;
  requestPayload: Record<string, unknown> | null;
  responsePayload: Record<string, unknown> | null;
  httpStatus: number | null;
  status: string;
  executionTimeMs: number;
  retryCount: number;
  errorMessage: string | null;
  createdAt: string | null;
};

export type CourierShipment = {
  id: string;
  orderId: number;
  orderNumber: string;
  customer: { name: string; email: string | null; phone: string | null };
  provider: "steadfast" | "pathao";
  providerLabel: string;
  capabilities: CourierCapabilities;
  externalId: string | null;
  trackingNumber: string | null;
  status: string;
  deliveryStatus: string;
  codStatus: string;
  rawStatus: string | null;
  parcelType: string | null;
  deliveryType: string | null;
  paymentType: string | null;
  itemDescription: string | null;
  weight: number;
  amountToCollect: number;
  deliveryCharge: number | null;
  currency: string;
  trackingUrl: string | null;
  labelUrl: string | null;
  estimatedDeliveryAt: string | null;
  shipmentCreatedAt: string | null;
  lastSyncedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  lastError: string | null;
  createdAt: string | null;
  events?: CourierShipmentEvent[];
  apiLogs?: CourierApiLog[];
};

export type CourierShipmentListResponse = {
  shipments: CourierShipment[];
  providers: Record<string, CourierProviderMetadata>;
  statuses: string[];
  cod_statuses: string[];
};

export type CourierShipmentListEnvelope = {
  data: CourierShipmentListResponse;
  meta: { pagination?: PaginationMeta };
};

export type CreateCourierShipmentPayload = {
  provider: "steadfast" | "pathao";
  weight?: number;
  amount_to_collect?: number;
  parcel_type?: string;
  delivery_type?: string;
  payment_type?: "cash_on_delivery" | "prepaid" | "outstanding";
  item_description?: string;
  special_instruction?: string;
  store_id?: number;
  city_id?: number;
  zone_id?: number;
  area_id?: number;
};
