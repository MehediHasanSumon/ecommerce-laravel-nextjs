"use client";

import * as React from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ExternalLink,
  FileText,
  Filter,
  PackagePlus,
  Printer,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableSkeleton } from "@/components/ui/skeleton";
import { courierService } from "@/features/admin/couriers/services/courier-service";
import type {
  CourierProviderMetadata,
  CourierProviderOption,
  CourierShipment,
} from "@/features/admin/couriers/types";
import type { PaginationMeta } from "@/features/admin/shared/types";
import { formatDate, statusLabel } from "@/features/admin/shared/utils";
import { hasPermission } from "@/lib/permissions";
import { toAppError } from "@/lib/errors";
import { useAuthStore } from "@/store/auth-store";
import { formatPrice } from "@/utils/format";
import { cn } from "@/utils/cn";
import { useDeleteConfirmation } from "@/hooks/use-delete-confirmation";

const pageSizes = [10, 20, 50, 100];

type Filters = {
  search: string;
  provider: string;
  status: string;
  cod_status: string;
  date_from: string;
  date_to: string;
  sort: string;
  direction: "asc" | "desc";
  page: number;
  per_page: number;
};

const defaultFilters: Filters = {
  search: "",
  provider: "",
  status: "",
  cod_status: "",
  date_from: "",
  date_to: "",
  sort: "created_at",
  direction: "desc",
  page: 1,
  per_page: 20,
};

