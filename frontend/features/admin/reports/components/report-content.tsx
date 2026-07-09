"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, ChevronRight, RefreshCcw, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchReport, type ReportPayload } from "@/features/admin/reports/services/report-service";
import { toAppError } from "@/lib/errors";

const reportTitles: Record<string, string> = {
  sales: "Sales Reports",
  revenue: "Revenue Analytics",
  "product-performance": "Product Performance",
  "customer-analytics": "Customer Analytics",
  payment: "Payment Reports",
  shipping: "Shipping Reports",
  inventory: "Inventory Reports",
};

function defaultFrom() {
  const date = new Date();
  date.setDate(date.getDate() - 29);
  return date.toISOString().slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatValue(value: string | number, format: string, currency: string) {
  if (format === "money") {
    return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(value));
  }

  return typeof value === "number" ? new Intl.NumberFormat("en").format(value) : value;
}

export function ReportContent({ type }: { type: string }) {
  const [dateFrom, setDateFrom] = useState(defaultFrom());
  const [dateTo, setDateTo] = useState(today());
  const [limit, setLimit] = useState(10);
  const [report, setReport] = useState<ReportPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const title = reportTitles[type] ?? "Report";
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const next = await fetchReport(type, { date_from: dateFrom, date_to: dateTo, limit });
      setReport(next);
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, limit, type]);

  useEffect(() => { void load(); }, [load]);

  const maxSeries = useMemo(() => Math.max(...(report?.series ?? []).map((item) => item.value), 1), [report]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>Dashboard</span>
        <ChevronRight className="h-4 w-4" />
        <span>Reports & Analytics</span>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-foreground">{title}</span>
      </div>

      <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Database-driven metrics generated from orders, payments, products, customers, and shipping records.</p>
        </div>
        <Button size="sm" variant="secondary" icon={<RefreshCcw className="h-4 w-4" />} onClick={() => void load()} isLoading={loading}>Refresh</Button>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_10rem_auto]">
          <DatePicker label="Date From" value={dateFrom} onChange={setDateFrom} />
          <DatePicker label="Date To" value={dateTo} onChange={setDateTo} />
          <label className="space-y-1.5 text-sm font-semibold">
            <span>Rows</span>
            <Select value={String(limit)} onValueChange={(value) => setLimit(Number(value))}>
              <SelectTrigger className="h-10 rounded-lg px-3 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[10, 20, 30, 50].map((value) => <SelectItem key={value} value={String(value)}>{value}</SelectItem>)}
              </SelectContent>
            </Select>
          </label>
          <div className="flex items-end">
            <Button className="w-full" size="sm" icon={<Search className="h-4 w-4" />} onClick={() => void load()}>Apply</Button>
          </div>
        </div>
      </section>

      {loading || !report ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-28 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
          <div className="h-72 animate-pulse rounded-lg bg-muted" />
          <div className="h-80 animate-pulse rounded-lg bg-muted" />
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {report.summary.map((item) => (
              <div key={item.label} className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="mt-2 text-2xl font-extrabold">{formatValue(item.value, item.format, report.currency)}</p>
              </div>
            ))}
          </div>

          <section className="rounded-lg border border-border bg-card p-4">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h2 className="font-bold">Trend / Breakdown</h2>
            </div>
            <div className="space-y-3">
              {report.series.length ? report.series.map((point) => (
                <div key={point.label} className="grid gap-2 md:grid-cols-[12rem_1fr_7rem] md:items-center">
                  <p className="truncate text-sm font-medium">{point.label}</p>
                  <div className="h-3 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(4, (point.value / maxSeries) * 100)}%` }} />
                  </div>
                  <p className="text-right text-sm text-muted-foreground">{point.amount ? formatValue(point.amount, "money", report.currency) : point.value}</p>
                </div>
              )) : (
                <p className="py-8 text-center text-sm text-muted-foreground">No data found for this period.</p>
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="border-b border-border p-4">
              <h2 className="font-bold">Report Rows</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-border bg-muted text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Label</th>
                    <th className="px-4 py-3">Info</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Amount / Value</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.length ? report.rows.map((row, index) => (
                    <tr key={`${row.label}-${index}`} className="border-t border-border hover:bg-muted/40">
                      <td className="px-4 py-3 font-semibold">{row.label}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.secondary ?? row.date ?? "-"}</td>
                      <td className="px-4 py-3">{row.status ? <span className="rounded-full border border-border px-2 py-1 text-xs font-bold capitalize">{row.status}</span> : "-"}</td>
                      <td className="px-4 py-3 text-right font-semibold">{typeof row.amount === "number" ? formatValue(row.amount, "money", report.currency) : row.amount ?? "-"}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="h-40 text-center text-muted-foreground">No rows found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
