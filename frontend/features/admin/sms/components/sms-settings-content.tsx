"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BellRing, KeyRound, ListChecks, MessageSquareText, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { routePaths } from "@/constants/routes";
import {
  FormActions,
  FormGrid,
  LoadingInline,
  SelectInput,
  SettingsGrid,
  SettingsPageShell,
  SettingsSection,
  TextareaInput,
  TextInput,
  ToggleSwitch,
  useUnsavedChanges,
} from "@/features/admin/settings/components/settings-primitives";
import { smsAdminService } from "@/features/admin/sms/services/sms-service";
import type { SmsSettings, SmsSettingsPayload, SmsTemplate } from "@/features/admin/sms/types";
import { toAppError } from "@/lib/errors";
import { hasPermission } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth-store";
import { useSettingsStore } from "@/store/settings-store";

const emptySettings: SmsSettings = {
  enabled: false,
  provider: "generic_http",
  provider_configuration: {
    method: "POST",
    format: "json",
    recipient_format: "digits",
    recipient_parameter: "to",
    message_parameter: "message",
    sender_parameter: "sender_id",
    route_parameter: "route",
    api_key_parameter: "",
    api_secret_parameter: "",
    username_parameter: "",
    password_parameter: "",
  },
  api_base_url: "",
  api_key: "",
  api_secret: "",
  username: "",
  password: "",
  api_key_configured: false,
  api_secret_configured: false,
  username_configured: false,
  password_configured: false,
  sender_id: "",
  route: "",
  default_country_code: "880",
  request_timeout: 15,
  test_number: "",
  require_guest_checkout_otp: false,
  require_registered_checkout_otp: false,
  otp_length: 6,
  otp_expiration_minutes: 5,
  otp_resend_cooldown_seconds: 60,
  otp_max_resends: 3,
  otp_max_verification_attempts: 5,
  otp_rate_limit_per_hour: 10,
  order_confirmation_enabled: true,
  order_status_events: {},
  shipping_status_events: {},
};

function clonePayload(payload: SmsSettingsPayload) {
  return {
    settings: {
      ...payload.settings,
      api_key: "",
      api_secret: "",
      username: "",
      password: "",
      order_status_events: { ...payload.settings.order_status_events },
      shipping_status_events: { ...payload.settings.shipping_status_events },
      provider_configuration: { ...payload.settings.provider_configuration },
    },
    templates: payload.templates.map((template) => ({ ...template })),
    providers: payload.providers.map((provider) => ({ ...provider })),
    placeholders: [...payload.placeholders],
  };
}