export function CourierShipmentsContent() {
  const [filters, setFilters] = React.useState(defaultFilters);
  const [searchInput, setSearchInput] = React.useState("");
  const [shipments, setShipments] = React.useState<CourierShipment[]>([]);
  const [providers, setProviders] = React.useState<Record<string, CourierProviderMetadata>>({});
  const [providerOptions, setProviderOptions] = React.useState<CourierProviderOption[]>([]);
  const [statuses, setStatuses] = React.useState<string[]>([]);
  const [codStatuses, setCodStatuses] = React.useState<string[]>([]);
  const [pagination, setPagination] = React.useState<PaginationMeta | null>(null);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [bulkCreateOpen, setBulkCreateOpen] = React.useState(false);
  const [detail, setDetail] = React.useState<CourierShipment | null>(null);
  useAuthStore((state) => state.user?.permissions);
  const canCreate = hasPermission("can_create_courier_shipment");
  const canEdit = hasPermission("can_edit_courier_shipment");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await courierService.shipments(filters);
      setShipments(response.data.shipments);
      setProviders(response.data.providers);
      setStatuses(response.data.statuses);
      setCodStatuses(response.data.cod_statuses);
      setPagination(response.meta.pagination ?? null);
      setSelected([]);
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  React.useEffect(() => { void load(); }, [load]);
  React.useEffect(() => {
    courierService.options()
      .then((response) => setProviderOptions(response.data.providers))
      .catch(() => setProviderOptions([]));
  }, []);

  const allSelected = shipments.length > 0 && shipments.every((shipment) => selected.includes(shipment.id));
  const page = pagination?.current_page ?? 1;
  const lastPage = pagination?.last_page ?? 1;

  function sortBy(sort: string) {
    setFilters((current) => ({
      ...current,
      sort,
      direction: current.sort === sort && current.direction === "asc" ? "desc" : "asc",
      page: 1,
    }));
  }

  async function showDetail(shipment: CourierShipment) {
    setDetail(shipment);
    try {
      const response = await courierService.shipment(shipment.id);
      setDetail(response.data.shipment);
    } catch (error) {
      toast.error(toAppError(error).message);
    }
  }

  async function bulkSync() {
    if (!selected.length) return;
    try {
      setBusy(true);
      const response = await courierService.bulkSync(selected);
      toast.success(response.message || `${response.data.queued} shipments queued for synchronization.`);
      await load();
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setBusy(false);
    }
  }

  function bulkPrint() {
    shipments.filter((shipment) => selected.includes(shipment.id)).forEach((shipment) => {
      const url = shipment.labelUrl
        || `${(process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/auth").replace(/\/auth\/?$/, "")}/admin/orders/${encodeURIComponent(shipment.orderNumber)}/delivery-slip`;
      window.open(url, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>Dashboard</span><ChevronRight className="h-4 w-4" /><span>Orders</span><ChevronRight className="h-4 w-4" /><span className="font-medium text-foreground">Courier Shipments</span>
      </div>

      <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Courier Shipments</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create, track, synchronize, and inspect Steadfast and Pathao deliveries.</p>
        </div>
        {canCreate ? <Button size="sm" icon={<PackagePlus className="h-4 w-4" />} disabled={!providerOptions.length} onClick={() => setBulkCreateOpen(true)}>Bulk Create</Button> : null}
      </section>

      <section className="rounded-lg border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center">
          <form className="flex min-w-0 flex-1 gap-2" onSubmit={(event) => { event.preventDefault(); setFilters((current) => ({ ...current, search: searchInput, page: 1 })); }}>
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search order, tracking, or consignment ID" className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary" />
            </div>
            <Button size="sm" type="submit">Search</Button>
          </form>
          <Button variant="secondary" size="sm" icon={<Filter className="h-4 w-4" />} onClick={() => setFilterOpen(true)}>Filter</Button>
          {canEdit ? <Button variant="secondary" size="sm" icon={<RefreshCw className="h-4 w-4" />} disabled={!selected.length} isLoading={busy} onClick={() => void bulkSync()}>Bulk Sync</Button> : null}
          <Button variant="secondary" size="sm" icon={<Printer className="h-4 w-4" />} disabled={!selected.length} onClick={bulkPrint}>Bulk Print</Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="w-10 px-4 py-3"><input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? [] : shipments.map((shipment) => shipment.id))} aria-label="Select all shipments" /></th>
                <SortableHead label="Order" sortKey="merchant_order_id" active={filters.sort} onSort={sortBy} />
                <th className="px-4 py-3 font-bold">Customer</th>
                <SortableHead label="Courier" sortKey="provider" active={filters.sort} onSort={sortBy} />
                <th className="px-4 py-3 font-bold">Tracking</th>
                <SortableHead label="Status" sortKey="status" active={filters.sort} onSort={sortBy} />
                <SortableHead label="COD" sortKey="cod_status" active={filters.sort} onSort={sortBy} />
                <SortableHead label="Charge" sortKey="delivery_charge_cents" active={filters.sort} onSort={sortBy} />
                <SortableHead label="Created" sortKey="shipment_created_at" active={filters.sort} onSort={sortBy} />
                <th className="px-4 py-3 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <TableSkeleton rows={filters.per_page} columns={8} selectable actions /> : shipments.length ? shipments.map((shipment) => (
                <tr key={shipment.id} className="border-t border-border hover:bg-muted/40">
                  <td className="px-4 py-3"><input type="checkbox" checked={selected.includes(shipment.id)} onChange={() => setSelected((current) => current.includes(shipment.id) ? current.filter((id) => id !== shipment.id) : [...current, shipment.id])} aria-label={`Select ${shipment.orderNumber}`} /></td>
                  <td className="px-4 py-3"><Link className="font-semibold hover:text-primary" href={`/admin/orders/${encodeURIComponent(shipment.orderNumber)}`}>{shipment.orderNumber}</Link><p className="text-xs text-muted-foreground">{shipment.externalId || "Pending external ID"}</p></td>
                  <td className="px-4 py-3">{shipment.customer.name}<p className="text-xs text-muted-foreground">{shipment.customer.phone}</p></td>
                  <td className="px-4 py-3 font-medium">{shipment.providerLabel}</td>
                  <td className="px-4 py-3">{shipment.trackingNumber || "Pending"}</td>
                  <td className="px-4 py-3"><StatusBadge value={shipment.status} /></td>
                  <td className="px-4 py-3"><StatusBadge value={shipment.codStatus} /></td>
                  <td className="px-4 py-3">{shipment.deliveryCharge === null ? "Not available" : formatPrice(shipment.deliveryCharge)}</td>
                  <td className="px-4 py-3">{formatDate(shipment.shipmentCreatedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" icon={<FileText className="h-4 w-4" />} aria-label={`View ${shipment.orderNumber} shipment`} title="View shipment" onClick={() => void showDetail(shipment)} />
                      {shipment.trackingUrl ? <a href={shipment.trackingUrl} target="_blank" rel="noreferrer"><Button variant="ghost" size="icon" icon={<ExternalLink className="h-4 w-4" />} aria-label="Open courier tracking" title="Open courier tracking" /></a> : null}
                    </div>
                  </td>
                </tr>
              )) : <tr><td colSpan={10} className="h-48 text-center"><p className="font-semibold">No courier shipments found</p><p className="mt-1 text-sm text-muted-foreground">Create a shipment from an order or adjust the filters.</p></td></tr>}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">Total Records: <span className="font-semibold text-foreground">{pagination?.total ?? 0}</span></p>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={String(filters.per_page)} onValueChange={(value) => setFilters((current) => ({ ...current, per_page: Number(value), page: 1 }))}>
              <SelectTrigger className="h-9 w-[110px] rounded-lg px-2 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{pageSizes.map((size) => <SelectItem key={size} value={String(size)}>{size} / page</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="secondary" size="sm" icon={<ChevronLeft className="h-4 w-4" />} disabled={page <= 1} onClick={() => setFilters((current) => ({ ...current, page: page - 1 }))}>Previous</Button>
            <span className="flex h-10 min-w-10 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-semibold">{page} / {lastPage}</span>
            <Button variant="secondary" size="sm" icon={<ChevronRight className="h-4 w-4" />} disabled={page >= lastPage} onClick={() => setFilters((current) => ({ ...current, page: page + 1 }))}>Next</Button>
          </div>
        </div>
      </section>

      <ShipmentFilterModal open={filterOpen} filters={filters} providers={providers} statuses={statuses} codStatuses={codStatuses} onClose={() => setFilterOpen(false)} onApply={(next) => { setFilters({ ...next, page: 1 }); setFilterOpen(false); }} />
      <BulkCreateModal open={bulkCreateOpen} providers={providerOptions} onClose={() => setBulkCreateOpen(false)} onCreated={() => { setBulkCreateOpen(false); void load(); }} />
      <ShipmentDrawer shipment={detail} canEdit={canEdit} onClose={() => setDetail(null)} onChanged={(shipment) => { setDetail(shipment); void load(); }} />
    </div>
  );
}

