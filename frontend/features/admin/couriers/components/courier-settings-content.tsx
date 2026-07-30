"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { KeyRound, PlugZap, Truck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { courierService } from "@/features/admin/couriers/services/courier-service";
import type { CourierProviderMetadata, CourierProviderSetting } from "@/features/admin/couriers/types";
import {
  FormActions,
  FormGrid,
  ResetConfirmation,
  SelectInput,
  SettingsGrid,
  SettingsPageShell,
  SettingsSection,
  SettingsSubnav,
  TextareaInput,
  TextInput,
  ToggleSwitch,
  useUnsavedChanges,
} from "@/features/admin/settings/components/settings-primitives";
import { settingsNavItems } from "@/features/admin/settings/components/settings-navigation";
import { SettingsSectionSkeleton } from "@/components/ui/skeleton";
import { hasPermission } from "@/lib/permissions";
import { toAppError } from "@/lib/errors";
import { useAuthStore } from "@/store/auth-store";

const emptyProviders: CourierProviderSetting[] = [
  {
    id: 0,
    provider: "steadfast",
    enabled: false,
    sandbox_mode: true,
    api_base_url: "",
    api_key: "",
    api_secret: "",
    webhook_secret: "",
    default_store_id: "",
    default_parcel_type: "parcel",
    default_item_description: "Ecommerce order",
    default_delivery_type: "standard",
    default_payment_type: "cash_on_delivery",
    default_weight: 0.5,
    cod_amount_rule: "outstanding",
    custom_cod_amount: 0,
    additional_configuration: {},
    display_order: 0,
    credentials_configured: false,
    updated_at: null,
  },
  {
    id: 0,
    provider: "pathao",
    enabled: false,
    sandbox_mode: true,
    api_base_url: "",
    api_key: "",
    api_secret: "",
    webhook_secret: "",
    default_store_id: "",
    default_parcel_type: "2",
    default_item_description: "Ecommerce order",
    default_delivery_type: "48",
    default_payment_type: "cash_on_delivery",
    default_weight: 0.5,
    cod_amount_rule: "outstanding",
    custom_cod_amount: 0,
    additional_configuration: {},
    display_order: 1,
    credentials_configured: false,
    updated_at: null,
  },
];

