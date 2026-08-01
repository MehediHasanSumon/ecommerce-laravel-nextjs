"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { KeyRound, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SettingsSectionSkeleton } from "@/components/ui/skeleton";
import { fraudService } from "@/features/admin/fraud/services/fraud-service";
import type {
  FraudGeneralSettings,
  FraudProviderMetadata,
  FraudProviderSetting,
} from "@/features/admin/fraud/types";
import {
  FormActions,
  FormGrid,
  ResetConfirmation,
  SelectInput,
  SettingsGrid,
  SettingsPageShell,
  SettingsSection,
  SettingsSubnav,
  StatusPill,
  TextInput,
  ToggleSwitch,
  useUnsavedChanges,
} from "@/features/admin/settings/components/settings-primitives";
import { settingsNavItems } from "@/features/admin/settings/components/settings-navigation";
import { hasPermission } from "@/lib/permissions";
import { toAppError } from "@/lib/errors";
import { useAuthStore } from "@/store/auth-store";

const providerKeys = ["fraudpeek", "fraud_bd", "fraudbd"] as const;
const providerLabels: Record<string, string> = {
  fraudpeek: "FraudPeek",
  fraud_bd: "Fraud.bd",
  fraudbd: "FraudBD",
};

const defaultSettings: FraudGeneralSettings = {
  fraud_detection_enabled: false,
  fraud_auto_check_orders: true,
  fraud_auto_check_customers: false,
  fraud_check_during_checkout: false,
  fraud_check_before_cod_confirmation: true,
  fraud_check_before_shipment: true,
  fraud_score_threshold: 60,
  fraud_critical_score_threshold: 85,
  fraud_auto_flag_suspicious_orders: true,
  fraud_auto_hold_high_risk_orders: true,
  fraud_auto_reject_critical_risk_orders: false,
  fraud_block_cod_high_risk: true,
  fraud_require_admin_approval: true,
  fraud_provider_priority: [...providerKeys],
  fraud_result_caching_enabled: true,
  fraud_cache_duration_minutes: 1440,
};

const defaultProviders: FraudProviderSetting[] = providerKeys.map((provider, index) => ({
  id: 0,
  provider,
  enabled: false,
  sandbox_mode: true,
  api_url:
    provider === "fraudbd" ? "https://fraudbd.com/api/sandbox/check-courier-info" : "",
  api_key: "",
  api_secret: "",
  additional_configuration: (provider === "fraudbd"
    ? {}
    : {
        method: "POST",
        phone_field: provider === "fraud_bd" ? "phone_number" : "phone",
        auth_header: "api_key",
      }) as Record<string, string>,
  connection_status: "not_tested",
  last_successful_connection_at: null,
  last_connection_attempt_at: null,
  last_error: null,
  circuit_open_until: null,
  display_order: index,
  credentials_configured: false,
  updated_at: null,
}));

