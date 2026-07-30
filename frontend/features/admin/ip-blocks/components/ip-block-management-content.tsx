"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Ban,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Edit3,
  Eye,
  Filter,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableSkeleton } from "@/components/ui/skeleton";
import { routePaths } from "@/constants/routes";
import { ipBlockService } from "@/features/admin/ip-blocks/services/ip-block-service";
import type { IpBlock, IpBlockAnalytics } from "@/features/admin/ip-blocks/types";
import { useDebounce } from "@/features/admin/shared/hooks/use-debounce";
import type { PaginationMeta } from "@/features/admin/shared/types";
import { useDeleteConfirmation } from "@/hooks/use-delete-confirmation";
import { toAppError } from "@/lib/errors";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/utils/cn";

const pageSizes = [10, 20, 50, 100];
const reasons = ["Spam", "Brute Force", "Too Many Login Attempts", "API Abuse", "Crawler", "Bot", "Fraud Detection", "Suspicious Activity", "Custom"];

type Filters = {
  status: string;
  type: string;
  reason: string;
  country: string;
  date_from: string;
  date_to: string;
};

const emptyFilters: Filters = { status: "", type: "", reason: "", country: "", date_from: "", date_to: "" };

function formatDate(value?: string | null) {
  return value ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Permanent";
}

