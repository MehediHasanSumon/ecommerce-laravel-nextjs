"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { fraudService } from "@/features/admin/fraud/services/fraud-service";
import type { FraudCheck, FraudRiskLevel } from "@/features/admin/fraud/types";
import { toAppError } from "@/lib/errors";
import { cn } from "@/utils/cn";

export type FraudCheckInitialInput = {
  order_id?: string;
  customer_id?: string;
  phone?: string | null;
  name?: string | null;
  email?: string | null;
  ip_address?: string | null;
  billing_address?: string | null;
  shipping_address?: string | null;
};

export function FraudCheckModal({
  open,
  onClose,
  initial,
  existing,
  onCompleted,
}: {
  open: boolean;
  onClose: () => void;
  initial?: FraudCheckInitialInput;
  existing?: FraudCheck | null;
  onCompleted?: (check: FraudCheck) => void;
}) {
  const [form, setForm] = React.useState({
    order_id: "",
    customer_id: "",
    phone: "",
    name: "",
    email: "",
    ip_address: "",
    nid: "",
    billing_address: "",
    shipping_address: "",
  });
  const [result, setResult] = React.useState<FraudCheck | null>(existing ?? null);
  const [checking, setChecking] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setForm({
      order_id: initial?.order_id ?? "",
      customer_id: initial?.customer_id ?? "",
      phone: initial?.phone ?? "",
      name: initial?.name ?? "",
      email: initial?.email ?? "",
      ip_address: initial?.ip_address ?? "",
      nid: "",
      billing_address: initial?.billing_address ?? "",
      shipping_address: initial?.shipping_address ?? "",
    });
    setResult(existing ?? null);
  }, [existing, initial, open]);

  React.useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const keydown = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", keydown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", keydown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, open]);

  if (!open) return null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setChecking(true);
    try {
      const response = await fraudService.check({
        order_id: form.order_id || undefined,
        customer_id: form.customer_id || undefined,
        phone: form.phone || undefined,
        name: form.name || undefined,
        email: form.email || undefined,
        ip_address: form.ip_address || undefined,
        nid: form.nid || undefined,
        billing_address: form.billing_address
          ? { address_line: form.billing_address }
          : undefined,
        shipping_address: form.shipping_address
          ? { address_line: form.shipping_address }
          : undefined,
        bypass_cache: Boolean(result),
      });
      setResult(response.data.check);
      onCompleted?.(response.data.check);
      toast.success(response.message || "Fraud check completed.");
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label="Close fraud check"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="fraud-check-title"
        className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-lg border border-border bg-background p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h2 id="fraud-check-title" className="text-lg font-bold">
                Fraud Check
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Check the available customer and order signals across enabled providers.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            icon={<X className="h-4 w-4" />}
            aria-label="Close fraud check"
            onClick={onClose}
          />
        </div>

        <form onSubmit={submit} className="mt-5 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field
              label="Order ID"
              value={form.order_id}
              onChange={(value) => setForm({ ...form, order_id: value })}
            />
            <Field
              label="Customer ID"
              value={form.customer_id}
              onChange={(value) => setForm({ ...form, customer_id: value })}
            />
            <Field
              label="Phone Number"
              value={form.phone}
              required={!form.order_id && !form.customer_id}
              onChange={(value) => setForm({ ...form, phone: value })}
            />
            <Field
              label="Customer Name"
              value={form.name}
              onChange={(value) => setForm({ ...form, name: value })}
            />
            <Field
              label="Email"
              type="email"
              value={form.email}
              onChange={(value) => setForm({ ...form, email: value })}
            />
            <Field
              label="IP Address"
              value={form.ip_address}
              onChange={(value) => setForm({ ...form, ip_address: value })}
            />
            <Field
              label="NID"
              value={form.nid}
              onChange={(value) => setForm({ ...form, nid: value })}
            />
            <Field
              label="Billing Address"
              value={form.billing_address}
              onChange={(value) => setForm({ ...form, billing_address: value })}
            />
            <Field
              label="Shipping Address"
              value={form.shipping_address}
              onChange={(value) => setForm({ ...form, shipping_address: value })}
            />
          </div>
          <div className="flex justify-end border-t border-border pt-4">
            <Button
              type="submit"
              size="sm"
              isLoading={checking}
              icon={<RefreshCw className="h-4 w-4" />}
            >
              {result ? "Check Again" : "Run Fraud Check"}
            </Button>
          </div>
        </form>

        {result ? <FraudResult check={result} /> : null}
      </div>
    </div>
  );
}

