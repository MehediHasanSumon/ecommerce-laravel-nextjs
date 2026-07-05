"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Eye, EyeOff, Mail, PlugZap, Send, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsGrid, SettingsPageShell, SettingsSection, SettingsSubnav, FormGrid, TextInput, SelectInput, ToggleSwitch, ResetConfirmation, FormActions, StatusPill, saveWithToast, testWithToast, useUnsavedChanges } from "@/features/admin/settings/components/settings-primitives";
import { settingsNavItems } from "@/features/admin/settings/components/settings-navigation";

type SmtpSettings = {
  driver: string;
  host: string;
  port: string;
  username: string;
  password: string;
  encryption: string;
  from_name: string;
  from_email: string;
  reply_to_email: string;
  enabled: boolean;
};

const defaults: SmtpSettings = {
  driver: "smtp",
  host: "smtp.mailtrap.io",
  port: "587",
  username: "luxecart-smtp-user",
  password: "secret-password",
  encryption: "tls",
  from_name: "LuxeCart",
  from_email: "no-reply@luxecart.test",
  reply_to_email: "support@luxecart.test",
  enabled: true,
};

export function EmailSettingsContent() {
  const pathname = usePathname();
  const [values, setValues] = React.useState(defaults);
  const [initial, setInitial] = React.useState(defaults);
  const [showPassword, setShowPassword] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [resetOpen, setResetOpen] = React.useState(false);
  const isDirty = JSON.stringify(values) !== JSON.stringify(initial);
  const connected = values.enabled && Boolean(values.host && values.port && values.from_email);

  useUnsavedChanges(isDirty);

  function update<K extends keyof SmtpSettings>(key: K, value: SmtpSettings[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    saveWithToast(setSaving, () => setInitial(values));
  }

  return (
    <form onSubmit={submit}>
      <SettingsPageShell
        title="Email (SMTP)"
        description="Configure outbound email delivery, sender identity, encryption, reply-to behavior, and connection testing."
        icon={Mail}
        actions={<FormActions isSaving={saving} isDirty={isDirty} onReset={() => setResetOpen(true)} />}
      >
        <SettingsGrid>
          <SettingsSubnav items={settingsNavItems} pathname={pathname} />
          <div className="space-y-5">
            <SettingsSection title="Connection Status" description="Monitor whether the current SMTP configuration has the required connection fields." icon={PlugZap}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <StatusPill ok={connected} label={connected ? "Ready to send" : "Missing configuration"} />
                  <p className="mt-2 text-sm text-muted-foreground">A real backend test endpoint can use these values to send a verification email.</p>
                </div>
                <Button type="button" variant="secondary" icon={<Send className="h-4 w-4" />} isLoading={testing} onClick={() => testWithToast(setTesting, "Test email queued successfully.")}>Send Test Email</Button>
              </div>
            </SettingsSection>

            <SettingsSection title="SMTP Configuration" description="Mail driver, host, port, credentials, and transport encryption." icon={ShieldCheck}>
              <div className="grid gap-3 md:grid-cols-2">
                <ToggleSwitch label="Enable Email Delivery" checked={values.enabled} onChange={(checked) => update("enabled", checked)} />
              </div>
              <div className="mt-4">
                <FormGrid>
                  <SelectInput label="Mail Driver" value={values.driver} options={[{ label: "SMTP", value: "smtp" }, { label: "Sendmail", value: "sendmail" }, { label: "Log", value: "log" }]} onChange={(value) => update("driver", value)} />
                  <TextInput label="Mail Host" required value={values.host} onChange={(event) => update("host", event.target.value)} />
                  <TextInput label="SMTP Port" required value={values.port} onChange={(event) => update("port", event.target.value)} />
                  <SelectInput label="Encryption" value={values.encryption} options={[{ label: "TLS", value: "tls" }, { label: "SSL", value: "ssl" }, { label: "None", value: "none" }]} onChange={(value) => update("encryption", value)} />
                  <TextInput label="Username" value={values.username} onChange={(event) => update("username", event.target.value)} />
                  <div className="relative">
                    <TextInput label="Password" type={showPassword ? "text" : "password"} value={values.password} onChange={(event) => update("password", event.target.value)} />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-7 h-9 w-9" aria-label={showPassword ? "Hide password" : "Show password"} icon={showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} onClick={() => setShowPassword((value) => !value)} />
                  </div>
                </FormGrid>
              </div>
            </SettingsSection>

            <SettingsSection title="Sender Identity" description="Default sender and reply-to information shown to customers." icon={Mail}>
              <FormGrid>
                <TextInput label="From Name" required value={values.from_name} onChange={(event) => update("from_name", event.target.value)} />
                <TextInput label="From Email" required value={values.from_email} onChange={(event) => update("from_email", event.target.value)} />
                <TextInput label="Reply-To Email" value={values.reply_to_email} onChange={(event) => update("reply_to_email", event.target.value)} />
              </FormGrid>
            </SettingsSection>
          </div>
        </SettingsGrid>
      </SettingsPageShell>
      <ResetConfirmation open={resetOpen} onClose={() => setResetOpen(false)} onConfirm={() => { setValues(defaults); setResetOpen(false); }} />
    </form>
  );
}
