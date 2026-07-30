"use client";

import { useEffect, useMemo, useState } from "react";
import { Network, Save, ShieldAlert, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ipBlockService } from "@/features/admin/ip-blocks/services/ip-block-service";
import type { SecuritySettingsPayload } from "@/features/admin/ip-blocks/types";
import { FormGrid, SettingsGrid, SettingsPageShell, SettingsSection, TextareaInput, TextInput, ToggleSwitch } from "@/features/admin/settings/components/settings-primitives";
import { toAppError } from "@/lib/errors";
import { useAuthStore } from "@/store/auth-store";

const defaults: SecuritySettingsPayload = {
  auto_blocking_enabled: true,
  max_failed_login_attempts: 5,
  max_password_reset_attempts: 5,
  max_otp_attempts: 8,
  max_registration_attempts: 5,
  max_api_requests: 600,
  max_checkout_requests: 20,
  max_contact_submissions: 10,
  max_invalid_auth_attempts: 20,
  max_payment_failures: 8,
  max_not_found_requests: 40,
  max_bot_requests: 120,
  time_window_minutes: 10,
  temporary_block_duration_minutes: 30,
  permanent_block_threshold: 3,
  whitelist_ips: [],
  blacklist_ips: [],
  trusted_proxies: [],
};

const thresholds: Array<[keyof SecuritySettingsPayload, string]> = [
  ["max_failed_login_attempts", "Maximum failed login attempts"],
  ["max_password_reset_attempts", "Maximum password reset attempts"],
  ["max_otp_attempts", "Maximum OTP attempts"],
  ["max_registration_attempts", "Maximum registration attempts"],
  ["max_api_requests", "Maximum API requests"],
  ["max_checkout_requests", "Maximum checkout requests"],
  ["max_contact_submissions", "Maximum contact submissions"],
  ["max_invalid_auth_attempts", "Maximum invalid authentication attempts"],
  ["max_payment_failures", "Maximum payment failures"],
  ["max_not_found_requests", "Maximum 404 requests"],
  ["max_bot_requests", "Maximum bot requests"],
];

