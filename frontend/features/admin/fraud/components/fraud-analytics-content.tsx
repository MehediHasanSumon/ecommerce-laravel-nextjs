"use client";

import * as React from "react";
import { AlertTriangle, BarChart3, ChevronRight, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fraudService } from "@/features/admin/fraud/services/fraud-service";
import type { FraudAnalytics } from "@/features/admin/fraud/types";
import { toAppError } from "@/lib/errors";

export function FraudAnalyticsContent() {
  const [days, setDays] = React.useState("30");
  const [analytics, setAnalytics] = React.useState<FraudAnalytics | null>(null);
  const [loading, setLoading] = React.useState(true);
  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fraudService.analytics(Number(days));
      setAnalytics(response.data.analytics);
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setLoading(false);
    }
  }, [days]);
  React.useEffect(() => { void load(); }, [load]);
  const maxTrend = Math.max(...(analytics?.trend ?? []).map((point) => Number(point.total)), 1);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"><span>Dashboard</span><ChevronRight className="h-4 w-4" /><span>Reports & Analytics</span><ChevronRight className="h-4 w-4" /><span className="font-medium text-foreground">Fraud Analytics</span></div>
      <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-extrabold tracking-tight">Fraud Analytics</h1><p className="mt-1 text-sm text-muted-foreground">Risk volume, provider reliability, fulfillment blocks, and common fraud signals.</p></div>
        <div className="flex gap-2"><Select value={days} onValueChange={setDays}><SelectTrigger className="h-10 w-36"><SelectValue /></SelectTrigger><SelectContent>{[7, 30, 90, 365].map((value) => <SelectItem key={value} value={String(value)}>{value} days</SelectItem>)}</SelectContent></Select><Button size="sm" variant="secondary" icon={<RefreshCw className="h-4 w-4" />} isLoading={loading} onClick={() => void load()}>Refresh</Button></div>
      </section>
      {loading && !analytics ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-lg bg-muted" />)}</div> : analytics ? <>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Today's Fraud Checks" value={analytics.summary.today_checks} />
          <Metric label="Weekly Checks" value={analytics.summary.weekly_checks} />
          <Metric label="High Risk Orders" value={analytics.summary.high_risk_orders} />
          <Metric label="Critical Orders" value={analytics.summary.critical_orders} />
          <Metric label="Blocked Orders" value={analytics.summary.blocked_orders} />
          <Metric label="Held Orders" value={analytics.summary.held_orders} />
          <Metric label="Average Response" value={`${analytics.summary.average_response_time_ms}ms`} />
          <Metric label="Flag Rate" value={`${analytics.summary.flag_rate}%`} />
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
          <section className="rounded-lg border border-border bg-card p-4"><div className="mb-4 flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /><h2 className="font-bold">Fraud Trend</h2></div><div className="space-y-2">{analytics.trend.length ? analytics.trend.map((point) => <div key={point.date} className="grid grid-cols-[6rem_1fr_4rem] items-center gap-3 text-sm"><span className="text-muted-foreground">{point.date.slice(5)}</span><div className="h-2.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(2, (Number(point.total) / maxTrend) * 100)}%` }} /></div><span className="text-right font-semibold">{point.total}</span></div>) : <p className="py-12 text-center text-sm text-muted-foreground">No fraud checks in this period.</p>}</div></section>
          <section className="rounded-lg border border-border bg-card p-4"><div className="mb-4 flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-primary" /><h2 className="font-bold">Top Fraud Reasons</h2></div><div className="space-y-2">{analytics.top_reasons.length ? analytics.top_reasons.map((item) => <div key={item.reason} className="flex items-start justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2 text-sm"><span>{item.reason}</span><span className="font-bold">{item.count}</span></div>) : <p className="py-12 text-center text-sm text-muted-foreground">No risk reasons recorded.</p>}</div></section>
        </div>
        <section className="overflow-hidden rounded-lg border border-border bg-card"><div className="border-b border-border p-4"><div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /><h2 className="font-bold">Provider Performance</h2></div></div><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-sm"><thead className="bg-muted text-left text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Provider</th><th className="px-4 py-3 text-right">Requests</th><th className="px-4 py-3 text-right">Success Rate</th><th className="px-4 py-3 text-right">Average Response</th></tr></thead><tbody>{analytics.providers.map((provider) => <tr key={provider.provider} className="border-t border-border"><td className="px-4 py-3 font-semibold capitalize">{provider.provider.replaceAll("_", " ")}</td><td className="px-4 py-3 text-right">{provider.total}</td><td className="px-4 py-3 text-right">{provider.success_rate}%</td><td className="px-4 py-3 text-right">{provider.average_response_time_ms}ms</td></tr>)}</tbody></table></div></section>
      </> : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <section className="rounded-lg border border-border bg-card p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-extrabold">{typeof value === "number" ? value.toLocaleString() : value}</p></section>;
}
