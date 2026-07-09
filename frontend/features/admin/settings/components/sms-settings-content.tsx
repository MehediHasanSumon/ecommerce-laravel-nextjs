"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { MessageSquareText, Send, ServerCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsGrid, SettingsPageShell, SettingsSection, SettingsSubnav, FormGrid, TextInput, SelectInput, ToggleSwitch, ResetConfirmation, FormActions, StatusPill, saveWithToast, testWithToast, useUnsavedChanges } from "@/features/admin/settings/components/settings-primitives";
import { settingsNavItems } from "@/features/admin/settings/components/settings-navigation";

type ProviderKey = "twilio" | "vonage" | "ssl_wireless" | "bulksmsbd" | "custom";
type ProviderConfig = {
  api_key: string;
  api_secret: string;
  sender_id: string;
  base_url: string;
  enabled: boolean;
};

const providerLabels: Record<ProviderKey, string> = {
  twilio: "Twilio",
  vonage: "Vonage (Nexmo)",
  ssl_wireless: "SSL Wireless",
  bulksmsbd: "BulkSMSBD",
  custom: "Custom API",
};

const defaults: { default_provider: ProviderKey; providers: Record<ProviderKey, ProviderConfig> } = {
  default_provider: "ssl_wireless",
  providers: {
    twilio: { api_key: "", api_secret: "", sender_id: "", base_url: "https://api.twilio.com", enabled: false },
    vonage: { api_key: "", api_secret: "", sender_id: "", base_url: "https://rest.nexmo.com", enabled: false },
    ssl_wireless: { api_key: "", api_secret: "", sender_id: "", base_url: "https://sms.sslwireless.com", enabled: true },
    bulksmsbd: { api_key: "", api_secret: "", sender_id: "", base_url: "https://bulksmsbd.net/api", enabled: false },
    custom: { api_key: "", api_secret: "", sender_id: "", base_url: "", enabled: false },
  },
};

export function SmsSettingsContent() {
  const pathname = usePathname();
  const [values, setValues] = React.useState(defaults);
  const [initial, setInitial] = React.useState(defaults);
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState<ProviderKey | null>(null);
  const [resetOpen, setResetOpen] = React.useState(false);
  const isDirty = JSON.stringify(values) !== JSON.stringify(initial);
  useUnsavedChanges(isDirty);

  function updateProvider(provider: ProviderKey, patch: Partial<ProviderConfig>) {
    setValues((current) => ({
      ...current,
      providers: {
        ...current.providers,
        [provider]: { ...current.providers[provider], ...patch },
      },
    }));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    saveWithToast(setSaving, () => setInitial(values));
  }

  return (
    <form onSubmit={submit}>
      <SettingsPageShell
        title="SMS Provider"
        description="Configure transactional SMS providers, active routing, provider credentials, sender identity, and test delivery."
        icon={MessageSquareText}
        actions={<FormActions isSaving={saving} isDirty={isDirty} onReset={() => setResetOpen(true)} />}
      >
        <SettingsGrid>
          <SettingsSubnav items={settingsNavItems} pathname={pathname} />
          <div className="space-y-5">
            <SettingsSection title="Default Provider" description="Choose which enabled provider should send production SMS messages." icon={ServerCog}>
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div className="w-full max-w-md">
                  <SelectInput label="Default Provider" value={values.default_provider} options={(Object.keys(providerLabels) as ProviderKey[]).map((key) => ({ label: providerLabels[key], value: key }))} onChange={(value) => setValues((current) => ({ ...current, default_provider: value as ProviderKey }))} />
                </div>
                <StatusPill ok={values.providers[values.default_provider].enabled} label={values.providers[values.default_provider].enabled ? "Active provider enabled" : "Active provider disabled"} />
              </div>
            </SettingsSection>

            <div className="grid gap-5 xl:grid-cols-2">
              {(Object.keys(providerLabels) as ProviderKey[]).map((provider) => {
                const config = values.providers[provider];
                const active = values.default_provider === provider;
                return (
                  <SettingsSection key={provider} title={providerLabels[provider]} description="Provider credentials, sender identity, endpoint, and status." icon={MessageSquareText}>
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <StatusPill ok={active} label={active ? "Active Provider" : "Standby"} />
                      <ToggleSwitch label="Enable" checked={config.enabled} onChange={(checked) => updateProvider(provider, { enabled: checked })} />
                    </div>
                    <FormGrid>
                      <TextInput label="API Key" value={config.api_key} onChange={(event) => updateProvider(provider, { api_key: event.target.value })} />
                      <TextInput label="API Secret" type="password" value={config.api_secret} onChange={(event) => updateProvider(provider, { api_secret: event.target.value })} />
                      <TextInput label="Sender ID" value={config.sender_id} onChange={(event) => updateProvider(provider, { sender_id: event.target.value })} />
                      <TextInput label="Base URL" value={config.base_url} onChange={(event) => updateProvider(provider, { base_url: event.target.value })} />
                    </FormGrid>
                    <div className="mt-4 flex justify-end">
                      <Button type="button" variant="secondary" size="sm" icon={<Send className="h-4 w-4" />} isLoading={testing === provider} onClick={() => { setTesting(provider); testWithToast((state) => setTesting(state ? provider : null), `${providerLabels[provider]} test SMS sent.`); }}>Test SMS</Button>
                    </div>
                  </SettingsSection>
                );
              })}
            </div>
          </div>
        </SettingsGrid>
      </SettingsPageShell>
      <ResetConfirmation open={resetOpen} onClose={() => setResetOpen(false)} onConfirm={() => { setValues(defaults); setResetOpen(false); }} />
    </form>
  );
}