function title(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export function IpBlockManagementContent() {
  const permissions = useAuthStore((state) => state.user?.permissions ?? []);
  const canCreate = permissions.includes("can-create-ip-block");
  const canUpdate = permissions.includes("can-update-ip-block");
  const canDelete = permissions.includes("can-delete-ip-block");
  const [items, setItems] = useState<IpBlock[]>([]);
  const [analytics, setAnalytics] = useState<IpBlockAnalytics | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sort, setSort] = useState("blocked_at");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [selected, setSelected] = useState<number[]>([]);
  const [bulkAction, setBulkAction] = useState("");
  const [processing, setProcessing] = useState(false);
  const { confirmDelete, deleteConfirmationDialog } = useDeleteConfirmation();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [listResponse, analyticsResponse] = await Promise.all([
        ipBlockService.list({ page, per_page: perPage, search: debouncedSearch, sort, direction, ...filters }),
        ipBlockService.analytics(),
      ]);
      setItems(listResponse.data.ip_blocks);
      setPagination(listResponse.meta.pagination ?? null);
      setAnalytics(analyticsResponse.data.analytics);
      setSelected((current) => current.filter((id) => listResponse.data.ip_blocks.some((item) => item.id === id)));
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, direction, filters, page, perPage, sort]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setPage(1); }, [debouncedSearch]);

  const allSelected = items.length > 0 && items.every((item) => selected.includes(item.id));
  const metricCards = useMemo(() => [
    ["Currently Blocked", analytics?.currently_blocked ?? 0],
    ["Blocked Today", analytics?.blocked_today ?? 0],
    ["Automatic Blocks", analytics?.automatic_blocks ?? 0],
    ["Manual Blocks", analytics?.manual_blocks ?? 0],
  ], [analytics]);

  function sortBy(field: string) {
    setDirection(sort === field && direction === "asc" ? "desc" : "asc");
    setSort(field);
    setPage(1);
  }

  async function runBulk() {
    if (!bulkAction || selected.length === 0) return;
    const execute = async () => {
      setProcessing(true);
      try {
        await ipBlockService.bulk(selected, bulkAction as "block" | "unblock" | "delete" | "activate" | "deactivate", bulkAction === "block" ? "Suspicious Activity" : undefined);
        toast.success("Bulk action completed.");
        setSelected([]);
        setBulkAction("");
        await load();
      } catch (error) {
        toast.error(toAppError(error).message);
      } finally {
        setProcessing(false);
      }
    };

    if (["delete", "unblock", "deactivate"].includes(bulkAction)) {
      confirmDelete({ title: "Confirm Bulk Action", message: `Apply ${title(bulkAction)} to ${selected.length} selected IP addresses?`, onConfirm: execute });
    } else {
      await execute();
    }
  }

  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>Dashboard</span><ChevronRight className="h-4 w-4" /><span>Security</span><ChevronRight className="h-4 w-4" /><span className="font-medium text-foreground">IP Blocking</span>
        </div>

        <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">IP Blocking</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage manual and automatic IP restrictions, expiry, and security history.</p>
          </div>
          {canCreate ? <Link href={routePaths.adminIpBlockCreate}><Button size="sm" icon={<Plus className="h-4 w-4" />}>Block IP</Button></Link> : null}
        </section>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {metricCards.map(([label, value]) => <div key={label} className="rounded-lg border border-border bg-card p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-extrabold">{value}</p></div>)}
        </div>

        <section className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search IP, reason, or notes" className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none" />
              {search ? <button type="button" aria-label="Clear search" onClick={() => setSearch("")}><X className="h-4 w-4 text-muted-foreground" /></button> : null}
            </div>
            <Button size="sm" variant="secondary" icon={<Filter className="h-4 w-4" />} onClick={() => setFilterOpen(true)}>Filters</Button>
            {selected.length ? (
              <>
                <Select value={bulkAction || "none"} onValueChange={(value) => setBulkAction(value === "none" ? "" : value)}>
                  <SelectTrigger className="h-10 w-44 rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Bulk action</SelectItem>
                    {canUpdate ? <><SelectItem value="block">Block</SelectItem><SelectItem value="activate">Activate</SelectItem><SelectItem value="deactivate">Deactivate</SelectItem><SelectItem value="unblock">Unblock</SelectItem></> : null}
                    {canDelete ? <SelectItem value="delete">Delete</SelectItem> : null}
                  </SelectContent>
                </Select>
                <Button size="sm" isLoading={processing} disabled={!bulkAction} onClick={() => void runBulk()}>Apply ({selected.length})</Button>
              </>
            ) : null}
            {canDelete ? <Button size="sm" variant="secondary" icon={<Trash2 className="h-4 w-4" />} onClick={() => confirmDelete({ title: "Delete Expired Blocks", message: "Delete all inactive and naturally expired IP block records?", onConfirm: async () => { const response = await ipBlockService.deleteExpired(); toast.success(`${response.data.deleted} expired records deleted.`); await load(); } })}>Delete Expired</Button> : null}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1500px] text-left text-sm">
              <thead className="border-b border-border bg-muted text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="w-12 px-4 py-3"><input type="checkbox" checked={allSelected} onChange={(event) => setSelected(event.target.checked ? items.map((item) => item.id) : [])} aria-label="Select all" /></th>
                  <SortHead label="IP Address" field="ip_address" active={sort} onSort={sortBy} />
                  <th className="px-4 py-3">Country</th><th className="px-4 py-3">City</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Reason</th><th className="px-4 py-3">Status</th>
                  <SortHead label="Block Count" field="block_count" active={sort} onSort={sortBy} />
                  <SortHead label="Expires" field="expires_at" active={sort} onSort={sortBy} />
                  <SortHead label="Last Activity" field="last_activity_at" active={sort} onSort={sortBy} />
                  <th className="px-4 py-3">Created By</th><SortHead label="Created" field="created_at" active={sort} onSort={sortBy} /><th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? <TableSkeleton rows={6} columns={12} actions /> : items.length ? items.map((item) => (
                  <tr key={item.id} className="border-t border-border hover:bg-muted/40">
                    <td className="px-4 py-3"><input type="checkbox" checked={selected.includes(item.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))} aria-label={`Select ${item.ip_address}`} /></td>
                    <td className="px-4 py-3 font-mono font-semibold">{item.ip_address}</td><td className="px-4 py-3">{item.country ?? "-"}</td><td className="px-4 py-3">{item.city ?? "-"}</td>
                    <td className="px-4 py-3"><Pill value={item.type} /></td><td className="max-w-56 truncate px-4 py-3" title={item.reason}>{item.reason}</td><td className="px-4 py-3"><Pill value={item.status} /></td>
                    <td className="px-4 py-3">{item.block_count}</td><td className="px-4 py-3">{formatDate(item.expires_at)}</td><td className="px-4 py-3">{formatDate(item.last_activity_at)}</td><td className="px-4 py-3">{item.created_by?.name ?? "System"}</td><td className="px-4 py-3">{formatDate(item.created_at)}</td>
                    <td className="px-4 py-3"><div className="flex justify-end gap-1">
                      <Link href={`${routePaths.adminIpBlocks}/${item.id}`}><Button size="icon" variant="ghost" icon={<Eye className="h-4 w-4" />} aria-label="View IP block" title="View" /></Link>
                      {canUpdate ? <><Link href={`${routePaths.adminIpBlocks}/${item.id}/edit`}><Button size="icon" variant="ghost" icon={<Edit3 className="h-4 w-4" />} aria-label="Edit IP block" title="Edit" /></Link><Button size="icon" variant="ghost" icon={item.status === "active" ? <ShieldCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />} aria-label={item.status === "active" ? "Unblock" : "Activate"} title={item.status === "active" ? "Unblock" : "Activate"} onClick={() => confirmDelete({ title: item.status === "active" ? "Unblock IP" : "Activate IP Block", message: `${item.status === "active" ? "Unblock" : "Activate"} ${item.ip_address}?`, onConfirm: async () => { await ipBlockService.update(item.id, { reason: item.reason, status: item.status === "active" ? "inactive" : "active", type: item.type, expires_at: item.expires_at, notes: item.notes }); toast.success("IP block updated."); await load(); } })} /></> : null}
                      {canDelete ? <Button size="icon" variant="ghost" icon={<Trash2 className="h-4 w-4" />} aria-label="Delete IP block" title="Delete" onClick={() => confirmDelete({ title: "Delete IP Block", message: `Delete ${item.ip_address} and keep its audit history?`, onConfirm: async () => { await ipBlockService.delete(item.id); toast.success("IP block deleted."); await load(); } })} /> : null}
                    </div></td>
                  </tr>
                )) : <tr><td colSpan={13} className="h-48 text-center"><p className="font-semibold">No IP blocks found</p><p className="mt-1 text-sm text-muted-foreground">Try changing the search or filters.</p></td></tr>}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">Total Records: <span className="font-semibold text-foreground">{pagination?.total ?? 0}</span></p>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={String(perPage)} onValueChange={(value) => { setPerPage(Number(value)); setPage(1); }}><SelectTrigger className="h-9 w-[110px] rounded-lg"><SelectValue /></SelectTrigger><SelectContent>{pageSizes.map((size) => <SelectItem key={size} value={String(size)}>{size} / page</SelectItem>)}</SelectContent></Select>
              <Button size="sm" variant="secondary" icon={<ChevronLeft className="h-4 w-4" />} disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><span className="text-sm font-semibold">{page} / {pagination?.last_page ?? 1}</span><Button size="sm" variant="secondary" icon={<ChevronRight className="h-4 w-4" />} disabled={page >= (pagination?.last_page ?? 1)} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          </div>
        </section>
      </div>
      <FilterModal open={filterOpen} filters={filters} onClose={() => setFilterOpen(false)} onApply={(next) => { setFilters(next); setPage(1); setFilterOpen(false); }} />
      {deleteConfirmationDialog}
    </>
  );
}