function label(value: string) {
  return value.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

export function SmsSettingsContent() {
  useAuthStore((state) => state.user?.permissions);
  const canEdit = hasPermission("can_edit_sms_setting");
  const refreshRuntime = useSettingsStore((state) => state.refreshSettings);
  const [payload, setPayload] = useState<SmsSettingsPayload>({
    settings: emptySettings,
    templates: [],
    providers: [{ value: "generic_http", label: "Generic HTTP API" }],
    placeholders: [],
  });
  const [initial, setInitial] = useState<SmsSettingsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const isDirty = useMemo(() => Boolean(initial) && JSON.stringify(payload) !== JSON.stringify(initial), [initial, payload]);
  useUnsavedChanges(isDirty);

  useEffect(() => {
    let active = true;
    smsAdminService.settings()
      .then((response) => {
        if (!active) return;
        const next = clonePayload(response.data);
        setPayload(next);
        setInitial(clonePayload(response.data));
      })
      .catch((error) => toast.error(toAppError(error).message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  function updateSettings(patch: Partial<SmsSettings>) {
    setPayload((current) => ({ ...current, settings: { ...current.settings, ...patch } }));
  }

  function updateProviderConfiguration(patch: Partial<SmsSettings["provider_configuration"]>) {
    updateSettings({ provider_configuration: { ...payload.settings.provider_configuration, ...patch } });
  }

  function updateTemplate(event: string, patch: Partial<SmsTemplate>) {
    setPayload((current) => ({
      ...current,
      templates: current.templates.map((template) => template.event === event ? { ...template, ...patch } : template),
    }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    try {
      const response = await smsAdminService.update({ ...payload.settings, templates: payload.templates });
      const next = clonePayload(response.data);
      setPayload(next);
      setInitial(clonePayload(response.data));
      await refreshRuntime();
      toast.success(response.message || "SMS settings saved.");
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setSaving(false);
    }
  }

  async function testProvider() {
    const mobile = payload.settings.test_number?.trim();
    if (!mobile) {
      toast.error("Enter a test SMS number first.");
      return;
    }
    setTesting(true);
    try {
      await smsAdminService.test(mobile);
      toast.success("Test SMS sent successfully.");
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return <div className="py-16"><LoadingInline label="Loading SMS settings..." /></div>;
  }

  const settings = payload.settings;
  return (
    <form onSubmit={save}>
      <SettingsPageShell
        title="SMS Settings"
        description="Manage the SMS provider, checkout verification, notification rules, templates, and delivery testing."
        icon={MessageSquareText}
        actions={
          <>
            <Link href={routePaths.adminSettingsSmsLogs}>
              <Button type="button" size="sm" variant="secondary" icon={<ListChecks className="h-4 w-4" />}>SMS Logs</Button>
            </Link>
            {canEdit ? <FormActions isSaving={saving} isDirty={isDirty} onReset={() => initial && setPayload(clonePayload(initial))} /> : null}
          </>
        }
      >
        <SettingsGrid>
          <SettingsSection title="SMS Service" description="The master switch prevents all application SMS delivery when disabled." icon={MessageSquareText}>
            <ToggleSwitch
              label="Enable SMS Service"
              description="OTP and notification messages are sent only while this switch is enabled."
              checked={settings.enabled}
              onChange={(enabled) => updateSettings({ enabled })}
            />
          </SettingsSection>

          <SettingsSection title="Provider Configuration" description="Configure any provider that accepts a standard HTTP JSON request." icon={KeyRound}>
            <div className="space-y-4">
              <FormGrid>
                <SelectInput
                  label="SMS Provider"
                  value={settings.provider}
                  options={payload.providers.map((provider) => ({ value: provider.value, label: provider.label }))}
                  onChange={(provider) => updateSettings({ provider })}
                />
                <TextInput label="API Base URL" type="url" value={settings.api_base_url ?? ""} onChange={(event) => updateSettings({ api_base_url: event.target.value })} required={settings.enabled} placeholder="https://provider.example/api/send" />
                <TextInput label="API Key" type="password" value={settings.api_key ?? ""} onChange={(event) => updateSettings({ api_key: event.target.value })} placeholder={settings.api_key_configured ? "Configured - leave blank to keep" : "API key"} />
                <TextInput label="API Secret / Token" type="password" value={settings.api_secret ?? ""} onChange={(event) => updateSettings({ api_secret: event.target.value })} placeholder={settings.api_secret_configured ? "Configured - leave blank to keep" : "API secret"} />
                <TextInput label="Username" value={settings.username ?? ""} onChange={(event) => updateSettings({ username: event.target.value })} placeholder={settings.username_configured ? "Configured - leave blank to keep" : "Provider username"} />
                <TextInput label="Password" type="password" value={settings.password ?? ""} onChange={(event) => updateSettings({ password: event.target.value })} placeholder={settings.password_configured ? "Configured - leave blank to keep" : "Provider password"} />
                <TextInput label="Sender ID / Masking Name" value={settings.sender_id ?? ""} onChange={(event) => updateSettings({ sender_id: event.target.value })} />
                <TextInput label="Route / Channel" value={settings.route ?? ""} onChange={(event) => updateSettings({ route: event.target.value })} />
                <TextInput label="Default Country Code" inputMode="numeric" value={settings.default_country_code} onChange={(event) => updateSettings({ default_country_code: event.target.value.replace(/\D/g, "") })} />
                <TextInput label="Request Timeout (seconds)" type="number" min={1} max={60} value={settings.request_timeout} onChange={(event) => updateSettings({ request_timeout: Number(event.target.value) })} />
              </FormGrid>
              <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                <TextInput label="Test SMS Number" value={settings.test_number ?? ""} onChange={(event) => updateSettings({ test_number: event.target.value })} placeholder="01XXXXXXXXX" />
                <Button type="button" size="sm" variant="secondary" isLoading={testing} icon={<Send className="h-4 w-4" />} onClick={() => void testProvider()}>Test Connection</Button>
              </div>
            </div>
          </SettingsSection>

          <SettingsSection title="Checkout Mobile Verification" description="Control OTP verification independently for guest and registered checkout." icon={ShieldCheck}>
            <div className="grid gap-3 md:grid-cols-2">
              <ToggleSwitch label="Require OTP for Guest Checkout" checked={settings.require_guest_checkout_otp} onChange={(require_guest_checkout_otp) => updateSettings({ require_guest_checkout_otp })} />
              <ToggleSwitch label="Require OTP for Registered Customers" checked={settings.require_registered_checkout_otp} onChange={(require_registered_checkout_otp) => updateSettings({ require_registered_checkout_otp })} />
            </div>
          </SettingsSection>

          <SettingsSection title="HTTP Request Mapping" description="Map the generic adapter to provider-specific methods, formats, and parameter names without changing code." icon={KeyRound}>
            <FormGrid>
              <SelectInput label="HTTP Method" value={settings.provider_configuration.method} options={[{ value: "POST", label: "POST" }, { value: "GET", label: "GET" }]} onChange={(method) => updateProviderConfiguration({ method: method as "GET" | "POST" })} />
              <SelectInput label="Request Format" value={settings.provider_configuration.format} options={[{ value: "json", label: "JSON Body" }, { value: "form", label: "Form Body" }, { value: "query", label: "Query Parameters" }]} onChange={(format) => updateProviderConfiguration({ format: format as "json" | "form" | "query" })} />
              <SelectInput label="Recipient Number Format" value={settings.provider_configuration.recipient_format} options={[{ value: "digits", label: "Digits only (880...)" }, { value: "e164", label: "E.164 (+880...)" }]} onChange={(recipient_format) => updateProviderConfiguration({ recipient_format: recipient_format as "digits" | "e164" })} />
              <TextInput label="Recipient Parameter" value={settings.provider_configuration.recipient_parameter} onChange={(event) => updateProviderConfiguration({ recipient_parameter: event.target.value })} />
              <TextInput label="Message Parameter" value={settings.provider_configuration.message_parameter} onChange={(event) => updateProviderConfiguration({ message_parameter: event.target.value })} />
              <TextInput label="Sender Parameter" value={settings.provider_configuration.sender_parameter} onChange={(event) => updateProviderConfiguration({ sender_parameter: event.target.value })} />
              <TextInput label="Route Parameter" value={settings.provider_configuration.route_parameter} onChange={(event) => updateProviderConfiguration({ route_parameter: event.target.value })} />
              <TextInput label="API Key Parameter" helper="Leave blank to send the API key as a Bearer token." value={settings.provider_configuration.api_key_parameter} onChange={(event) => updateProviderConfiguration({ api_key_parameter: event.target.value })} />
              <TextInput label="API Secret Parameter" helper="Leave blank to send it in the X-API-Secret header." value={settings.provider_configuration.api_secret_parameter} onChange={(event) => updateProviderConfiguration({ api_secret_parameter: event.target.value })} />
              <TextInput label="Username Parameter" helper="Leave username and password parameters blank to use HTTP Basic authentication." value={settings.provider_configuration.username_parameter} onChange={(event) => updateProviderConfiguration({ username_parameter: event.target.value })} />
              <TextInput label="Password Parameter" value={settings.provider_configuration.password_parameter} onChange={(event) => updateProviderConfiguration({ password_parameter: event.target.value })} />
            </FormGrid>
          </SettingsSection>

          <SettingsSection title="OTP Security" description="Set expiry, retry, resend, and rate limits for checkout verification." icon={ShieldCheck}>
            <FormGrid>
              <TextInput label="OTP Length" type="number" min={4} max={8} value={settings.otp_length} onChange={(event) => updateSettings({ otp_length: Number(event.target.value) })} />
              <TextInput label="Expiration (minutes)" type="number" min={1} max={30} value={settings.otp_expiration_minutes} onChange={(event) => updateSettings({ otp_expiration_minutes: Number(event.target.value) })} />
              <TextInput label="Resend Cooldown (seconds)" type="number" min={15} max={600} value={settings.otp_resend_cooldown_seconds} onChange={(event) => updateSettings({ otp_resend_cooldown_seconds: Number(event.target.value) })} />
              <TextInput label="Maximum Resend Attempts" type="number" min={0} max={10} value={settings.otp_max_resends} onChange={(event) => updateSettings({ otp_max_resends: Number(event.target.value) })} />
              <TextInput label="Maximum Verification Attempts" type="number" min={1} max={10} value={settings.otp_max_verification_attempts} onChange={(event) => updateSettings({ otp_max_verification_attempts: Number(event.target.value) })} />
              <TextInput label="OTP Requests per Hour" type="number" min={1} max={100} value={settings.otp_rate_limit_per_hour} onChange={(event) => updateSettings({ otp_rate_limit_per_hour: Number(event.target.value) })} />
            </FormGrid>
          </SettingsSection>

          <SettingsSection title="Notification Events" description="Enable each order and shipping notification independently." icon={BellRing}>
            <div className="space-y-5">
              <ToggleSwitch label="Order Confirmation" checked={settings.order_confirmation_enabled} onChange={(order_confirmation_enabled) => updateSettings({ order_confirmation_enabled })} />
              <EventGrid title="Order Status Updates" events={settings.order_status_events} onChange={(order_status_events) => updateSettings({ order_status_events })} />
              <EventGrid title="Shipping Status Updates" events={settings.shipping_status_events} onChange={(shipping_status_events) => updateSettings({ shipping_status_events })} />
            </div>
          </SettingsSection>

          <SettingsSection title="SMS Templates" description="Edit message text with the supported dynamic placeholders." icon={MessageSquareText}>
            <div className="mb-4 flex flex-wrap gap-2">
              {payload.placeholders.map((placeholder) => <code key={placeholder} className="rounded-md bg-muted px-2 py-1 text-xs">{`{${placeholder}}`}</code>)}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {payload.templates.map((template) => (
                <div key={template.event} className="rounded-lg border border-border p-3">
                  <ToggleSwitch label={template.name} checked={template.enabled} onChange={(enabled) => updateTemplate(template.event, { enabled })} />
                  <div className="mt-3">
                    <TextareaInput label="Template" rows={4} value={template.body} onChange={(event) => updateTemplate(template.event, { body: event.target.value })} />
                  </div>
                </div>
              ))}
            </div>
          </SettingsSection>
        </SettingsGrid>
      </SettingsPageShell>
    </form>
  );
}

function EventGrid({ title, events, onChange }: { title: string; events: Record<string, boolean>; onChange: (events: Record<string, boolean>) => void }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-bold">{title}</h3>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(events).map(([event, enabled]) => (
          <ToggleSwitch key={event} label={label(event)} checked={enabled} onChange={(checked) => onChange({ ...events, [event]: checked })} />
        ))}
      </div>
    </div>
  );
}