function SortableHead({ label, sortKey, active, onSort }: { label: string; sortKey: string; active: string; onSort: (key: string) => void }) {
  return <th className="px-4 py-3 font-bold"><button type="button" className="inline-flex items-center gap-1" onClick={() => onSort(sortKey)}>{label}<ChevronsUpDown className={cn("h-3.5 w-3.5", active === sortKey && "text-foreground")} /></button></th>;
}

function StatusBadge({ value }: { value: string }) {
  return <span className="inline-flex rounded-full border border-border px-2 py-1 text-xs font-bold">{statusLabel(value)}</span>;
}

function ShipmentFilterModal({ open, filters, providers, statuses, codStatuses, onClose, onApply }: { open: boolean; filters: Filters; providers: Record<string, CourierProviderMetadata>; statuses: string[]; codStatuses: string[]; onClose: () => void; onApply: (filters: Filters) => void }) {
  const [draft, setDraft] = React.useState(filters);
  React.useEffect(() => setDraft(filters), [filters, open]);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Close shipment filters" type="button" />
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-border bg-background p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-bold">Shipment Filters</h2><p className="mt-1 text-sm text-muted-foreground">Filter by provider, shipment status, COD status, and creation date.</p></div><Button variant="ghost" size="icon" icon={<X className="h-4 w-4" />} aria-label="Close filters" onClick={onClose} /></div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <FilterSelect label="Courier" value={draft.provider} options={Object.entries(providers).map(([value, metadata]) => ({ value, label: metadata.label }))} onChange={(provider) => setDraft({ ...draft, provider })} />
          <FilterSelect label="Shipment Status" value={draft.status} options={statuses.map((value) => ({ value, label: statusLabel(value) }))} onChange={(status) => setDraft({ ...draft, status })} />
          <FilterSelect label="COD Status" value={draft.cod_status} options={codStatuses.map((value) => ({ value, label: statusLabel(value) }))} onChange={(cod_status) => setDraft({ ...draft, cod_status })} />
          <label className="space-y-2 text-sm font-semibold"><span>Date From</span><input type="date" value={draft.date_from} onChange={(event) => setDraft({ ...draft, date_from: event.target.value })} className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm" /></label>
          <label className="space-y-2 text-sm font-semibold"><span>Date To</span><input type="date" value={draft.date_to} onChange={(event) => setDraft({ ...draft, date_to: event.target.value })} className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm" /></label>
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button size="sm" variant="secondary" onClick={() => setDraft({ ...defaultFilters, search: filters.search })}>Reset Filters</Button><Button size="sm" onClick={() => onApply(draft)}>Apply Filters</Button></div>
      </div>
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return <label className="space-y-2 text-sm font-semibold"><span>{label}</span><Select value={value || "all"} onValueChange={(next) => onChange(next === "all" ? "" : next)}><SelectTrigger className="h-11 rounded-lg px-3 text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Any {label}</SelectItem>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></label>;
}