export function FraudRiskBadge({
  level,
  score,
}: {
  level: FraudRiskLevel | "unchecked";
  score?: number | null;
}) {
  const styles: Record<string, string> = {
    unchecked: "border-border bg-muted text-muted-foreground",
    safe: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
    low: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300",
    medium:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
    high: "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-300",
    critical: "border-destructive/30 bg-destructive/10 text-destructive",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold",
        styles[level],
      )}
    >
      {title(level)}
      {score !== null && score !== undefined ? ` ${score}` : ""}
    </span>
  );
}

function FraudResult({ check }: { check: FraudCheck }) {
  const highRisk = ["high", "critical"].includes(check.risk_level);
  return (
    <section className="mt-5 space-y-4 border-t border-border pt-5">
      {highRisk ? (
        <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-bold">High-risk fraud signal</p>
            <p className="mt-1">{check.recommendation}</p>
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
        <div>
          <p className="text-sm text-muted-foreground">Overall Risk Score</p>
          <p className="mt-1 text-3xl font-extrabold">{check.risk_score}/100</p>
        </div>
        <FraudRiskBadge level={check.risk_level} score={check.risk_score} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Fraud Matches" value={check.fraud_matches} />
        <Metric label="Known Scam Reports" value={check.known_scam_reports} />
        <Metric label="Chargeback Reports" value={check.chargeback_reports} />
        <Metric label="Suspicious Activity" value={check.suspicious_activity_count} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-border p-4">
          <h3 className="font-bold">Risk Reasons</h3>
          <div className="mt-3 space-y-2">
            {check.risk_reasons.length ? (
              check.risk_reasons.map((reason) => (
                <p key={reason} className="flex gap-2 text-sm text-muted-foreground">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {reason}
                </p>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No material risk reasons returned.
              </p>
            )}
          </div>
        </section>
        <section className="rounded-lg border border-border p-4">
          <h3 className="font-bold">Recommendation</h3>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {check.recommendation || "Continue with standard verification."}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Last updated: {formatDate(check.checked_at)} · {check.response_time_ms}ms
          </p>
        </section>
      </div>
      <section className="rounded-lg border border-border p-4">
        <h3 className="font-bold">Provider Results</h3>
        <div className="mt-3 space-y-3">
          {check.providers.map((provider) => (
            <details
              key={provider.provider}
              className="rounded-lg border border-border bg-muted/20 p-3"
            >
              <summary className="cursor-pointer list-none">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="flex items-center gap-2 font-semibold">
                    {provider.status === "success" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    )}
                    {title(provider.provider)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {provider.response_time_ms}ms · Score {provider.risk_score}
                  </span>
                </div>
              </summary>
              {provider.error_message ? (
                <p className="mt-3 text-sm text-destructive">{provider.error_message}</p>
              ) : null}
              {provider.raw_response ? (
                <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted p-3 text-xs">
                  {JSON.stringify(provider.raw_response, null, 2)}
                </pre>
              ) : null}
            </details>
          ))}
        </div>
      </section>
    </section>
  );
}

function Field({
  label,
  value,
  type = "text",
  required,
  onChange,
}: {
  label: string;
  value: string;
  type?: string;
  required?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2 text-sm font-semibold">
      <span>{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}
function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}
function title(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "Not set";
}
