"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  KeyRound,
  ListChecks,
  MessageSquareText,
  Send,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { routePaths } from "@/constants/routes";
import {
  FormActions,
  FormGrid,
  LoadingInline,
  SettingsPageShell,
  TextareaInput,
  TextInput,
  ToggleSwitch,
  useUnsavedChanges,
} from "@/features/admin/settings/components/settings-primitives";
import { smsAdminService } from "@/features/admin/sms/services/sms-service";
import type { SmsSettings, SmsSettingsPayload, SmsTemplate } from "@/features/admin/sms/types";
import { toAppError } from "@/lib/errors";
import { hasPermission } from "@/lib/permissions";
import { useSettingsStore } from "@/store/settings-store";
import { cn } from "@/utils/cn";

const emptySettings: SmsSettings = {
  enabled: false,
  provider: "generic_http",
  api_base_url: "",
  api_key: "",
  api_secret: "",
  api_key_configured: false,
  api_secret_configured: false,
  sender_id: "",
  default_country_code: "880",
  test_number: "",
  require_guest_checkout_otp: false,
  require_registered_checkout_otp: false,
  otp_length: 6,
  otp_expiration_minutes: 5,
  order_confirmation_enabled: true,
  order_status_events: {},
};

function clonePayload(payload: SmsSettingsPayload): SmsSettingsPayload {
  return {
    settings: {
      ...payload.settings,
      api_key: "",
      api_secret: "",
      order_status_events: { ...payload.settings.order_status_events },
    },
    templates: payload.templates.map((template) => ({ ...template })),
    providers: payload.providers.map((provider) => ({ ...provider })),
    placeholders: [...payload.placeholders],
  };
}