export function CourierSettingsContent() {
  const pathname = usePathname();
  const [providers, setProviders] = React.useState<CourierProviderSetting[]>(emptyProviders);
  const [initial, setInitial] = React.useState<CourierProviderSetting[]>(emptyProviders);
  const [metadata, setMetadata] = React.useState<Record<string, CourierProviderMetadata>>({});
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState<string | null>(null);
  const [resetOpen, setResetOpen] = React.useState(false);
  useAuthStore((state) => state.user?.permissions);
  const canEdit = hasPermission("can_edit_courier_setting");
  const isDirty = JSON.stringify(providers) !== JSON.stringify(initial);
  useUnsavedChanges(isDirty);

  React.useEffect(() => {
    courierService.settings()
      .then((response) => {
        setProviders(response.data.providers);
        setInitial(response.data.providers);
        setMetadata(response.data.metadata);
      })
      .catch((error) => toast.error(toAppError(error).message))
      .finally(() => setLoading(false));
  }, []);

  function patch(index: number, key: keyof CourierProviderSetting, value: CourierProviderSetting[keyof CourierProviderSetting]) {
    setProviders((current) => current.map((provider, providerIndex) => (
      providerIndex === index ? { ...provider, [key]: value } : provider
    )));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canEdit) return;
    try {
      setSaving(true);
      const response = await courierService.updateSettings(providers);
      setProviders(response.data.providers);
      setInitial(response.data.providers);
      setMetadata(response.data.metadata);
      toast.success(response.message || "Courier settings saved successfully.");
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setSaving(false);
    }
  }

  async function test(provider: string) {
    try {
      setTesting(provider);
      const response = await courierService.testConnection(provider);
      toast.success(response.message || "Courier connection verified.");
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setTesting(null);
    }
  }

  return (
    <form onSubmit={submit}>
      <SettingsPageShell
        title="Courier Integrations"
        description="Configure secure Steadfast and Pathao connections, shipment defaults, COD rules, and webhook credentials."
        icon={Truck}
        actions={canEdit ? <FormActions isSaving={saving} isDirty={isDirty} onReset={() => setResetOpen(true)} /> : null}
      >
        <SettingsGrid>
          <SettingsSubnav items={settingsNavItems} pathname={pathname} />
          {loading ? <SettingsSectionSkeleton fields={8} /> : (
            <div className="grid gap-4 2xl:grid-cols-2">
              {providers.map((provider, index) => {
                const label = metadata[provider.provider]?.label ?? provider.provider;
                return (
                  <SettingsSection
                    key={provider.provider}
                    title={label}
                    description="Provider mode, encrypted credentials, parcel defaults, and connection validation."
                    icon={provider.provider === "pathao" ? PlugZap : Truck}
                  >
                    <div className="space-y-4">
                      <FormGrid>
                        <ToggleSwitch label="Enable Provider" checked={provider.enabled} onChange={(value) => patch(index, "enabled", value)} disabled={!canEdit} />
                        <ToggleSwitch label="Sandbox Mode" description="Use the provider sandbox endpoint when available." checked={provider.sandbox_mode} onChange={(value) => patch(index, "sandbox_mode", value)} disabled={!canEdit} />
                        <TextInput label="API Base URL" type="url" value={provider.api_base_url ?? ""} placeholder="Use provider default when empty" onChange={(event) => patch(index, "api_base_url", event.target.value)} disabled={!canEdit} />
                        <TextInput label={provider.provider === "pathao" ? "Client ID / API Key" : "API Key"} type="password" autoComplete="new-password" value={provider.api_key} onChange={(event) => patch(index, "api_key", event.target.value)} disabled={!canEdit} />
                        <TextInput label={provider.provider === "pathao" ? "Client Secret" : "Secret Key"} type="password" autoComplete="new-password" value={provider.api_secret} onChange={(event) => patch(index, "api_secret", event.target.value)} disabled={!canEdit} />
                        {metadata[provider.provider]?.capabilities.webhook ? <TextInput label="Webhook Secret" type="password" autoComplete="new-password" value={provider.webhook_secret} onChange={(event) => patch(index, "webhook_secret", event.target.value)} disabled={!canEdit} /> : null}
                        {provider.provider === "pathao" ? <TextInput label="Default Store ID" inputMode="numeric" value={provider.default_store_id ?? ""} onChange={(event) => patch(index, "default_store_id", event.target.value)} disabled={!canEdit} /> : null}
                        <TextInput label="Default Parcel Type" value={provider.default_parcel_type} onChange={(event) => patch(index, "default_parcel_type", event.target.value)} disabled={!canEdit} />
                        <TextInput label="Default Delivery Type" value={provider.default_delivery_type ?? ""} onChange={(event) => patch(index, "default_delivery_type", event.target.value)} disabled={!canEdit} />
                        <SelectInput label="Default Payment Type" value={provider.default_payment_type} options={[
                          { label: "Cash on Delivery", value: "cash_on_delivery" },
                          { label: "Prepaid", value: "prepaid" },
                          { label: "Outstanding Balance", value: "outstanding" },
                        ]} onChange={(value) => patch(index, "default_payment_type", value as CourierProviderSetting["default_payment_type"])} disabled={!canEdit} />
                        <TextInput label="Default Weight (kg)" type="number" min="0.1" max="100" step="0.1" value={provider.default_weight} onChange={(event) => patch(index, "default_weight", Number(event.target.value))} disabled={!canEdit} />
                        <SelectInput label="Default COD Amount Rule" value={provider.cod_amount_rule} options={[
                          { label: "Outstanding Order Balance", value: "outstanding" },
                          { label: "Full Order Total", value: "order_total" },
                          { label: "No COD", value: "zero" },
                          { label: "Custom Amount", value: "custom" },
                        ]} onChange={(value) => patch(index, "cod_amount_rule", value as CourierProviderSetting["cod_amount_rule"])} disabled={!canEdit} />
                        {provider.cod_amount_rule === "custom" ? <TextInput label="Custom COD Amount" type="number" min="0" step="0.01" value={provider.custom_cod_amount} onChange={(event) => patch(index, "custom_cod_amount", Number(event.target.value))} disabled={!canEdit} /> : null}
                      </FormGrid>
                      <TextareaInput label="Default Item Description" rows={3} value={provider.default_item_description ?? ""} onChange={(event) => patch(index, "default_item_description", event.target.value)} disabled={!canEdit} />
                      {canEdit ? (
                        <div className="flex justify-end border-t border-border pt-4">
                          <Button type="button" variant="secondary" size="sm" icon={<KeyRound className="h-4 w-4" />} isLoading={testing === provider.provider} onClick={() => void test(provider.provider)}>
                            Test Connection
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </SettingsSection>
                );
              })}
            </div>
          )}
        </SettingsGrid>
      </SettingsPageShell>
      <ResetConfirmation open={resetOpen} onClose={() => setResetOpen(false)} onConfirm={() => { setProviders(initial); setResetOpen(false); }} />
    </form>
  );
}
