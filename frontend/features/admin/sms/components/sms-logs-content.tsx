"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, Filter, MessageSquareText, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableSkeleton } from "@/components/ui/skeleton";
import { routePaths } from "@/constants/routes";
import { SettingsPageShell } from "@/features/admin/settings/components/settings-primitives";
import { smsAdminService } from "@/features/admin/sms/services/sms-service";
import type { SmsLog } from "@/features/admin/sms/types";
import type { PaginationMeta } from "@/features/admin/shared/types";
import { toAppError } from "@/lib/errors";
import { cn } from "@/utils/cn";

const statuses = ["all", "queued", "sent", "failed", "skipped"] as const;
const pageSizes = [10, 15, 25, 50, 100];

function displayLabel(value: string) {
  return value.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function dateLabel(value?: string | null) {
  return value ? new Intl.DateTimeFormat("en-BD", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Not sent";
}

export function SmsLogsContent() {
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [selected, setSelected] = useState<SmsLog | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState({ page: 1, per_page: 15, search: "", status: "", sort: "created_at", direction: "desc" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await smsAdminService.logs(query);
      setLogs(response.data.logs);
      setPagination(response.meta.pagination ?? null);
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => { void load(); }, [load]);

  return (
    <>
      <SettingsPageShell
        title="SMS Logs"
        description="Inspect queued, delivered, failed, and skipped SMS activity with provider responses."
        icon={MessageSquareText}
        actions={<Link href={routePaths.adminSettingsSms}><Button type="button" size="sm" variant="secondary">SMS Settings</Button></Link>}
      >
        <section className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && setQuery((current) => ({ ...current, search: searchInput, page: 1 }))}
                placeholder="Search number, type, order, or provider message ID"
                className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </div>
            <Button size="sm" variant="secondary" icon={<Search className="h-4 w-4" />} onClick={() => setQuery((current) => ({ ...current, search: searchInput, page: 1 }))}>Search</Button>
            <Select value={query.status || "all"} onValueChange={(value) => setQuery((current) => ({ ...current, status: value === "all" ? "" : value, page: 1 }))}>
              <SelectTrigger className="h-10 w-40 rounded-lg px-3 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{statuses.map((status) => <SelectItem key={status} value={status}>{status === "all" ? "Any status" : displayLabel(status)}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="sm" variant="secondary" icon={<Filter className="h-4 w-4" />} onClick={() => { setSearchInput(""); setQuery((current) => ({ ...current, search: "", status: "", page: 1 })); }}>Reset</Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="border-b border-border bg-muted text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Recipient</th>
                  <th className="px-4 py-3">SMS Type</th>
                  <th className="px-4 py-3">Related Order</th>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Sent Time</th>
                  <th className="px-4 py-3">Retries</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? <TableSkeleton rows={8} columns={7} actions /> : logs.length ? logs.map((log) => (
                  <tr key={log.id} className="border-t border-border hover:bg-muted/40">
                    <td className="px-4 py-3 font-semibold">{log.recipient}</td>
                    <td className="px-4 py-3">{displayLabel(log.type)}</td>
                    <td className="px-4 py-3">{log.related_order ?? "None"}</td>
                    <td className="px-4 py-3">{log.provider ?? "Not assigned"}</td>
                    <td className="px-4 py-3"><StatusBadge status={log.status} /></td>
                    <td className="px-4 py-3">{dateLabel(log.sent_at ?? log.created_at)}</td>
                    <td className="px-4 py-3">{log.retry_count}</td>
                    <td className="px-4 py-3 text-right"><Button type="button" size="icon" variant="ghost" aria-label="View SMS log" icon={<Eye className="h-4 w-4" />} onClick={() => setSelected(log)} /></td>
                  </tr>
                )) : <tr><td colSpan={8} className="h-48 text-center text-muted-foreground">No SMS logs found.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">Total Records: <span className="font-semibold text-foreground">{pagination?.total ?? 0}</span></p>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={String(query.per_page)} onValueChange={(value) => setQuery((current) => ({ ...current, per_page: Number(value), page: 1 }))}>
                <SelectTrigger className="h-10 w-[110px] rounded-lg px-2 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{pageSizes.map((size) => <SelectItem key={size} value={String(size)}>{size} / page</SelectItem>)}</SelectContent>
              </Select>
              <Button size="sm" variant="secondary" icon={<ChevronLeft className="h-4 w-4" />} disabled={(pagination?.current_page ?? 1) <= 1} onClick={() => setQuery((current) => ({ ...current, page: current.page - 1 }))}>Previous</Button>
              <Button size="sm" variant="secondary" icon={<ChevronRight className="h-4 w-4" />} disabled={(pagination?.current_page ?? 1) >= (pagination?.last_page ?? 1)} onClick={() => setQuery((current) => ({ ...current, page: current.page + 1 }))}>Next</Button>
            </div>
          </div>
        </section>
      </SettingsPageShell>
      <LogDetail log={selected} onClose={() => setSelected(null)} />
    </>
  );
}

function StatusBadge({ status }: { status: SmsLog["status"] }) {
  return <span className={cn(
    "inline-flex rounded-full px-2.5 py-1 text-xs font-bold",
    status === "sent" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    status === "failed" && "bg-destructive/10 text-destructive",
    status === "queued" && "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    status === "skipped" && "bg-muted text-muted-foreground",
  )}>{displayLabel(status)}</span>;
}

function LogDetail({ log, onClose }: { log: SmsLog | null; onClose: () => void }) {
  if (!log) return null;
  const rows = [
    ["Recipient", log.recipient],
    ["SMS Type", displayLabel(log.type)],
    ["Related Order", log.related_order ?? "None"],
    ["Provider", log.provider ?? "Not assigned"],
    ["Provider Message ID", log.provider_message_id ?? "Not provided"],
    ["Sent Time", dateLabel(log.sent_at)],
    ["Retry Count", String(log.retry_count)],
  ];

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-border bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div><p className="text-xs font-bold uppercase text-muted-foreground">SMS Log</p><h2 className="text-lg font-bold">{displayLabel(log.type)}</h2></div>
          <Button type="button" size="icon" variant="ghost" aria-label="Close" icon={<X className="h-4 w-4" />} onClick={onClose} />
        </div>
        <div className="space-y-4 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {rows.map(([name, value]) => <div key={name} className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">{name}</p><p className="mt-1 break-words text-sm font-semibold">{value}</p></div>)}
            <div className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">Status</p><div className="mt-1"><StatusBadge status={log.status} /></div></div>
          </div>
          <div><p className="mb-2 text-sm font-bold">Message</p><p className="whitespace-pre-wrap rounded-lg bg-muted p-3 text-sm">{log.message}</p></div>
          {log.error_message ? <div><p className="mb-2 text-sm font-bold text-destructive">Error</p><p className="whitespace-pre-wrap rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{log.error_message}</p></div> : null}
          <div><p className="mb-2 text-sm font-bold">API Response</p><pre className="max-h-64 overflow-auto rounded-lg bg-muted p-3 text-xs">{JSON.stringify(log.api_response ?? {}, null, 2)}</pre></div>
        </div>
      </div>
    </div>
  );
}