export function SecuritySettingsContent() {
  const canUpdate = useAuthStore((state) => state.user?.permissions?.includes("can-update-ip-block") ?? false);
  const [values, setValues] = useState(defaults);
  const [original, setOriginal] = useState(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [whitelist, setWhitelist] = useState("");
  const [blacklist, setBlacklist] = useState("");
  const [proxies, setProxies] = useState("");
  const dirty = useMemo(() => JSON.stringify(values) !== JSON.stringify(original) || whitelist !== original.whitelist_ips.join("\n") || blacklist !== original.blacklist_ips.join("\n") || proxies !== original.trusted_proxies.map((row) => `${row.network}${row.label ? ` | ${row.label}` : ""}`).join("\n"), [blacklist, original, proxies, values, whitelist]);

  useEffect(() => {
    void ipBlockService.securitySettings().then((response) => {
      const payload = response.data;
      setValues(payload); setOriginal(payload);
      setWhitelist(payload.whitelist_ips.join("\n"));
      setBlacklist(payload.blacklist_ips.join("\n"));
      setProxies(payload.trusted_proxies.map((row) => `${row.network}${row.label ? ` | ${row.label}` : ""}`).join("\n"));
    }).catch((error) => toast.error(toAppError(error).message)).finally(() => setLoading(false));
  }, []);

  function numberField(key: keyof SecuritySettingsPayload, value: string) {
    setValues((current) => ({ ...current, [key]: Math.max(1, Number(value) || 1) }));
  }

  async function save() {
    setSaving(true);
    try {
      const payload: SecuritySettingsPayload = {
        ...values,
        whitelist_ips: whitelist.split(/\r?\n/).map((value) => value.trim()).filter(Boolean),
        blacklist_ips: blacklist.split(/\r?\n/).map((value) => value.trim()).filter(Boolean),
        trusted_proxies: proxies.split(/\r?\n/).map((value) => value.trim()).filter(Boolean).map((value) => {
          const [network, label] = value.split("|", 2).map((part) => part.trim());
          return { network, label: label || null };
        }),
      };
      const response = await ipBlockService.updateSecuritySettings(payload);
      setValues(response.data); setOriginal(response.data);
      setWhitelist(response.data.whitelist_ips.join("\n")); setBlacklist(response.data.blacklist_ips.join("\n"));
      setProxies(response.data.trusted_proxies.map((row) => `${row.network}${row.label ? ` | ${row.label}` : ""}`).join("\n"));
      toast.success("Security settings saved successfully.");
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="h-96 animate-pulse rounded-lg bg-muted" />;

  return <SettingsPageShell title="Security Settings" description="Configure automatic IP blocking thresholds, access rules, and trusted reverse proxies." icon={ShieldAlert} actions={<><Button type="button" variant="secondary" size="sm" disabled={!dirty} onClick={() => { setValues(original); setWhitelist(original.whitelist_ips.join("\n")); setBlacklist(original.blacklist_ips.join("\n")); setProxies(original.trusted_proxies.map((row) => `${row.network}${row.label ? ` | ${row.label}` : ""}`).join("\n")); }}>Reset</Button>{canUpdate ? <Button type="button" size="sm" isLoading={saving} disabled={!dirty} icon={<Save className="h-4 w-4" />} onClick={() => void save()}>Save Settings</Button> : null}</>}>
    <SettingsGrid>
      <SettingsSection title="Automatic Blocking" description="Thresholds are evaluated per resolved client IP within the configured time window." icon={SlidersHorizontal}>
        <div className="space-y-4"><ToggleSwitch label="Enable Auto Blocking" description="Automatically restrict suspicious clients when a threshold is reached." checked={values.auto_blocking_enabled} onChange={(checked) => setValues((current) => ({ ...current, auto_blocking_enabled: checked }))} /><FormGrid>{thresholds.map(([key, label]) => <TextInput key={key} type="number" min={1} label={label} value={String(values[key])} onChange={(event) => numberField(key, event.target.value)} />)}<TextInput type="number" min={1} label="Time Window (minutes)" value={String(values.time_window_minutes)} onChange={(event) => numberField("time_window_minutes", event.target.value)} /><TextInput type="number" min={1} label="Temporary Block Duration (minutes)" value={String(values.temporary_block_duration_minutes)} onChange={(event) => numberField("temporary_block_duration_minutes", event.target.value)} /><TextInput type="number" min={1} label="Permanent Block Threshold" value={String(values.permanent_block_threshold)} onChange={(event) => numberField("permanent_block_threshold", event.target.value)} /></FormGrid></div>
      </SettingsSection>
      <SettingsSection title="IP Access Rules" description="One IPv4, IPv6, or CIDR network per line. Localhost is always allowed." icon={ShieldAlert}><FormGrid><TextareaInput label="Whitelist IPs" rows={8} value={whitelist} onChange={(event) => setWhitelist(event.target.value)} placeholder={"203.0.113.10\n2001:db8::/32"} /><TextareaInput label="Blacklist IPs" rows={8} value={blacklist} onChange={(event) => setBlacklist(event.target.value)} placeholder={"198.51.100.0/24\n2001:db8:bad::/48"} /></FormGrid></SettingsSection>
      <SettingsSection title="Trusted Proxies" description="Forwarded client headers are accepted only when the direct peer matches one of these networks." icon={Network}><TextareaInput label="Proxy Networks" rows={8} value={proxies} onChange={(event) => setProxies(event.target.value)} placeholder={"173.245.48.0/20 | Cloudflare\n10.0.0.0/8 | Internal load balancer"} helper="Optional labels use: network | label" /></SettingsSection>
    </SettingsGrid>
  </SettingsPageShell>;
}
