export type FraudRiskLevel = "safe" | "low" | "medium" | "high" | "critical";

export type FraudProviderResult = {
  provider: string;
  status: "success" | "failed";
  risk_score: number;
  risk_level: FraudRiskLevel;
  blacklist_status: boolean | null;
  fraud_matches: number;
  known_scam_reports: number;
  chargeback_reports: number;
  suspicious_activity_count: number;
  risk_reasons: string[];
  recommendation: string | null;
  response_time_ms: number;
  error_message: string | null;
  raw_response: Record<string, unknown> | null;
};

export type FraudCheck = {
  id: string;
  subject_type: string;
  subject_key: string | null;
  input: {
    phone: string | null;
    name: string | null;
    email: string | null;
    ip_address: string | null;
    order_id: string | null;
    customer_id: string | null;
  };
  trigger: string;
  is_automatic: boolean;
  status: "pending" | "completed" | "partial" | "failed" | "cached";
  risk_score: number;
  risk_level: FraudRiskLevel;
  is_flagged: boolean;
  blacklist_status: boolean | null;
  fraud_matches: number;
  known_scam_reports: number;
  chargeback_reports: number;
  suspicious_activity_count: number;
  risk_reasons: string[];
  recommendation: string | null;
  decision: {
    flag?: boolean;
    hold?: boolean;
    reject?: boolean;
    block_cod?: boolean;
    requires_admin_approval?: boolean;
  };
  providers_requested: number;
  providers_succeeded: number;
  providers_failed: number;
  response_time_ms: number;
  checked_at: string | null;
  expires_at: string | null;
  providers: FraudProviderResult[];
};

export type FraudOrderSummary = {
  status: FraudRiskLevel | "unchecked";
  riskScore: number | null;
  checkedAt: string | null;
  flagged: boolean;
  onHold: boolean;
  codBlocked: boolean;
  approvedAt: string | null;
  providers: string[];
  checkId: string | null;
};

export type FraudProviderSetting = {
  id: number;
  provider: "fraudpeek" | "fraud_bd" | "fraudbd";
  enabled: boolean;
  sandbox_mode: boolean;
  api_url: string;
  api_key: string;
  api_secret: string;
  additional_configuration: Record<string, string>;
  connection_status: string;
  last_successful_connection_at: string | null;
  last_connection_attempt_at: string | null;
  last_error: string | null;
  circuit_open_until: string | null;
  display_order: number;
  credentials_configured: boolean;
  updated_at: string | null;
};

export type FraudGeneralSettings = {
  fraud_detection_enabled: boolean;
  fraud_auto_check_orders: boolean;
  fraud_auto_check_customers: boolean;
  fraud_check_during_checkout: boolean;
  fraud_check_before_cod_confirmation: boolean;
  fraud_check_before_shipment: boolean;
  fraud_score_threshold: number;
  fraud_critical_score_threshold: number;
  fraud_auto_flag_suspicious_orders: boolean;
  fraud_auto_hold_high_risk_orders: boolean;
  fraud_auto_reject_critical_risk_orders: boolean;
  fraud_block_cod_high_risk: boolean;
  fraud_require_admin_approval: boolean;
  fraud_provider_priority: string[];
  fraud_result_caching_enabled: boolean;
  fraud_cache_duration_minutes: number;
};

export type FraudProviderMetadata = {
  label: string;
  capabilities: Record<string, boolean>;
};

export type FraudAnalytics = {
  summary: {
    today_checks: number;
    weekly_checks: number;
    high_risk_orders: number;
    critical_orders: number;
    blocked_orders: number;
    held_orders: number;
    average_response_time_ms: number;
    flag_rate: number;
  };
  risk_distribution: Partial<Record<FraudRiskLevel, number>>;
  trend: Array<{ date: string; total: number; risky: number }>;
  providers: Array<{ provider: string; total: number; success_rate: number; average_response_time_ms: number }>;
  top_reasons: Array<{ reason: string; count: number }>;
};
