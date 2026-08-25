"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Globe,
  Network,
  RotateCcw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ipBlockService } from "@/features/admin/ip-blocks/services/ip-block-service";
import type { SecuritySettingsPayload } from "@/features/admin/ip-blocks/types";
import {
  FormGrid,
  SettingsPageShell,
  TextareaInput,
  TextInput,
  ToggleSwitch,
} from "@/features/admin/settings/components/settings-primitives";
import { toAppError } from "@/lib/errors";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/utils/cn";

const defaults: SecuritySettingsPayload = {
  auto_blocking_enabled: true,
  enable_checkout_security: true,
  enable_cod_security: true,
  enable_payment_security: true,
  auto_block_critical_ips: false,
  max_failed_login_attempts: 5,
  max_password_reset_attempts: 5,
  max_payment_failures: 8,
  failed_cod_threshold: 3,
  time_window_minutes: 10,
  temporary_block_duration_minutes: 30,
  permanent_block_threshold: 3,
  whitelist_ips: [],
  blacklist_ips: [],
  trusted_proxies: [],
};

type ActiveTab = "protection" | "thresholds" | "ip_rules";

export function SecuritySettingsContent() {
  const canUpdate = useAuthStore(
    (state) => state.user?.permissions?.includes("can-update-ip-block") ?? false,
  );
  const [activeTab, setActiveTab] = useState<ActiveTab>("protection");
  const [values, setValues] = useState(defaults);
  const [original, setOriginal] = useState(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [whitelist, setWhitelist] = useState("");
  const [blacklist, setBlacklist] = useState("");
  const [proxies, setProxies] = useState("");

  const dirty = useMemo(
    () =>
      JSON.stringify(values) !== JSON.stringify(original) ||
      whitelist !== (original.whitelist_ips || []).join("\n") ||
      blacklist !== (original.blacklist_ips || []).join("\n") ||
      proxies !==
        (original.trusted_proxies || [])
          .map((row) => `${row.network}${row.label ? ` | ${row.label}` : ""}`)
          .join("\n"),
    [blacklist, original, proxies, values, whitelist],
  );

  useEffect(() => {
    void ipBlockService
      .securitySettings()
      .then((response) => {
        const payload = response.data;
        const currentData: SecuritySettingsPayload = {
          auto_blocking_enabled: payload.auto_blocking_enabled ?? defaults.auto_blocking_enabled,
          enable_checkout_security: payload.enable_checkout_security ?? defaults.enable_checkout_security,
          enable_cod_security: payload.enable_cod_security ?? defaults.enable_cod_security,
          enable_payment_security: payload.enable_payment_security ?? defaults.enable_payment_security,
          auto_block_critical_ips: payload.auto_block_critical_ips ?? defaults.auto_block_critical_ips,
          max_failed_login_attempts: payload.max_failed_login_attempts ?? defaults.max_failed_login_attempts,
          max_password_reset_attempts: payload.max_password_reset_attempts ?? defaults.max_password_reset_attempts,
          max_payment_failures: payload.max_payment_failures ?? defaults.max_payment_failures,
          failed_cod_threshold: payload.failed_cod_threshold ?? defaults.failed_cod_threshold,
          time_window_minutes: payload.time_window_minutes ?? defaults.time_window_minutes,
          temporary_block_duration_minutes: payload.temporary_block_duration_minutes ?? defaults.temporary_block_duration_minutes,
          permanent_block_threshold: payload.permanent_block_threshold ?? defaults.permanent_block_threshold,
          whitelist_ips: payload.whitelist_ips || [],
          blacklist_ips: payload.blacklist_ips || [],
          trusted_proxies: payload.trusted_proxies || [],
        };

        setValues(currentData);
        setOriginal(currentData);
        setWhitelist((currentData.whitelist_ips || []).join("\n"));
        setBlacklist((currentData.blacklist_ips || []).join("\n"));
        setProxies(
          (currentData.trusted_proxies || [])
            .map((row) => `${row.network}${row.label ? ` | ${row.label}` : ""}`)
            .join("\n"),
        );
      })
      .catch((error) => toast.error(toAppError(error).message))
      .finally(() => setLoading(false));
  }, []);

  function numberField(key: keyof SecuritySettingsPayload, value: string) {
    setValues((current) => ({
      ...current,
      [key]: Math.max(1, Number(value) || 1),
    }));
  }

  async function save() {
    setSaving(true);
    try {
      const payload: SecuritySettingsPayload = {
        ...values,
        whitelist_ips: whitelist
          .split(/\r?\n/)
          .map((value) => value.trim())
          .filter(Boolean),
        blacklist_ips: blacklist
          .split(/\r?\n/)
          .map((value) => value.trim())
          .filter(Boolean),
        trusted_proxies: proxies
          .split(/\r?\n/)
          .map((value) => value.trim())
          .filter(Boolean)
          .map((value) => {
            const [network, label] = value.split("|", 2).map((part) => part.trim());
            return { network, label: label || null };
          }),
      };
      const response = await ipBlockService.updateSecuritySettings(payload);
      const updatedData: SecuritySettingsPayload = {
        auto_blocking_enabled: response.data.auto_blocking_enabled ?? values.auto_blocking_enabled,
        enable_checkout_security: response.data.enable_checkout_security ?? values.enable_checkout_security,
        enable_cod_security: response.data.enable_cod_security ?? values.enable_cod_security,
        enable_payment_security: response.data.enable_payment_security ?? values.enable_payment_security,
        auto_block_critical_ips: response.data.auto_block_critical_ips ?? values.auto_block_critical_ips,
        max_failed_login_attempts: response.data.max_failed_login_attempts ?? values.max_failed_login_attempts,
        max_password_reset_attempts: response.data.max_password_reset_attempts ?? values.max_password_reset_attempts,
        max_payment_failures: response.data.max_payment_failures ?? values.max_payment_failures,
        failed_cod_threshold: response.data.failed_cod_threshold ?? values.failed_cod_threshold,
        time_window_minutes: response.data.time_window_minutes ?? values.time_window_minutes,
        temporary_block_duration_minutes: response.data.temporary_block_duration_minutes ?? values.temporary_block_duration_minutes,
        permanent_block_threshold: response.data.permanent_block_threshold ?? values.permanent_block_threshold,
        whitelist_ips: response.data.whitelist_ips || [],
        blacklist_ips: response.data.blacklist_ips || [],
        trusted_proxies: response.data.trusted_proxies || [],
      };

      setValues(updatedData);
      setOriginal(updatedData);
      setWhitelist((updatedData.whitelist_ips || []).join("\n"));
      setBlacklist((updatedData.blacklist_ips || []).join("\n"));
      setProxies(
        (updatedData.trusted_proxies || [])
          .map((row) => `${row.network}${row.label ? ` | ${row.label}` : ""}`)
          .join("\n"),
      );
      toast.success("Security settings saved successfully.");
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setSaving(false);
    }
  }

  function resetToOriginal() {
    setValues(original);
    setWhitelist((original.whitelist_ips || []).join("\n"));
    setBlacklist((original.blacklist_ips || []).join("\n"));
    setProxies(
      (original.trusted_proxies || [])
        .map((row) => `${row.network}${row.label ? ` | ${row.label}` : ""}`)
        .join("\n"),
    );
  }

  if (loading) {
    return <div className="h-96 animate-pulse rounded-lg bg-muted" />;
  }

  return (
    <SettingsPageShell
      title="Security Settings"
      description="Manage fraud prevention, login abuse protection, automatic IP blocking, and access lists."
      icon={ShieldCheck}
      actions={
        <>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={!dirty}
            icon={<RotateCcw className="h-4 w-4" />}
            onClick={resetToOriginal}
          >
            Reset
          </Button>
          {canUpdate ? (
            <Button
              type="button"
              size="sm"
              isLoading={saving}
              disabled={!dirty}
              icon={<Save className="h-4 w-4" />}
              onClick={() => void save()}
            >
              Save Changes
            </Button>
          ) : null}
        </>
      }
    >
      {/* Navigation Tabs */}
      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("protection")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors",
            activeTab === "protection"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <ShieldCheck className="h-4 w-4" />
          Protection Toggles
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("thresholds")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors",
            activeTab === "thresholds"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Security Limits
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("ip_rules")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors",
            activeTab === "ip_rules"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <Globe className="h-4 w-4" />
          IP Whitelist & Blacklist
        </button>
      </div>

      {/* Tab 1: Protection Toggles */}
      {activeTab === "protection" ? (
        <div className="space-y-4 pt-2">
          <Card className="rounded-lg p-4 sm:p-5">
            <h2 className="text-base font-bold">General Abuse Protection</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Automated safeguards against malicious bots, brute force attacks, and high-risk traffic.
            </p>

            <div className="mt-4 divide-y divide-border">
              <div className="py-3.5 first:pt-0 last:pb-0">
                <ToggleSwitch
                  label="Enable Automatic IP Blocking"
                  description="Automatically restrict client IPs temporarily when repeated abuse or intrusion thresholds are exceeded."
                  checked={values.auto_blocking_enabled}
                  onChange={(checked) =>
                    setValues((current) => ({
                      ...current,
                      auto_blocking_enabled: checked,
                    }))
                  }
                />
              </div>

              <div className="py-3.5 first:pt-0 last:pb-0">
                <ToggleSwitch
                  label="Enable Checkout Fraud Protection"
                  description="Run automated risk checks during order submission to block bot checkouts and suspicious transactions."
                  checked={values.enable_checkout_security}
                  onChange={(checked) =>
                    setValues((current) => ({
                      ...current,
                      enable_checkout_security: checked,
                    }))
                  }
                />
              </div>

              <div className="py-3.5 first:pt-0 last:pb-0">
                <ToggleSwitch
                  label="Cash on Delivery (COD) Abuse Prevention"
                  description="Track customer order failure/cancellation history and restrict COD payment if threshold is exceeded."
                  checked={values.enable_cod_security}
                  onChange={(checked) =>
                    setValues((current) => ({
                      ...current,
                      enable_cod_security: checked,
                    }))
                  }
                />
              </div>

              <div className="py-3.5 first:pt-0 last:pb-0">
                <ToggleSwitch
                  label="Payment Failure Protection"
                  description="Track repeated failed gateway attempts per IP to prevent card testing attacks."
                  checked={values.enable_payment_security}
                  onChange={(checked) =>
                    setValues((current) => ({
                      ...current,
                      enable_payment_security: checked,
                    }))
                  }
                />
              </div>

              <div className="py-3.5 first:pt-0 last:pb-0">
                <ToggleSwitch
                  label="Auto-Block Critical Risk IPs"
                  description="Instantly issue a temporary block when a checkout transaction scores critical fraud risk."
                  checked={values.auto_block_critical_ips}
                  onChange={(checked) =>
                    setValues((current) => ({
                      ...current,
                      auto_block_critical_ips: checked,
                    }))
                  }
                />
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {/* Tab 2: Security Limits & Thresholds */}
      {activeTab === "thresholds" ? (
        <div className="space-y-4 pt-2">
          <Card className="rounded-lg p-4 sm:p-5">
            <h2 className="text-base font-bold">Key Security Thresholds</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Define the sensitivity thresholds before an IP or customer is flagged or blocked.
            </p>

            <div className="mt-4">
              <FormGrid>
                <TextInput
                  type="number"
                  min={1}
                  label="Max Failed Logins"
                  helper="Consecutive failed logins allowed before blocking"
                  value={String(values.max_failed_login_attempts)}
                  onChange={(e) => numberField("max_failed_login_attempts", e.target.value)}
                />
                <TextInput
                  type="number"
                  min={1}
                  label="Max Password Reset Attempts"
                  helper="Password reset requests allowed in time window"
                  value={String(values.max_password_reset_attempts)}
                  onChange={(e) => numberField("max_password_reset_attempts", e.target.value)}
                />
                <TextInput
                  type="number"
                  min={1}
                  label="Max Payment Failures"
                  helper="Payment failures allowed per IP before temporary restriction"
                  value={String(values.max_payment_failures)}
                  onChange={(e) => numberField("max_payment_failures", e.target.value)}
                />
                <TextInput
                  type="number"
                  min={1}
                  label="Failed COD Threshold"
                  helper="Maximum cancelled/returned COD orders allowed"
                  value={String(values.failed_cod_threshold)}
                  onChange={(e) => numberField("failed_cod_threshold", e.target.value)}
                />
                <TextInput
                  type="number"
                  min={1}
                  label="Evaluation Time Window (minutes)"
                  helper="Time window over which abuse attempts are counted"
                  value={String(values.time_window_minutes)}
                  onChange={(e) => numberField("time_window_minutes", e.target.value)}
                />
                <TextInput
                  type="number"
                  min={1}
                  label="Temporary Block Duration (minutes)"
                  helper="How long an automatic block remains in effect"
                  value={String(values.temporary_block_duration_minutes)}
                  onChange={(e) => numberField("temporary_block_duration_minutes", e.target.value)}
                />
                <TextInput
                  type="number"
                  min={1}
                  label="Permanent Block Repeat Threshold"
                  helper="Number of automatic blocks before permanent block"
                  value={String(values.permanent_block_threshold)}
                  onChange={(e) => numberField("permanent_block_threshold", e.target.value)}
                />
              </FormGrid>
            </div>
          </Card>
        </div>
      ) : null}

      {/* Tab 3: IP Whitelist & Blacklist */}
      {activeTab === "ip_rules" ? (
        <div className="space-y-4 pt-2">
          <Card className="rounded-lg p-4 sm:p-5">
            <h2 className="text-base font-bold">IP Access Rules</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Add one IPv4, IPv6, or CIDR network per line. Localhost is always allowed.
            </p>

            <div className="mt-4">
              <FormGrid>
                <TextareaInput
                  label="Whitelist IPs (Always Allowed)"
                  rows={6}
                  value={whitelist}
                  onChange={(e) => setWhitelist(e.target.value)}
                  placeholder={"192.168.1.1\n203.0.113.0/24"}
                  helper="IPs that will never be blocked or rate-limited (e.g. office / admin VPN)"
                />
                <TextareaInput
                  label="Blacklist IPs (Permanently Blocked)"
                  rows={6}
                  value={blacklist}
                  onChange={(e) => setBlacklist(e.target.value)}
                  placeholder={"198.51.100.1\n2001:db8:bad::/48"}
                  helper="IPs that will always be denied access to the store"
                />
              </FormGrid>
            </div>
          </Card>

          <Card className="rounded-lg p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <Network className="h-4 w-4 text-primary" />
              <h2 className="text-base font-bold">Trusted Reverse Proxies</h2>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              If your store is behind Cloudflare, AWS CloudFront, or a reverse proxy load balancer, specify trusted IP ranges here.
            </p>

            <div className="mt-4">
              <TextareaInput
                label="Proxy Networks"
                rows={4}
                value={proxies}
                onChange={(e) => setProxies(e.target.value)}
                placeholder={"173.245.48.0/20 | Cloudflare\n10.0.0.0/8 | Internal Load Balancer"}
                helper="Format: network | label (e.g. 173.245.48.0/20 | Cloudflare)"
              />
            </div>
          </Card>
        </div>
      ) : null}
    </SettingsPageShell>
  );
}
