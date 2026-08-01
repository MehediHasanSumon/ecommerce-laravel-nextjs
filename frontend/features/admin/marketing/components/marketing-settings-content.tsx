"use client";

import * as React from "react";
import { Activity, BarChart3, KeyRound, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SettingsSectionSkeleton } from "@/components/ui/skeleton";
import { marketingService } from "@/features/admin/marketing/services/marketing-service";
import type {
  GoogleAnalyticsSettings,
  MetaPixelSettings,
} from "@/features/admin/marketing/types";
import {
  FormActions,
  FormGrid,
  SettingsGrid,
  SettingsPageShell,
  SettingsSection,
  StatusPill,
  TextInput,
  ToggleSwitch,
  useUnsavedChanges,
} from "@/features/admin/settings/components/settings-primitives";
import { toAppError } from "@/lib/errors";
import { hasPermission } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth-store";
import { useSettingsStore } from "@/store/settings-store";

const emptyMeta: MetaPixelSettings = {
  enabled: false,
  pixel_id: "",
  conversions_api_enabled: false,
  access_token: "",
  test_event_code: "",
  dataset_id: "",
  automatic_event_tracking: true,
  advanced_matching: true,
  server_side_tracking: true,
  browser_side_tracking: true,
  debug_mode: false,
  connection_status: "not_tested",
  last_successful_event_at: null,
  last_connection_attempt_at: null,
  last_response: {},
  last_error: null,
  credentials_configured: false,
  updated_at: null,
};

const emptyGoogle: GoogleAnalyticsSettings = {
  enabled: false,
  measurement_id: "",
  api_secret: "",
  enhanced_ecommerce: true,
  debug_mode: false,
  user_id_tracking: false,
  server_side_events: true,
  client_side_events: true,
  anonymize_ip: true,
  respect_consent_mode: true,
  connection_status: "not_tested",
  last_successful_event_at: null,
  last_connection_attempt_at: null,
  last_response: {},
  last_error: null,
  credentials_configured: false,
  updated_at: null,
};

function dateTime(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Not available";
}

function ConnectionPanel({
  status,
  lastSuccessful,
  lastAttempt,
  lastError,
  lastResponse,
}: {
  status: string;
  lastSuccessful: string | null;
  lastAttempt: string | null;
  lastError: string | null;
  lastResponse: Record<string, unknown>;
}) {
  const connected = status === "connected";
  return (
    <SettingsSection
      title="Connection Status"
      description="Latest validation and event delivery health reported by the provider."
      icon={Activity}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <StatusPill
            ok={connected}
            label={connected ? "Connected" : status === "failed" ? "Connection failed" : "Not tested"}
          />
          <span className="text-sm text-muted-foreground">Last successful event: {dateTime(lastSuccessful)}</span>
          <span className="text-sm text-muted-foreground">Last test: {dateTime(lastAttempt)}</span>
        </div>
        {lastError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {lastError}
          </div>
        ) : null}
        {Object.keys(lastResponse).length ? (
          <details className="rounded-lg border border-border bg-muted/30 p-3">
            <summary className="cursor-pointer text-sm font-semibold">View last response</summary>
            <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-all text-xs text-muted-foreground">
              {JSON.stringify(lastResponse, null, 2)}
            </pre>
          </details>
        ) : null}
      </div>
    </SettingsSection>
  );
}