function BulkCreateModal({ open, providers, onClose, onCreated }: { open: boolean; providers: CourierProviderOption[]; onClose: () => void; onCreated: () => void }) {
  const [provider, setProvider] = React.useState("");
  const [orderIds, setOrderIds] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  React.useEffect(() => { if (open && !provider) setProvider(providers[0]?.provider ?? ""); }, [open, provider, providers]);
  if (!open) return null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const ids = orderIds.split(/[\s,]+/).map((item) => item.trim()).filter(Boolean);
    if (!provider || !ids.length) return;
    try {
      setSaving(true);
      const response = await courierService.bulkCreate(ids, provider);
      toast.success(response.message || `${response.data.queued} shipments queued.`);
      setOrderIds("");
      onCreated();
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setSaving(false);
    }
  }

  return <div className="fixed inset-0 z-[85] flex items-center justify-center p-4"><button className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Close bulk shipment creation" type="button" /><form onSubmit={submit} className="relative w-full max-w-lg rounded-lg border border-border bg-background p-5 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-bold">Bulk Create Shipments</h2><p className="mt-1 text-sm text-muted-foreground">Enter order IDs or order numbers separated by spaces, commas, or new lines.</p></div><Button variant="ghost" size="icon" icon={<X className="h-4 w-4" />} aria-label="Close" onClick={onClose} /></div><div className="mt-5 space-y-4"><FilterSelect label="Courier" value={provider} options={providers.map((item) => ({ value: item.provider, label: item.label }))} onChange={setProvider} /><label className="block space-y-2 text-sm font-semibold"><span>Orders</span><textarea rows={6} value={orderIds} onChange={(event) => setOrderIds(event.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="ORD-20260730-..." /></label></div><div className="mt-5 flex justify-end gap-2"><Button type="button" variant="secondary" size="sm" onClick={onClose}>Cancel</Button><Button type="submit" size="sm" isLoading={saving} disabled={!provider || !orderIds.trim()}>Queue Creation</Button></div></form></div>;
}