function FilterModal({ open, filters, onClose, onApply }: { open: boolean; filters: Filters; onClose: () => void; onApply: (filters: Filters) => void }) {
  const [draft, setDraft] = useState(filters);
  useEffect(() => { setDraft(filters); }, [filters, open]);
  if (!open) return null;
  return <div className="fixed inset-0 z-[80] flex items-center justify-center p-4"><button type="button" className="absolute inset-0 bg-black/50" aria-label="Close filters" onClick={onClose} /><div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-border bg-background p-5 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-bold">Advanced Filter</h2><p className="mt-1 text-sm text-muted-foreground">Refine IP blocks by status, type, reason, country, and date.</p></div><Button variant="ghost" size="icon" icon={<X className="h-4 w-4" />} aria-label="Close" onClick={onClose} /></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><FilterSelect label="Status" value={draft.status} values={["active", "inactive"]} onChange={(value) => setDraft({ ...draft, status: value })} /><FilterSelect label="Type" value={draft.type} values={["manual", "automatic"]} onChange={(value) => setDraft({ ...draft, type: value })} /><FilterSelect label="Reason" value={draft.reason} values={reasons} onChange={(value) => setDraft({ ...draft, reason: value })} /><label className="space-y-2 text-sm font-semibold">Country<input className="h-10 w-full rounded-lg border border-border bg-background px-3 font-normal outline-none" value={draft.country} onChange={(event) => setDraft({ ...draft, country: event.target.value })} /></label><label className="space-y-2 text-sm font-semibold">From<DatePicker value={draft.date_from} onChange={(value) => setDraft({ ...draft, date_from: value })} /></label><label className="space-y-2 text-sm font-semibold">To<DatePicker value={draft.date_to} onChange={(value) => setDraft({ ...draft, date_to: value })} /></label></div><div className="mt-6 flex justify-end gap-2"><Button size="sm" variant="secondary" onClick={() => { setDraft(emptyFilters); onApply(emptyFilters); }}>Reset</Button><Button size="sm" onClick={() => onApply(draft)}>Apply Filters</Button></div></div></div>;
}

function FilterSelect({ label, value, values, onChange }: { label: string; value: string; values: string[]; onChange: (value: string) => void }) {
  return <label className="space-y-2 text-sm font-semibold">{label}<Select value={value || "all"} onValueChange={(next) => onChange(next === "all" ? "" : next)}><SelectTrigger className="h-10 rounded-lg"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All {label.toLowerCase()}s</SelectItem>{values.map((item) => <SelectItem key={item} value={item}>{title(item)}</SelectItem>)}</SelectContent></Select></label>;
}

function SortHead({ label, field, active, onSort }: { label: string; field: string; active: string; onSort: (field: string) => void }) {
  return <th className="px-4 py-3"><button type="button" onClick={() => onSort(field)} className="inline-flex items-center gap-1 font-bold">{label}<ChevronsUpDown className={cn("h-3.5 w-3.5", active === field && "text-foreground")} /></button></th>;
}

function Pill({ value }: { value: string }) {
  return <span className={cn("inline-flex rounded-full border px-2 py-1 text-xs font-bold", value === "active" && "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30", value === "inactive" && "border-border text-muted-foreground")}>{title(value)}</span>;
}