export function MetaPixelSettingsContent() {
  useAuthStore((state) => state.user?.permissions);
  const canEdit = hasPermission("can_edit_meta_pixel_setting");
  const refreshRuntime = useSettingsStore((state) => state.refreshSettings);
  const [settings, setSettings] = React.useState(emptyMeta);
  const [initial, setInitial] = React.useState<MetaPixelSettings | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const dirty = Boolean(initial) && JSON.stringify(settings) !== JSON.stringify(initial);
  useUnsavedChanges(dirty);

  React.useEffect(() => {
    marketingService.metaSettings()
      .then((response) => {
        const next = { ...response.data.settings, access_token: "", test_event_code: "" };
        setSettings(next);
        setInitial(next);
      })
      .catch((error) => toast.error(toAppError(error).message))
      .finally(() => setLoading(false));
  }, []);

  function patch(values: Partial<MetaPixelSettings>) {
    setSettings((current) => ({ ...current, ...values }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    try {
      const response = await marketingService.updateMeta(settings);
      const next = { ...response.data.settings, access_token: "", test_event_code: "" };
      setSettings(next);
      setInitial(next);
      await refreshRuntime();
      toast.success(response.message || "Meta Pixel settings saved.");
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setSaving(false);
    }
  }

  async function test() {
    setTesting(true);
    try {
      const response = await marketingService.testMeta();
      const refreshed = await marketingService.metaSettings();
      const next = { ...refreshed.data.settings, access_token: "", test_event_code: "" };
      setSettings(next);
      setInitial(next);
      toast.success(`Meta connection verified in ${response.data.result.response_time_ms}ms.`);
    } catch (error) {
      toast.error(toAppError(error).message);
      const refreshed = await marketingService.metaSettings().catch(() => null);
      if (refreshed) {
        const next = { ...refreshed.data.settings, access_token: "", test_event_code: "" };
        setSettings(next);
        setInitial(next);
      }
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return <div className="space-y-4"><SettingsSectionSkeleton /><SettingsSectionSkeleton /><SettingsSectionSkeleton /></div>;
  }

  return (
    <form onSubmit={save}>
      <SettingsPageShell
        title="Meta Pixel"
        description="Configure browser Pixel events, Conversions API delivery, advanced matching, and test events."
        icon={BarChart3}
        actions={canEdit ? (
          <>
            <Button type="button" size="sm" variant="secondary" icon={<Send className="h-4 w-4" />} isLoading={testing} onClick={() => void test()}>
              Test Connection
            </Button>
            <FormActions isSaving={saving} isDirty={dirty} onReset={() => initial && setSettings(initial)} />
          </>
        ) : null}
      >
        <SettingsGrid>
          <SettingsSection title="Meta Pixel" description="Enable the integration and configure the browser Pixel identity." icon={BarChart3}>
            <div className="space-y-4">
              <ToggleSwitch label="Enable Meta Pixel" checked={settings.enabled} onChange={(enabled) => patch({ enabled })} disabled={!canEdit} />
              <FormGrid>
                <TextInput label="Pixel ID" value={settings.pixel_id ?? ""} onChange={(event) => patch({ pixel_id: event.target.value.replace(/\D/g, "") })} required={settings.enabled} disabled={!canEdit} />
                <TextInput label="Dataset ID" value={settings.dataset_id ?? ""} onChange={(event) => patch({ dataset_id: event.target.value.replace(/\D/g, "") })} helper="Leave blank to use the Pixel ID." disabled={!canEdit} />
              </FormGrid>
            </div>
          </SettingsSection>

          <SettingsSection title="Conversions API" description="Send resilient server-side events without exposing credentials to the storefront." icon={KeyRound}>
            <div className="space-y-4">
              <ToggleSwitch label="Enable Conversions API" checked={settings.conversions_api_enabled} onChange={(conversions_api_enabled) => patch({ conversions_api_enabled })} disabled={!canEdit} />
              <FormGrid>
                <TextInput label="Access Token" type="password" value={settings.access_token} onChange={(event) => patch({ access_token: event.target.value })} placeholder={settings.credentials_configured ? "Configured - leave blank to keep" : "Meta access token"} required={settings.enabled && settings.conversions_api_enabled && !settings.credentials_configured} disabled={!canEdit} />
                <TextInput label="Test Event Code" type="password" value={settings.test_event_code} onChange={(event) => patch({ test_event_code: event.target.value })} placeholder="Optional test event code" disabled={!canEdit} />
              </FormGrid>
            </div>
          </SettingsSection>

          <SettingsSection title="Event Delivery" description="Control automatic ecommerce collection and the allowed delivery channels." icon={ShieldCheck}>
            <div className="grid gap-3 md:grid-cols-2">
              <ToggleSwitch label="Automatic Event Tracking" checked={settings.automatic_event_tracking} onChange={(automatic_event_tracking) => patch({ automatic_event_tracking })} disabled={!canEdit} />
              <ToggleSwitch label="Advanced Matching" checked={settings.advanced_matching} onChange={(advanced_matching) => patch({ advanced_matching })} disabled={!canEdit} />
              <ToggleSwitch label="Server-side Tracking" checked={settings.server_side_tracking} onChange={(server_side_tracking) => patch({ server_side_tracking })} disabled={!canEdit} />
              <ToggleSwitch label="Browser-side Tracking" checked={settings.browser_side_tracking} onChange={(browser_side_tracking) => patch({ browser_side_tracking })} disabled={!canEdit} />
              <ToggleSwitch label="Debug Mode" checked={settings.debug_mode} onChange={(debug_mode) => patch({ debug_mode })} disabled={!canEdit} />
            </div>
          </SettingsSection>

          <ConnectionPanel status={settings.connection_status} lastSuccessful={settings.last_successful_event_at} lastAttempt={settings.last_connection_attempt_at} lastError={settings.last_error} lastResponse={settings.last_response} />
        </SettingsGrid>
      </SettingsPageShell>
    </form>
  );
}

export function GoogleAnalyticsSettingsContent() {
  useAuthStore((state) => state.user?.permissions);
  const canEdit = hasPermission("can_edit_google_analytics_setting");
  const refreshRuntime = useSettingsStore((state) => state.refreshSettings);
  const [settings, setSettings] = React.useState(emptyGoogle);
  const [initial, setInitial] = React.useState<GoogleAnalyticsSettings | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const dirty = Boolean(initial) && JSON.stringify(settings) !== JSON.stringify(initial);
  useUnsavedChanges(dirty);

  React.useEffect(() => {
    marketingService.googleSettings()
      .then((response) => {
        const next = { ...response.data.settings, api_secret: "" };
        setSettings(next);
        setInitial(next);
      })
      .catch((error) => toast.error(toAppError(error).message))
      .finally(() => setLoading(false));
  }, []);

  function patch(values: Partial<GoogleAnalyticsSettings>) {
    setSettings((current) => ({ ...current, ...values }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    try {
      const response = await marketingService.updateGoogle(settings);
      const next = { ...response.data.settings, api_secret: "" };
      setSettings(next);
      setInitial(next);
      await refreshRuntime();
      toast.success(response.message || "Google Analytics settings saved.");
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setSaving(false);
    }
  }

  async function test() {
    setTesting(true);
    try {
      const response = await marketingService.testGoogle();
      const refreshed = await marketingService.googleSettings();
      const next = { ...refreshed.data.settings, api_secret: "" };
      setSettings(next);
      setInitial(next);
      toast.success(`Google Analytics connection verified in ${response.data.result.response_time_ms}ms.`);
    } catch (error) {
      toast.error(toAppError(error).message);
      const refreshed = await marketingService.googleSettings().catch(() => null);
      if (refreshed) {
        const next = { ...refreshed.data.settings, api_secret: "" };
        setSettings(next);
        setInitial(next);
      }
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return <div className="space-y-4"><SettingsSectionSkeleton /><SettingsSectionSkeleton /><SettingsSectionSkeleton /></div>;
  }

  return (
    <form onSubmit={save}>
      <SettingsPageShell
        title="Google Analytics"
        description="Configure GA4 browser tags, Measurement Protocol events, ecommerce data, and consent behavior."
        icon={BarChart3}
        actions={canEdit ? (
          <>
            <Button type="button" size="sm" variant="secondary" icon={<Send className="h-4 w-4" />} isLoading={testing} onClick={() => void test()}>
              Test Connection
            </Button>
            <FormActions isSaving={saving} isDirty={dirty} onReset={() => initial && setSettings(initial)} />
          </>
        ) : null}
      >
        <SettingsGrid>
          <SettingsSection title="Google Analytics 4" description="Enable GA4 and configure the web data stream identity." icon={BarChart3}>
            <div className="space-y-4">
              <ToggleSwitch label="Enable Google Analytics" checked={settings.enabled} onChange={(enabled) => patch({ enabled })} disabled={!canEdit} />
              <FormGrid>
                <TextInput label="Measurement ID" value={settings.measurement_id ?? ""} onChange={(event) => patch({ measurement_id: event.target.value.toUpperCase().trim() })} placeholder="G-XXXXXXXXXX" required={settings.enabled} disabled={!canEdit} />
                <TextInput label="Measurement Protocol API Secret" type="password" value={settings.api_secret} onChange={(event) => patch({ api_secret: event.target.value })} placeholder={settings.credentials_configured ? "Configured - leave blank to keep" : "API secret"} required={settings.enabled && settings.server_side_events && !settings.credentials_configured} disabled={!canEdit} />
              </FormGrid>
            </div>
          </SettingsSection>

          <SettingsSection title="Ecommerce Tracking" description="Control ecommerce payloads, customer identity, and event delivery channels." icon={ShieldCheck}>
            <div className="grid gap-3 md:grid-cols-2">
              <ToggleSwitch label="Enhanced Ecommerce" checked={settings.enhanced_ecommerce} onChange={(enhanced_ecommerce) => patch({ enhanced_ecommerce })} disabled={!canEdit} />
              <ToggleSwitch label="User ID Tracking" checked={settings.user_id_tracking} onChange={(user_id_tracking) => patch({ user_id_tracking })} disabled={!canEdit} />
              <ToggleSwitch label="Server-side Events" checked={settings.server_side_events} onChange={(server_side_events) => patch({ server_side_events })} disabled={!canEdit} />
              <ToggleSwitch label="Client-side Events" checked={settings.client_side_events} onChange={(client_side_events) => patch({ client_side_events })} disabled={!canEdit} />
              <ToggleSwitch label="Anonymize IP" checked={settings.anonymize_ip} onChange={(anonymize_ip) => patch({ anonymize_ip })} disabled={!canEdit} />
              <ToggleSwitch label="Respect Consent Mode" checked={settings.respect_consent_mode} onChange={(respect_consent_mode) => patch({ respect_consent_mode })} disabled={!canEdit} />
              <ToggleSwitch label="Debug Mode" checked={settings.debug_mode} onChange={(debug_mode) => patch({ debug_mode })} disabled={!canEdit} />
            </div>
          </SettingsSection>

          <ConnectionPanel status={settings.connection_status} lastSuccessful={settings.last_successful_event_at} lastAttempt={settings.last_connection_attempt_at} lastError={settings.last_error} lastResponse={settings.last_response} />
        </SettingsGrid>
      </SettingsPageShell>
    </form>
  );
}
