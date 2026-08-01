"use client";

import * as React from "react";
import { Activity, BarChart3, ChevronLeft, ChevronRight, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { marketingService } from "@/features/admin/marketing/services/marketing-service";
import type { MarketingAnalytics, MarketingTrackingEvent } from "@/features/admin/marketing/types";
import type { PaginationMeta } from "@/features/admin/shared/types";
import { toAppError } from "@/lib/errors";

function dateValue(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function count(value: number | string) {
  return Number(value).toLocaleString();
}

export function MarketingAnalyticsContent() {
  const [days, setDays] = React.useState("30");
  const [analytics, setAnalytics] = React.useState<MarketingAnalytics | null>(null);
  const [events, setEvents] = React.useState<MarketingTrackingEvent[]>([]);
  const [pagination, setPagination] = React.useState<PaginationMeta | null>(null);
  const [dateFrom, setDateFrom] = React.useState(dateValue(-29));
  const [dateTo, setDateTo] = React.useState(dateValue());
  const [platform, setPlatform] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const [event, setEvent] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [direction, setDirection] = React.useState<"asc" | "desc">("desc");
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [dashboard, logResponse] = await Promise.all([
        marketingService.analytics(Number(days)),
        marketingService.logs({
          page,
          per_page: 20,
          search: search.trim() || undefined,
          platform: platform === "all" ? undefined : platform,
          status: status === "all" ? undefined : status,
          event: event.trim() || undefined,
          date_from: dateFrom,
          date_to: dateTo,
          sort: "occurred_at",
          direction,
        }),
      ]);
      setAnalytics(dashboard.data.analytics);
      setEvents(logResponse.data.events);
      setPagination(logResponse.meta.pagination ?? null);
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, direction, days, event, page, platform, search, status]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => void load(), search ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [load, search]);

  const maxEventTotal = Math.max(...(analytics?.top_events ?? []).map((item) => Number(item.total)), 1);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>Dashboard</span><ChevronRight className="h-4 w-4" /><span>Marketing Analytics</span>
      </div>

      <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Marketing Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">Track delivery health, ecommerce events, consent, and provider responses.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={days} onValueChange={(value) => { setDays(value); setPage(1); }}>
            <SelectTrigger className="h-10 w-36"><SelectValue /></SelectTrigger>
            <SelectContent>{[7, 30, 90, 365].map((value) => <SelectItem key={value} value={String(value)}>{value} days</SelectItem>)}</SelectContent>
          </Select>
          <Button size="sm" variant="secondary" icon={<RefreshCw className="h-4 w-4" />} isLoading={loading} onClick={() => void load()}>Refresh</Button>
        </div>
      </section>

      {loading && !analytics ? <AnalyticsSkeleton /> : analytics ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Events Sent Today" value={analytics.summary.events_sent_today} />
            <Metric label="Failed Events" value={analytics.summary.failed_events} />
            <Metric label="Purchase Events" value={analytics.summary.purchase_events} />
            <Metric label="Add To Cart Events" value={analytics.summary.add_to_cart_events} />
            <Metric label="Checkout Events" value={analytics.summary.checkout_events} />
            <Metric label="Success Rate" value={`${analytics.summary.success_rate}%`} />
            <Metric label="Tracking Health" value={analytics.summary.tracking_health.replace("_", " ")} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <section className="rounded-lg border border-border bg-card p-4">
              <div className="mb-4 flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /><h2 className="font-bold">Top Events</h2></div>
              <div className="space-y-3">
                {analytics.top_events.length ? analytics.top_events.map((item) => (
                  <div key={item.event_name}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium">{item.event_name}</span><span className="font-semibold">{count(item.total)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(3, (Number(item.total) / maxEventTotal) * 100)}%` }} /></div>
                  </div>
                )) : <p className="py-10 text-center text-sm text-muted-foreground">No tracking events found.</p>}
              </div>
            </section>
            <section className="rounded-lg border border-border bg-card p-4">
              <div className="mb-4 flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /><h2 className="font-bold">Provider Health</h2></div>
              <div className="space-y-3">
                {analytics.platforms.length ? analytics.platforms.map((item) => (
                  <div key={item.platform} className="rounded-lg bg-muted/50 p-3">
                    <div className="flex items-center justify-between text-sm"><span className="font-semibold uppercase">{item.platform}</span><span>{count(item.successful)} successful</span></div>
                    <p className="mt-1 text-xs text-muted-foreground">{count(item.total)} total events, {count(item.failed)} failed</p>
                  </div>
                )) : <p className="py-10 text-center text-sm text-muted-foreground">No provider events found.</p>}
              </div>
            </section>
          </div>
        </>
      ) : null}

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_1.2fr_1.5fr_auto] xl:items-end">
          <label className="space-y-1.5 text-sm font-semibold">
            <span>Search</span>
            <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Event or order number" className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary" /></div>
          </label>
          <FilterSelect label="Platform" value={platform} onChange={(value) => { setPlatform(value); setPage(1); }} options={[["all", "All Platforms"], ["meta", "Meta Pixel"], ["google", "Google Analytics"]]} />
          <FilterSelect label="Status" value={status} onChange={(value) => { setStatus(value); setPage(1); }} options={[["all", "All Statuses"], ["sent", "Sent"], ["queued", "Queued"], ["retrying", "Retrying"], ["failed", "Failed"], ["recorded", "Recorded"], ["skipped", "Skipped"]]} />
          <label className="space-y-1.5 text-sm font-semibold"><span>Event</span><input value={event} onChange={(e) => { setEvent(e.target.value); setPage(1); }} placeholder="purchase" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary" /></label>
          <div className="grid grid-cols-2 gap-2"><DatePicker label="From" value={dateFrom} onChange={(value) => { setDateFrom(value); setPage(1); }} /><DatePicker label="To" value={dateTo} onChange={(value) => { setDateTo(value); setPage(1); }} /></div>
          <Button size="sm" variant="secondary" onClick={() => setDirection((value) => value === "desc" ? "asc" : "desc")}>{direction === "desc" ? "Newest" : "Oldest"}</Button>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="border-b border-border p-4"><h2 className="font-bold">Tracking Logs</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-muted text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Event</th><th className="px-4 py-3">Platform</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Consent</th><th className="px-4 py-3 text-right">Time</th><th className="px-4 py-3 text-right">Retries</th><th className="px-4 py-3">Occurred</th></tr></thead>
            <tbody>
              {events.length ? events.map((item) => (
                <tr key={item.id} className="border-t border-border align-top hover:bg-muted/40">
                  <td className="px-4 py-3"><p className="font-semibold">{item.event_name}</p><p className="mt-1 max-w-60 truncate text-xs text-muted-foreground">{item.order?.order_number ?? item.event_id}</p>{item.error_message ? <p className="mt-1 max-w-72 text-xs text-destructive">{item.error_message}</p> : null}</td>
                  <td className="px-4 py-3 font-semibold uppercase">{item.platform}</td>
                  <td className="px-4 py-3 capitalize">{item.source}</td>
                  <td className="px-4 py-3 capitalize">{item.status}</td>
                  <td className="px-4 py-3 capitalize">{item.consent_status}</td>
                  <td className="px-4 py-3 text-right">{item.execution_time_ms}ms</td>
                  <td className="px-4 py-3 text-right">{item.retry_count}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.occurred_at ? new Date(item.occurred_at).toLocaleString() : "-"}</td>
                </tr>
              )) : <tr><td colSpan={8} className="h-40 text-center text-muted-foreground">No tracking logs found.</td></tr>}
            </tbody>
          </table>
        </div>
        {pagination && pagination.last_page > 1 ? (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-sm text-muted-foreground">{pagination.total.toLocaleString()} events</p>
            <div className="flex items-center gap-2"><Button size="sm" variant="secondary" icon={<ChevronLeft className="h-4 w-4" />} disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Previous</Button><span className="text-sm font-medium">{page} / {pagination.last_page}</span><Button size="sm" variant="secondary" icon={<ChevronRight className="h-4 w-4" />} disabled={page >= pagination.last_page || loading} onClick={() => setPage((value) => value + 1)}>Next</Button></div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]> }) {
  return <label className="space-y-1.5 text-sm font-semibold"><span>{label}</span><Select value={value} onValueChange={onChange}><SelectTrigger className="h-10 rounded-lg px-3 text-sm"><SelectValue /></SelectTrigger><SelectContent>{options.map(([key, text]) => <SelectItem key={key} value={key}>{text}</SelectItem>)}</SelectContent></Select></label>;
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return <section className="rounded-lg border border-border bg-card p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-extrabold capitalize">{typeof value === "number" ? value.toLocaleString() : value}</p></section>;
}

function AnalyticsSkeleton() {
  return <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 7 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-lg bg-muted" />)}</div><div className="grid gap-4 xl:grid-cols-2"><div className="h-80 animate-pulse rounded-lg bg-muted" /><div className="h-80 animate-pulse rounded-lg bg-muted" /></div></div>;
}