export function FraudSettingsContent() {
  const pathname = usePathname();
  const [settings, setSettings] = React.useState(defaultSettings);
  const [providers, setProviders] = React.useState(defaultProviders);
  const [metadata, setMetadata] = React.useState<Record<string, FraudProviderMetadata>>(
    {},
  );
  const [initial, setInitial] = React.useState({
    settings: defaultSettings,
    providers: defaultProviders,
  });
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState<string | null>(null);
  const [resetOpen, setResetOpen] = React.useState(false);
  useAuthStore((state) => state.user?.permissions);
  const canEdit = hasPermission("can_edit_fraud_setting");
  const dirty = JSON.stringify({ settings, providers }) !== JSON.stringify(initial);
  useUnsavedChanges(dirty);

  React.useEffect(() => {
    fraudService
      .settings()
      .then((response) => {
        setSettings(response.data.settings);
        setProviders(response.data.providers);
        setMetadata(response.data.metadata);
        setInitial({
          settings: response.data.settings,
          providers: response.data.providers,
        });
      })
      .catch((error) => toast.error(toAppError(error).message))
      .finally(() => setLoading(false));
  }, []);

  function patchSetting<K extends keyof FraudGeneralSettings>(
    key: K,
    value: FraudGeneralSettings[K],
  ) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function patchProvider<K extends keyof FraudProviderSetting>(
    index: number,
    key: K,
    value: FraudProviderSetting[K],
  ) {
    setProviders((current) =>
      current.map((provider, providerIndex) =>
        providerIndex === index ? { ...provider, [key]: value } : provider,
      ),
    );
  }

  function patchConfig(index: number, key: string, value: string) {
    setProviders((current) =>
      current.map((provider, providerIndex) =>
        providerIndex === index
          ? {
              ...provider,
              additional_configuration: {
                ...provider.additional_configuration,
                [key]: value,
              },
            }
          : provider,
      ),
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fraudService.updateSettings(settings, providers);
      setSettings(response.data.settings);
      setProviders(response.data.providers);
      setMetadata(response.data.metadata);
      setInitial({
        settings: response.data.settings,
        providers: response.data.providers,
      });
      toast.success(response.message || "Fraud detection settings saved.");
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setSaving(false);
    }
  }

  async function test(provider: string) {
    setTesting(provider);
    try {
      const response = await fraudService.testConnection(provider);
      toast.success(response.message || "Provider connection verified.");
      const refreshed = await fraudService.settings();
      setProviders(refreshed.data.providers);
      setMetadata(refreshed.data.metadata);
      setInitial({
        settings: refreshed.data.settings,
        providers: refreshed.data.providers,
      });
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setTesting(null);
    }
  }

  return (
    <form onSubmit={submit}>
      <SettingsPageShell
        title="Fraud Detection"
        description="Configure automated risk checks, order controls, result caching, and fraud intelligence providers."
        icon={ShieldCheck}
        actions={
          canEdit ? (
            <FormActions
              isSaving={saving}
              isDirty={dirty}
              onReset={() => setResetOpen(true)}
            />
          ) : null
        }
      >
        <SettingsGrid>
          <SettingsSubnav items={settingsNavItems} pathname={pathname} />
          {loading ? (
            <SettingsSectionSkeleton fields={10} />
          ) : (
            <div className="space-y-4">
              <SettingsSection
                title="General"
                description="Automatic fraud checks and fulfillment decisions."
                icon={ShieldCheck}
              >
                <FormGrid>
                  <ToggleSwitch
                    label="Enable Fraud Detection"
                    checked={settings.fraud_detection_enabled}
                    onChange={(value) => patchSetting("fraud_detection_enabled", value)}
                    disabled={!canEdit}
                  />
                  <ToggleSwitch
                    label="Automatically Check Orders"
                    checked={settings.fraud_auto_check_orders}
                    onChange={(value) => patchSetting("fraud_auto_check_orders", value)}
                    disabled={!canEdit}
                  />
                  <ToggleSwitch
                    label="Automatically Check Customers"
                    checked={settings.fraud_auto_check_customers}
                    onChange={(value) =>
                      patchSetting("fraud_auto_check_customers", value)
                    }
                    disabled={!canEdit}
                  />
                  <ToggleSwitch
                    label="Check During Checkout"
                    checked={settings.fraud_check_during_checkout}
                    onChange={(value) =>
                      patchSetting("fraud_check_during_checkout", value)
                    }
                    disabled={!canEdit}
                  />
                  <ToggleSwitch
                    label="Check Before COD Confirmation"
                    checked={settings.fraud_check_before_cod_confirmation}
                    onChange={(value) =>
                      patchSetting("fraud_check_before_cod_confirmation", value)
                    }
                    disabled={!canEdit}
                  />
                  <ToggleSwitch
                    label="Check Before Shipment"
                    checked={settings.fraud_check_before_shipment}
                    onChange={(value) =>
                      patchSetting("fraud_check_before_shipment", value)
                    }
                    disabled={!canEdit}
                  />
                  <TextInput
                    label="Fraud Score Threshold"
                    type="number"
                    min="0"
                    max="100"
                    value={settings.fraud_score_threshold}
                    onChange={(event) =>
                      patchSetting("fraud_score_threshold", Number(event.target.value))
                    }
                    disabled={!canEdit}
                  />
                  <TextInput
                    label="Critical Score Threshold"
                    type="number"
                    min="0"
                    max="100"
                    value={settings.fraud_critical_score_threshold}
                    onChange={(event) =>
                      patchSetting(
                        "fraud_critical_score_threshold",
                        Number(event.target.value),
                      )
                    }
                    disabled={!canEdit}
                  />
                  <ToggleSwitch
                    label="Auto Flag Suspicious Orders"
                    checked={settings.fraud_auto_flag_suspicious_orders}
                    onChange={(value) =>
                      patchSetting("fraud_auto_flag_suspicious_orders", value)
                    }
                    disabled={!canEdit}
                  />
                  <ToggleSwitch
                    label="Auto Hold High Risk Orders"
                    checked={settings.fraud_auto_hold_high_risk_orders}
                    onChange={(value) =>
                      patchSetting("fraud_auto_hold_high_risk_orders", value)
                    }
                    disabled={!canEdit}
                  />
                  <ToggleSwitch
                    label="Auto Reject Critical Risk Orders"
                    checked={settings.fraud_auto_reject_critical_risk_orders}
                    onChange={(value) =>
                      patchSetting("fraud_auto_reject_critical_risk_orders", value)
                    }
                    disabled={!canEdit}
                  />
                  <ToggleSwitch
                    label="Block COD for High Risk"
                    checked={settings.fraud_block_cod_high_risk}
                    onChange={(value) => patchSetting("fraud_block_cod_high_risk", value)}
                    disabled={!canEdit}
                  />
                  <ToggleSwitch
                    label="Require Admin Approval"
                    checked={settings.fraud_require_admin_approval}
                    onChange={(value) =>
                      patchSetting("fraud_require_admin_approval", value)
                    }
                    disabled={!canEdit}
                  />
                  <ToggleSwitch
                    label="Enable Result Caching"
                    checked={settings.fraud_result_caching_enabled}
                    onChange={(value) =>
                      patchSetting("fraud_result_caching_enabled", value)
                    }
                    disabled={!canEdit}
                  />
                  <TextInput
                    label="Cache Duration (Minutes)"
                    type="number"
                    min="1"
                    max="43200"
                    value={settings.fraud_cache_duration_minutes}
                    onChange={(event) =>
                      patchSetting(
                        "fraud_cache_duration_minutes",
                        Number(event.target.value),
                      )
                    }
                    disabled={!canEdit || !settings.fraud_result_caching_enabled}
                  />
                </FormGrid>
              </SettingsSection>

              <SettingsSection
                title="Provider Priority"
                description="Choose the order used when multiple providers are enabled."
                icon={SlidersHorizontal}
              >
                <FormGrid>
                  {[0, 1, 2].map((slot) => (
                    <SelectInput
                      key={slot}
                      label={`Priority ${slot + 1}`}
                      value={settings.fraud_provider_priority[slot]}
                      options={providerKeys.map((provider) => ({
                        value: provider,
                        label: providerLabels[provider],
                      }))}
                      onChange={(value) => {
                        const next = [...settings.fraud_provider_priority];
                        const otherIndex = next.indexOf(value);
                        [next[slot], next[otherIndex]] = [next[otherIndex], next[slot]];
                        patchSetting("fraud_provider_priority", next);
                      }}
                      disabled={!canEdit}
                    />
                  ))}
                </FormGrid>
              </SettingsSection>

              <div className="grid gap-4 2xl:grid-cols-2">
                {providers.map((provider, index) => {
                  const privateContract =
                    metadata[provider.provider]?.capabilities.public_contract === false;
                  return (
                    <SettingsSection
                      key={provider.provider}
                      title={
                        metadata[provider.provider]?.label ??
                        providerLabels[provider.provider]
                      }
                      description={
                        privateContract
                          ? "Private merchant API contract and encrypted credentials."
                          : "Official public API contract and encrypted credentials."
                      }
                      icon={KeyRound}
                    >
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <StatusPill
                            ok={provider.connection_status === "connected"}
                            label={provider.connection_status.replaceAll("_", " ")}
                          />
                          <span className="text-xs text-muted-foreground">
                            Last successful:{" "}
                            {provider.last_successful_connection_at
                              ? new Date(
                                  provider.last_successful_connection_at,
                                ).toLocaleString()
                              : "Never"}
                          </span>
                        </div>
                        {provider.last_error ? (
                          <p className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                            {provider.last_error}
                          </p>
                        ) : null}
                        <FormGrid>
                          <ToggleSwitch
                            label="Enable Provider"
                            checked={provider.enabled}
                            onChange={(value) => patchProvider(index, "enabled", value)}
                            disabled={!canEdit}
                          />
                          <ToggleSwitch
                            label="Sandbox Mode"
                            checked={provider.sandbox_mode}
                            onChange={(value) =>
                              patchProvider(index, "sandbox_mode", value)
                            }
                            disabled={!canEdit}
                          />
                          <TextInput
                            label="API URL"
                            type="url"
                            value={provider.api_url ?? ""}
                            onChange={(event) =>
                              patchProvider(index, "api_url", event.target.value)
                            }
                            disabled={!canEdit}
                          />
                          <TextInput
                            label="API Key"
                            type="password"
                            autoComplete="new-password"
                            value={provider.api_key}
                            onChange={(event) =>
                              patchProvider(index, "api_key", event.target.value)
                            }
                            disabled={!canEdit}
                          />
                          <TextInput
                            label="API Secret / Token"
                            type="password"
                            autoComplete="new-password"
                            value={provider.api_secret}
                            onChange={(event) =>
                              patchProvider(index, "api_secret", event.target.value)
                            }
                            disabled={!canEdit}
                          />
                          {privateContract ? (
                            <>
                              <SelectInput
                                label="HTTP Method"
                                value={provider.additional_configuration.method || "POST"}
                                options={[
                                  { label: "POST", value: "POST" },
                                  { label: "GET", value: "GET" },
                                ]}
                                onChange={(value) => patchConfig(index, "method", value)}
                                disabled={!canEdit}
                              />
                              <TextInput
                                label="Phone Field"
                                value={
                                  provider.additional_configuration.phone_field || "phone"
                                }
                                onChange={(event) =>
                                  patchConfig(index, "phone_field", event.target.value)
                                }
                                disabled={!canEdit}
                              />
                              <TextInput
                                label="Authentication Header"
                                value={
                                  provider.additional_configuration.auth_header ||
                                  "api_key"
                                }
                                onChange={(event) =>
                                  patchConfig(index, "auth_header", event.target.value)
                                }
                                disabled={!canEdit}
                              />
                              <TextInput
                                label="Risk Score Path"
                                value={provider.additional_configuration.score_path || ""}
                                placeholder="data.risk_score"
                                onChange={(event) =>
                                  patchConfig(index, "score_path", event.target.value)
                                }
                                disabled={!canEdit}
                              />
                              <TextInput
                                label="Risk Level Path"
                                value={
                                  provider.additional_configuration.risk_level_path || ""
                                }
                                placeholder="data.risk_level"
                                onChange={(event) =>
                                  patchConfig(
                                    index,
                                    "risk_level_path",
                                    event.target.value,
                                  )
                                }
                                disabled={!canEdit}
                              />
                              <TextInput
                                label="Reasons Path"
                                value={
                                  provider.additional_configuration.reasons_path || ""
                                }
                                placeholder="data.reasons"
                                onChange={(event) =>
                                  patchConfig(index, "reasons_path", event.target.value)
                                }
                                disabled={!canEdit}
                              />
                            </>
                          ) : null}
                        </FormGrid>
                        {canEdit ? (
                          <div className="flex justify-end border-t border-border pt-4">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              icon={<KeyRound className="h-4 w-4" />}
                              isLoading={testing === provider.provider}
                              onClick={() => void test(provider.provider)}
                            >
                              Test Connection
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </SettingsSection>
                  );
                })}
              </div>
            </div>
          )}
        </SettingsGrid>
      </SettingsPageShell>
      <ResetConfirmation
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={() => {
          setSettings(initial.settings);
          setProviders(initial.providers);
          setResetOpen(false);
        }}
      />
    </form>
  );
}