function label(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

type ActiveTab = "gateway" | "otp" | "templates";

export function SmsSettingsContent() {
  const canEdit = hasPermission("can_edit_sms_setting");
  const refreshRuntime = useSettingsStore((state) => state.refreshSettings);
  const [activeTab, setActiveTab] = useState<ActiveTab>("gateway");
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
  const isDirty = useMemo(
    () => Boolean(initial) && JSON.stringify(payload) !== JSON.stringify(initial),
    [initial, payload],
  );
  useUnsavedChanges(isDirty);

  useEffect(() => {
    let active = true;
    smsAdminService
      .settings()
      .then((response) => {
        if (!active) return;
        const next = clonePayload(response.data);
        setPayload(next);
        setInitial(clonePayload(response.data));
      })
      .catch((error) => toast.error(toAppError(error).message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  function updateSettings(patch: Partial<SmsSettings>) {
    setPayload((current) => ({
      ...current,
      settings: { ...current.settings, ...patch },
    }));
  }

  function updateTemplate(event: string, patch: Partial<SmsTemplate>) {
    setPayload((current) => ({
      ...current,
      templates: current.templates.map((template) =>
        template.event === event ? { ...template, ...patch } : template,
      ),
    }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    try {
      const response = await smsAdminService.update({
        ...payload.settings,
        templates: payload.templates,
      });
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
      toast.error("Enter a test phone number first.");
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
    return (
      <div className="py-16">
        <LoadingInline label="Loading SMS settings..." />
      </div>
    );
  }

  const settings = payload.settings;

  return (
    <form onSubmit={save}>
      <SettingsPageShell
        title="SMS Settings"
        description="Configure your SMS gateway, checkout mobile OTP verification, and notification templates."
        icon={MessageSquareText}
        actions={
          <>
            <Link href={routePaths.adminSettingsSmsLogs}>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                icon={<ListChecks className="h-4 w-4" />}
              >
                SMS Logs
              </Button>
            </Link>
            {canEdit ? (
              <FormActions
                isSaving={saving}
                isDirty={isDirty}
                onReset={() => initial && setPayload(clonePayload(initial))}
              />
            ) : null}
          </>
        }
      >
        {/* Navigation Tabs */}
        <div className="flex border-b border-border">
          <button
            type="button"
            onClick={() => setActiveTab("gateway")}
            className={cn(
              "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors",
              activeTab === "gateway"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <KeyRound className="h-4 w-4" />
            SMS Gateway & API
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("otp")}
            className={cn(
              "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors",
              activeTab === "otp"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <ShieldCheck className="h-4 w-4" />
            OTP Verification
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("templates")}
            className={cn(
              "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors",
              activeTab === "templates"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <MessageSquareText className="h-4 w-4" />
            Notifications & Templates
          </button>
        </div>

        {/* Tab 1: SMS Gateway */}
        {activeTab === "gateway" ? (
          <div className="space-y-4 pt-2">
            <Card className="rounded-lg p-4 sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold">SMS Service Status</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Master switch for all outgoing OTP and notification SMS.
                  </p>
                </div>
              </div>

              <div className="mt-4 border-t border-border pt-4">
                <ToggleSwitch
                  label="Enable SMS Gateway"
                  description="When enabled, OTP codes and order notifications will be sent to customers via SMS."
                  checked={settings.enabled}
                  onChange={(enabled) => updateSettings({ enabled })}
                />
              </div>
            </Card>

            <Card className="rounded-lg p-4 sm:p-5">
              <h2 className="text-base font-bold">Gateway Credentials</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Enter your SMS provider API endpoint URL and authentication keys.
              </p>

              <div className="mt-4 space-y-4">
                <FormGrid>
                  <TextInput
                    label="API Base URL"
                    type="url"
                    value={settings.api_base_url ?? ""}
                    onChange={(e) => updateSettings({ api_base_url: e.target.value })}
                    required={settings.enabled}
                    placeholder="https://api.provider.com/v1/sms/send"
                    helper="The HTTP endpoint URL provided by your SMS provider"
                  />
                  <TextInput
                    label="API Key / Token"
                    type="password"
                    value={settings.api_key ?? ""}
                    onChange={(e) => updateSettings({ api_key: e.target.value })}
                    placeholder={
                      settings.api_key_configured
                        ? "Configured (leave blank to keep)"
                        : "Enter API Key"
                    }
                  />
                  <TextInput
                    label="API Secret (Optional)"
                    type="password"
                    value={settings.api_secret ?? ""}
                    onChange={(e) => updateSettings({ api_secret: e.target.value })}
                    placeholder={
                      settings.api_secret_configured
                        ? "Configured (leave blank to keep)"
                        : "Enter API Secret (if required)"
                    }
                  />
                  <TextInput
                    label="Sender ID / Masking"
                    value={settings.sender_id ?? ""}
                    onChange={(e) => updateSettings({ sender_id: e.target.value })}
                    placeholder="MYSTORE"
                    helper="Approved sender ID or masking brand name"
                  />
                  <TextInput
                    label="Default Country Code"
                    inputMode="numeric"
                    value={settings.default_country_code}
                    onChange={(e) =>
                      updateSettings({
                        default_country_code: e.target.value.replace(/\D/g, ""),
                      })
                    }
                    placeholder="880"
                    helper="Country prefix for normalizing local numbers (e.g. 880 for BD)"
                  />
                </FormGrid>

                {/* Test Connection Box */}
                <div className="rounded-lg border border-border bg-muted/40 p-4">
                  <h3 className="text-sm font-bold">Send Test SMS</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Verify that your gateway credentials and sender ID are working properly.
                  </p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <TextInput
                      label=""
                      placeholder="01700000000"
                      value={settings.test_number ?? ""}
                      onChange={(e) => updateSettings({ test_number: e.target.value })}
                      className="max-w-xs"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      isLoading={testing}
                      icon={<Send className="h-4 w-4" />}
                      onClick={() => void testProvider()}
                    >
                      Send Test SMS
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        ) : null}

        {/* Tab 2: OTP Verification */}
        {activeTab === "otp" ? (
          <div className="space-y-4 pt-2">
            <Card className="rounded-lg p-4 sm:p-5">
              <h2 className="text-base font-bold">Checkout Mobile Verification</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Require customers to verify their phone number via SMS OTP before placing an order.
              </p>

              <div className="mt-4 divide-y divide-border">
                <div className="py-3.5 first:pt-0 last:pb-0">
                  <ToggleSwitch
                    label="Require OTP for Guest Checkout"
                    description="Guest shoppers must verify their mobile phone with a code before completing checkout."
                    checked={settings.require_guest_checkout_otp}
                    onChange={(checked) =>
                      updateSettings({ require_guest_checkout_otp: checked })
                    }
                  />
                </div>
                <div className="py-3.5 first:pt-0 last:pb-0">
                  <ToggleSwitch
                    label="Require OTP for Registered Customers"
                    description="Logged-in users must also verify their mobile phone number during checkout."
                    checked={settings.require_registered_checkout_otp}
                    onChange={(checked) =>
                      updateSettings({ require_registered_checkout_otp: checked })
                    }
                  />
                </div>
              </div>
            </Card>

            <Card className="rounded-lg p-4 sm:p-5">
              <h2 className="text-base font-bold">OTP Settings</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Customize OTP length and validity duration.
              </p>

              <div className="mt-4">
                <FormGrid>
                  <TextInput
                    label="OTP Code Length"
                    type="number"
                    min={4}
                    max={8}
                    value={settings.otp_length}
                    onChange={(e) => updateSettings({ otp_length: Number(e.target.value) })}
                    helper="Standard is 6 digits (e.g. 123456)"
                  />
                  <TextInput
                    label="OTP Expiry Time (minutes)"
                    type="number"
                    min={1}
                    max={30}
                    value={settings.otp_expiration_minutes}
                    onChange={(e) =>
                      updateSettings({
                        otp_expiration_minutes: Number(e.target.value),
                      })
                    }
                    helper="Time before the verification code expires (e.g. 5 min)"
                  />
                </FormGrid>
              </div>
            </Card>
          </div>
        ) : null}

        {/* Tab 3: Notifications & Templates */}
        {activeTab === "templates" ? (
          <div className="space-y-4 pt-2">
            <Card className="rounded-lg p-4 sm:p-5">
              <h2 className="text-base font-bold">Order Notification Events</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Select which order lifecycle events automatically send an SMS alert to the customer.
              </p>

              <div className="mt-4 space-y-4">
                <ToggleSwitch
                  label="Order Confirmation SMS"
                  description="Send an instant SMS to the customer immediately when their order is placed."
                  checked={settings.order_confirmation_enabled}
                  onChange={(checked) =>
                    updateSettings({ order_confirmation_enabled: checked })
                  }
                />

                <div className="border-t border-border pt-4">
                  <h3 className="mb-2 text-sm font-bold">Order Status Update SMS</h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(settings.order_status_events).map(
                      ([event, enabled]) => (
                        <div
                          key={event}
                          className="flex items-center justify-between rounded-lg border border-border p-3"
                        >
                          <span className="text-sm font-medium">{label(event)}</span>
                          <ToggleSwitch
                            label=""
                            checked={enabled}
                            onChange={(checked) =>
                              updateSettings({
                                order_status_events: {
                                  ...settings.order_status_events,
                                  [event]: checked,
                                },
                              })
                            }
                          />
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="rounded-lg p-4 sm:p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-bold">SMS Message Templates</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Customize message texts. You can insert dynamic variables anywhere in the text.
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-muted/30 p-2.5">
                <span className="text-xs font-semibold text-muted-foreground">
                  Supported Placeholders:
                </span>
                {payload.placeholders.map((placeholder) => (
                  <code
                    key={placeholder}
                    className="rounded bg-background px-2 py-0.5 text-xs font-semibold text-primary shadow-sm"
                  >
                    {`{${placeholder}}`}
                  </code>
                ))}
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {payload.templates.map((template) => (
                  <div
                    key={template.event}
                    className="flex flex-col justify-between rounded-lg border border-border p-3.5"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold">{template.name}</h3>
                      <ToggleSwitch
                        label=""
                        checked={template.enabled}
                        onChange={(enabled) =>
                          updateTemplate(template.event, { enabled })
                        }
                      />
                    </div>
                    <div className="mt-3">
                      <TextareaInput
                        label=""
                        rows={3}
                        value={template.body}
                        onChange={(e) =>
                          updateTemplate(template.event, { body: e.target.value })
                        }
                      />
                      <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                        <span>{template.body.length} characters</span>
                        <span>
                          ~{Math.ceil(template.body.length / 160) || 1} SMS part(s)
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        ) : null}
      </SettingsPageShell>
    </form>
  );
}