function ShipmentDrawer({ shipment, canEdit, onClose, onChanged }: { shipment: CourierShipment | null; canEdit: boolean; onClose: () => void; onChanged: (shipment: CourierShipment) => void }) {
  const [busy, setBusy] = React.useState<"sync" | "cancel" | null>(null);
  const { confirmDelete, deleteConfirmationDialog } = useDeleteConfirmation();
  React.useEffect(() => {
    if (!shipment) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, shipment]);
  if (!shipment) return null;
  const currentShipment = shipment;

  async function action(type: "sync" | "cancel") {
    try {
      setBusy(type);
      const response = type === "sync" ? await courierService.sync(currentShipment.id) : await courierService.cancel(currentShipment.id);
      onChanged(response.data.shipment);
      toast.success(response.message);
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setBusy(null);
    }
  }

  return <><div className="fixed inset-0 z-[90]"><button type="button" className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Close shipment details" /><aside className="absolute bottom-0 right-0 top-0 flex w-full max-w-2xl flex-col border-l border-border bg-background shadow-2xl"><div className="flex items-start justify-between gap-4 border-b border-border p-5"><div><h2 className="text-lg font-bold">{shipment.orderNumber}</h2><p className="mt-1 text-sm text-muted-foreground">{shipment.providerLabel} shipment details and activity.</p></div><Button variant="ghost" size="icon" icon={<X className="h-4 w-4" />} aria-label="Close shipment details" onClick={onClose} /></div><div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5"><div className="flex flex-wrap gap-2">{canEdit && shipment.capabilities.remote_status ? <Button size="sm" variant="secondary" icon={<RefreshCw className="h-4 w-4" />} isLoading={busy === "sync"} onClick={() => void action("sync")}>Sync Status</Button> : null}{canEdit && shipment.capabilities.cancel && !["delivered", "returned", "cancelled"].includes(shipment.status) ? <Button size="sm" variant="danger" isLoading={busy === "cancel"} onClick={() => confirmDelete({ title: "Cancel Courier Shipment", message: "Cancel this shipment with the courier provider? This action may not be reversible.", onConfirm: () => action("cancel") })}>Cancel Shipment</Button> : null}{shipment.trackingUrl ? <a href={shipment.trackingUrl} target="_blank" rel="noreferrer"><Button size="sm" variant="secondary" icon={<ExternalLink className="h-4 w-4" />}>Track Parcel</Button></a> : null}</div><DetailGrid shipment={shipment} /><section><h3 className="font-bold">Tracking Timeline</h3><div className="mt-3 space-y-3">{shipment.events?.length ? shipment.events.map((event) => <div key={event.id} className="border-l-2 border-primary/40 pl-3"><p className="font-semibold">{event.title}</p><p className="text-xs text-muted-foreground">{formatDate(event.occurredAt)}</p>{event.description ? <p className="mt-1 text-sm text-muted-foreground">{event.description}</p> : null}</div>) : <p className="text-sm text-muted-foreground">No courier events recorded.</p>}</div></section>{shipment.apiLogs ? <section><h3 className="font-bold">Courier Response Logs</h3><div className="mt-3 space-y-3">{shipment.apiLogs.map((log) => <details key={log.id} className="rounded-lg border border-border bg-muted/20 p-3"><summary className="cursor-pointer text-sm font-semibold">{log.method} {log.operation} · {log.httpStatus ?? "Network"} · {log.executionTimeMs}ms</summary>{log.errorMessage ? <p className="mt-2 text-sm text-destructive">{log.errorMessage}</p> : null}<pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted p-3 text-xs">{JSON.stringify({ request: log.requestPayload, response: log.responsePayload }, null, 2)}</pre></details>)}</div></section> : null}</div></aside></div>{deleteConfirmationDialog}</>;
}

function DetailGrid({ shipment }: { shipment: CourierShipment }) {
  const rows = [
    ["Courier Provider", shipment.providerLabel],
    ["Tracking Number", shipment.trackingNumber],
    ["Consignment / Order ID", shipment.externalId],
    ["Shipment Status", statusLabel(shipment.status)],
    ["Delivery Status", statusLabel(shipment.deliveryStatus)],
    ["COD Status", statusLabel(shipment.codStatus)],
    ["Delivery Charge", shipment.deliveryCharge === null ? null : formatPrice(shipment.deliveryCharge)],
    ["Amount to Collect", formatPrice(shipment.amountToCollect)],
    ["Parcel Weight", `${shipment.weight} kg`],
    ["Shipment Created", formatDate(shipment.shipmentCreatedAt)],
    ["Last Synced", formatDate(shipment.lastSyncedAt)],
  ];
  return <div className="divide-y divide-border rounded-lg border border-border">{rows.map(([label, value]) => <div key={label} className="grid gap-1 px-4 py-3 sm:grid-cols-3"><span className="text-xs font-bold uppercase text-muted-foreground">{label}</span><span className="text-sm font-medium sm:col-span-2">{value || "Not available"}</span></div>)}{shipment.lastError ? <div className="px-4 py-3 text-sm text-destructive">{shipment.lastError}</div> : null}</div>;
}
