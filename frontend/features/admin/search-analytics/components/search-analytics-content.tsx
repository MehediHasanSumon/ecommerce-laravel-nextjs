"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, ChevronLeft, ChevronRight, RefreshCcw, Search, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  fetchSearchAnalytics,
  type RankedSearchTerm,
  type SearchAnalytics,
  type SearchAnalyticsTerm,
} from "@/features/admin/search-analytics/services/search-analytics-service";
import type { PaginationMeta } from "@/features/admin/shared/types";
import { toAppError } from "@/lib/errors";

function dateValue(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function formatMetric(value: number, format: string) {
  return format === "percent"
    ? `${value.toLocaleString()}%`
    : value.toLocaleString();
}

export function SearchAnalyticsContent() {
  const [dateFrom, setDateFrom] = useState(dateValue(-29));
  const [dateTo, setDateTo] = useState(dateValue());
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [sort, setSort] = useState("search_count");
  const [direction, setDirection] = useState("desc");
  const [page, setPage] = useState(1);
  const [analytics, setAnalytics] = useState<SearchAnalytics | null>(null);
  const [items, setItems] = useState<SearchAnalyticsTerm[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchSearchAnalytics({
        date_from: dateFrom,
        date_to: dateTo,
        search: search.trim() || undefined,
        type,
        sort,
        direction,
        page,
        per_page: 20,
        limit: 10,
      });
      setAnalytics(response.analytics);
      setItems(response.items);
      setPagination(response.pagination);
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, direction, page, search, sort, type]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), search ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [load, search]);

  const maxSeries = useMemo(
    () => Math.max(...(analytics?.series ?? []).map((point) => point.value), 1),
    [analytics],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>Dashboard</span>
        <ChevronRight className="h-4 w-4" />
        <span>Reports & Analytics</span>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-foreground">Search Analytics</span>
      </div>

      <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Search Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">Search demand, discovery quality, click behavior, and conversion performance.</p>
        </div>
        <Button size="sm" variant="secondary" icon={<RefreshCcw className="h-4 w-4" />} isLoading={loading} onClick={() => void load()}>
          Refresh
        </Button>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1.4fr_12rem_12rem_auto]">
          <DatePicker label="Date From" value={dateFrom} onChange={(value) => { setDateFrom(value); setPage(1); }} />
          <DatePicker label="Date To" value={dateTo} onChange={(value) => { setDateTo(value); setPage(1); }} />
          <label className="space-y-1.5 text-sm font-semibold">
            <span>Keyword</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/15" placeholder="Search keywords" />
            </div>
          </label>
          <FilterSelect label="Type" value={type} onChange={(value) => { setType(value); setPage(1); }} options={[
            ["all", "All Searches"],
            ["zero_results", "Zero Results"],
            ["converting", "Converting"],
          ]} />
          <FilterSelect label="Sort" value={sort} onChange={(value) => { setSort(value); setPage(1); }} options={[
            ["search_count", "Most Searched"],
            ["zero_result_count", "Zero Results"],
            ["click_count", "Most Clicked"],
            ["conversion_count", "Top Converting"],
            ["last_searched_at", "Most Recent"],
          ]} />
          <div className="flex items-end">
            <Button className="w-full" size="sm" onClick={() => setDirection((value) => value === "desc" ? "asc" : "desc")}>
              {direction === "desc" ? "Descending" : "Ascending"}
            </Button>
          </div>
        </div>
      </section>

      {loading && !analytics ? <AnalyticsSkeleton /> : analytics ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {analytics.summary.map((metric) => (
              <div key={metric.key} className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm text-muted-foreground">{metric.label}</p>
                <p className="mt-2 text-2xl font-extrabold">{formatMetric(metric.value, metric.format)}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
            <section className="rounded-lg border border-border bg-card p-4">
              <div className="mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <h2 className="font-bold">Daily Searches</h2>
              </div>
              <div className="space-y-2">
                {analytics.series.map((point) => (
                  <div key={point.label} className="grid grid-cols-[6rem_1fr_3rem] items-center gap-3 text-sm">
                    <span className="text-muted-foreground">{point.label.slice(5)}</span>
                    <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(2, (point.value / maxSeries) * 100)}%` }} />
                    </div>
                    <span className="text-right font-semibold">{point.value}</span>
                  </div>
                ))}
              </div>
            </section>

            <RankedPanel title="Trending Searches" icon={<TrendingUp className="h-5 w-5 text-primary" />} rows={analytics.trending} valueKey="search_count" />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <RankedPanel title="Most Searched" rows={analytics.most_searched} valueKey="search_count" />
            <RankedPanel title="Zero Result Keywords" rows={analytics.zero_results} valueKey="zero_result_count" />
            <RankedPanel title="Top Converting Keywords" rows={analytics.top_converting} valueKey="conversion_count" />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <TargetPanel title="Top Categories" rows={analytics.top_categories} />
            <TargetPanel title="Top Brands" rows={analytics.top_brands} />
            <TargetPanel title="Top Collections" rows={analytics.top_collections} />
          </div>

          <section className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="border-b border-border p-4">
              <h2 className="font-bold">Recent Searches</h2>
            </div>
            <div className="divide-y divide-border">
              {analytics.recent.length ? analytics.recent.map((item, index) => (
                <div key={`${item.keyword}-${item.searched_at}-${index}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span className="font-semibold">{item.keyword}</span>
                  <span className="text-muted-foreground">{item.results.toLocaleString()} results</span>
                  <span className="text-muted-foreground">{item.searched_at ? new Date(item.searched_at).toLocaleString() : "-"}</span>
                </div>
              )) : <p className="py-10 text-center text-sm text-muted-foreground">No recent searches found.</p>}
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="border-b border-border p-4">
              <h2 className="font-bold">Keyword Performance</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-muted text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Keyword</th>
                    <th className="px-4 py-3 text-right">Searches</th>
                    <th className="px-4 py-3 text-right">Zero Results</th>
                    <th className="px-4 py-3 text-right">Unique Users</th>
                    <th className="px-4 py-3 text-right">Clicks</th>
                    <th className="px-4 py-3 text-right">Conversions</th>
                    <th className="px-4 py-3">Last Searched</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length ? items.map((item) => (
                    <tr key={item.id} className="border-t border-border hover:bg-muted/40">
                      <td className="px-4 py-3 font-semibold">{item.keyword}</td>
                      <td className="px-4 py-3 text-right">{item.search_count.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">{item.zero_result_count.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">{item.unique_user_count.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">{item.click_count.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">{item.conversion_count.toLocaleString()}</td>
                      <td className="px-4 py-3 text-muted-foreground">{item.last_searched_at ? new Date(item.last_searched_at).toLocaleString() : "-"}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={7} className="h-40 text-center text-muted-foreground">No search analytics found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {pagination && pagination.last_page > 1 ? (
              <div className="flex items-center justify-between border-t border-border px-4 py-3">
                <p className="text-sm text-muted-foreground">{pagination.total.toLocaleString()} keywords</p>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="secondary" icon={<ChevronLeft className="h-4 w-4" />} disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Previous</Button>
                  <span className="text-sm font-medium">{page} / {pagination.last_page}</span>
                  <Button size="sm" variant="secondary" icon={<ChevronRight className="h-4 w-4" />} disabled={page >= pagination.last_page || loading} onClick={() => setPage((value) => value + 1)}>Next</Button>
                </div>
              </div>
            ) : null}
          </section>
        </>
      ) : null}
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]> }) {
  return (
    <label className="space-y-1.5 text-sm font-semibold">
      <span>{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-10 rounded-lg px-3 text-sm"><SelectValue /></SelectTrigger>
        <SelectContent>{options.map(([key, text]) => <SelectItem key={key} value={key}>{text}</SelectItem>)}</SelectContent>
      </Select>
    </label>
  );
}

function RankedPanel({ title, rows, valueKey, icon }: { title: string; rows: RankedSearchTerm[]; valueKey: keyof RankedSearchTerm; icon?: React.ReactNode }) {
  const maximum = Math.max(...rows.map((row) => Number(row[valueKey]) || 0), 1);
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="mb-4 flex items-center gap-2">{icon}<h2 className="font-bold">{title}</h2></div>
      <div className="space-y-3">
        {rows.length ? rows.map((row) => {
          const value = Number(row[valueKey]) || 0;
          return (
            <div key={row.keyword}>
              <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                <span className="truncate font-medium">{row.keyword}</span>
                <span className="font-semibold">{value.toLocaleString()}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(3, (value / maximum) * 100)}%` }} /></div>
            </div>
          );
        }) : <p className="py-8 text-center text-sm text-muted-foreground">No data found.</p>}
      </div>
    </section>
  );
}

function TargetPanel({ title, rows }: { title: string; rows: Array<{ label: string; value: number }> }) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="mb-4 font-bold">{title}</h2>
      <div className="space-y-2">
        {rows.length ? rows.map((row, index) => (
          <div key={row.label} className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2 text-sm">
            <span className="min-w-0 truncate font-medium">{index + 1}. {row.label}</span>
            <span className="font-bold">{row.value.toLocaleString()}</span>
          </div>
        )) : <p className="py-8 text-center text-sm text-muted-foreground">No click data found.</p>}
      </div>
    </section>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 7 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-lg bg-muted" />)}</div>
      <div className="grid gap-4 xl:grid-cols-2"><div className="h-80 animate-pulse rounded-lg bg-muted" /><div className="h-80 animate-pulse rounded-lg bg-muted" /></div>
      <div className="h-96 animate-pulse rounded-lg bg-muted" />
    </div>
  );
}
