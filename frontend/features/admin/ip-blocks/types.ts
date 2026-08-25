export type IpBlockType = "manual" | "automatic";
export type IpBlockStatus = "active" | "inactive";

export type IpBlockActor = {
  id?: number;
  name: string;
  email: string;
};

export type IpBlockEvent = {
  id: number;
  event_type: string;
  block_type: IpBlockType | null;
  reason: string | null;
  actor: IpBlockActor | null;
  metadata: Record<string, unknown> | null;
  occurred_at: string | null;
};

export type IpBlock = {
  id: number;
  ip_address: string;
  ip_version: 4 | 6;
  type: IpBlockType;
  status: IpBlockStatus;
  reason: string;
  notes: string | null;
  blocked_at: string | null;
  expires_at: string | null;
  last_activity_at: string | null;
  block_count: number;
  country_code: string | null;
  country: string | null;
  city: string | null;
  isp: string | null;
  user_agent: string | null;
  device_type: string | null;
  browser: string | null;
  operating_system: string | null;
  created_by: IpBlockActor | null;
  updated_by: IpBlockActor | null;
  events?: IpBlockEvent[];
  created_at: string | null;
  updated_at: string | null;
};

export type IpBlockPayload = {
  ip_address?: string;
  reason: string;
  status: IpBlockStatus;
  type: IpBlockType;
  expires_at: string | null;
  notes: string | null;
};

export type IpBlockAnalytics = {
  blocked_today: number;
  blocked_this_week: number;
  blocked_this_month: number;
  currently_blocked: number;
  automatic_blocks: number;
  manual_blocks: number;
  top_countries: Array<{ country: string; total: number }>;
  top_reasons: Array<{ reason: string; total: number }>;
};

export type SecuritySettings = {
  auto_blocking_enabled: boolean;
  enable_checkout_security: boolean;
  enable_cod_security: boolean;
  enable_payment_security: boolean;
  auto_block_critical_ips: boolean;
  max_failed_login_attempts: number;
  max_password_reset_attempts: number;
  max_payment_failures: number;
  failed_cod_threshold: number;
  time_window_minutes: number;
  temporary_block_duration_minutes: number;
  permanent_block_threshold: number;
};

export type SecuritySettingsPayload = SecuritySettings & {
  whitelist_ips: string[];
  blacklist_ips: string[];
  trusted_proxies: Array<{ network: string; label: string | null }>;
};
