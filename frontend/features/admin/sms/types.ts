export type SmsTemplate = {
  event: string;
  name: string;
  body: string;
  enabled: boolean;
  allowed_placeholders: string[];
};

export type SmsSettings = {
  enabled: boolean;
  provider: string;
  provider_configuration: {
    method: "GET" | "POST";
    format: "json" | "form" | "query";
    recipient_format: "digits" | "e164";
    recipient_parameter: string;
    message_parameter: string;
    sender_parameter: string;
    route_parameter: string;
    api_key_parameter: string;
    api_secret_parameter: string;
    username_parameter: string;
    password_parameter: string;
  };
  api_base_url: string | null;
  api_key?: string;
  api_secret?: string;
  username?: string;
  password?: string;
  api_key_configured: boolean;
  api_secret_configured: boolean;
  username_configured: boolean;
  password_configured: boolean;
  sender_id: string | null;
  route: string | null;
  default_country_code: string;
  request_timeout: number;
  test_number: string | null;
  require_guest_checkout_otp: boolean;
  require_registered_checkout_otp: boolean;
  otp_length: number;
  otp_expiration_minutes: number;
  otp_resend_cooldown_seconds: number;
  otp_max_resends: number;
  otp_max_verification_attempts: number;
  otp_rate_limit_per_hour: number;
  order_confirmation_enabled: boolean;
  order_status_events: Record<string, boolean>;
  shipping_status_events: Record<string, boolean>;
};

export type SmsSettingsPayload = {
  settings: SmsSettings;
  templates: SmsTemplate[];
  providers: Array<{ value: string; label: string }>;
  placeholders: string[];
};

export type SmsLog = {
  id: string;
  recipient: string;
  type: string;
  related_order: string | null;
  provider: string | null;
  message: string;
  status: "queued" | "sent" | "failed" | "skipped";
  provider_message_id: string | null;
  api_response: Record<string, unknown> | null;
  error_message: string | null;
  retry_count: number;
  sent_at: string | null;
  created_at: string | null;
};
