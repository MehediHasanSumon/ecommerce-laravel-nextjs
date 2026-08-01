import type { PaginationMeta } from "@/features/admin/shared/types";
import type { RuntimeMarketingTracking } from "@/types/settings";

export type ConnectionStatus = "not_tested" | "connected" | "failed";

export type MetaPixelSettings = {
  enabled: boolean;
  pixel_id: string | null;
  conversions_api_enabled: boolean;
  access_token: string;
  test_event_code: string;
  dataset_id: string | null;
  automatic_event_tracking: boolean;
  advanced_matching: boolean;
  server_side_tracking: boolean;
  browser_side_tracking: boolean;
  debug_mode: boolean;
  connection_status: ConnectionStatus;
  last_successful_event_at: string | null;
  last_connection_attempt_at: string | null;
  last_response: Record<string, unknown>;
  last_error: string | null;
  credentials_configured: boolean;
  updated_at: string | null;
};

export type GoogleAnalyticsSettings = {
  enabled: boolean;
  measurement_id: string | null;
  api_secret: string;
  enhanced_ecommerce: boolean;
  debug_mode: boolean;
  user_id_tracking: boolean;
  server_side_events: boolean;
  client_side_events: boolean;
  anonymize_ip: boolean;
  respect_consent_mode: boolean;
  connection_status: ConnectionStatus;
  last_successful_event_at: string | null;
  last_connection_attempt_at: string | null;
  last_response: Record<string, unknown>;
  last_error: string | null;
  credentials_configured: boolean;
  updated_at: string | null;
};

export type MarketingConnectionResult = {
  connected: boolean;
  response_time_ms: number;
  response: Record<string, unknown>;
};

export type MarketingAnalytics = {
  summary: {
    events_sent_today: number;
    failed_events: number;
    purchase_events: number;
    add_to_cart_events: number;
    checkout_events: number;
    success_rate: number;
    tracking_health: "healthy" | "degraded" | "unhealthy" | "no_data";
  };
  top_events: Array<{ event_name: string; total: number | string }>;
  platforms: Array<{
    platform: "meta" | "google";
    total: number | string;
    successful: number | string;
    failed: number | string;
  }>;
};

export type MarketingTrackingEvent = {
  id: string;
  event_id: string;
  platform: "meta" | "google";
  event_name: string;
  source: string;
  status: "queued" | "retrying" | "sent" | "failed" | "recorded" | "skipped";
  consent_status: "granted" | "denied" | "unspecified";
  execution_time_ms: number;
  retry_count: number;
  error_message: string | null;
  payload: Record<string, unknown>;
  response: Record<string, unknown>;
  user?: { id: number; name: string; email: string } | null;
  order?: { id: number; order_number: string } | null;
  actor?: { id: number; name: string } | null;
  occurred_at: string | null;
  sent_at: string | null;
};

export type MarketingLogsResponse = {
  events: MarketingTrackingEvent[];
  pagination: PaginationMeta;
};

export type MarketingRuntimeStatus = RuntimeMarketingTracking;
