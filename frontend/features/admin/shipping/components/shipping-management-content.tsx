"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { ChevronLeft, ChevronRight, ChevronsUpDown, Download, Edit3, Eye, Filter, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableSkeleton } from "@/components/ui/skeleton";
import { useDeleteConfirmation } from "@/hooks/use-delete-confirmation";
import { useUrlQueryState } from "@/features/admin/shared/hooks/use-url-query-state";
import type { PaginationMeta } from "@/features/admin/shared/types";
import { exportCsv, formatDate, statusLabel } from "@/features/admin/shared/utils";
import { shippingService } from "@/features/admin/shipping/services/shipping-service";
import type { ShippingMethod, ShippingMethodPayload, ShippingStatus, ShippingZone, ShippingZonePayload } from "@/features/admin/shipping/types";
import { toAppError } from "@/lib/errors";
import { hasPermission } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/utils/cn";

const statuses: ShippingStatus[] = ["active", "inactive"];
const pageSizes = [10, 20, 50, 100];
type DrawerMode = "create" | "edit" | "view";

type Column<T> = {
  key: string;
  label: string;
  sortable?: boolean;
  sortKey?: string;
  className?: string;
  render: (item: T) => ReactNode;
};

function Drawer({ title, description, open, children, onClose }: { title: string; description: string; open: boolean; children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose, open]);

  return (
    <div className={cn("fixed inset-0 z-[70] transition", open ? "pointer-events-auto" : "pointer-events-none")} aria-hidden={!open}>
      <button className={cn("absolute inset-0 bg-black/50 transition-opacity", open ? "opacity-100" : "opacity-0")} onClick={onClose} aria-label="Close drawer backdrop" type="button" />
      <aside className={cn("absolute bottom-0 right-0 top-0 flex w-full max-w-xl flex-col border-l border-border bg-background shadow-2xl transition-transform duration-300 sm:w-[34rem]", open ? "translate-x-0" : "translate-x-full")} role="dialog" aria-modal="true">
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <h2 className="text-lg font-bold">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          <Button variant="ghost" size="icon" icon={<X className="h-4 w-4" />} aria-label="Close drawer" onClick={onClose} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
      </aside>
    </div>
  );
}

function FilterModal({ open, status, zoneId, zones, showZones, onClose, onApply }: { open: boolean; status: string; zoneId: string; zones: ShippingZone[]; showZones: boolean; onClose: () => void; onApply: (values: { status: string; shipping_zone_id: string }) => void }) {
  const [draft, setDraft] = useState({ status, shipping_zone_id: zoneId });

  useEffect(() => {
    setDraft({ status, shipping_zone_id: zoneId });
  }, [open, status, zoneId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Close filters" type="button" />
      <div className="relative w-full max-w-2xl rounded-lg border border-border bg-background p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">Advanced Filter</h2>
            <p className="mt-1 text-sm text-muted-foreground">Refine shipping records by status and zone.</p>
          </div>
          <Button variant="ghost" size="icon" icon={<X className="h-4 w-4" />} aria-label="Close filters" onClick={onClose} />
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm font-semibold">
            <span>Status</span>
            <Select value={draft.status || "all"} onValueChange={(value) => setDraft((current) => ({ ...current, status: value === "all" ? "" : value }))}>
              <SelectTrigger className="h-11 rounded-lg px-3 text-sm"><SelectValue placeholder="Any status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any status</SelectItem>
                {statuses.map((item) => <SelectItem key={item} value={item}>{statusLabel(item)}</SelectItem>)}
              </SelectContent>
            </Select>
          </label>
          {showZones ? (
            <label className="space-y-2 text-sm font-semibold">
              <span>Shipping Zone</span>
              <Select value={draft.shipping_zone_id || "all"} onValueChange={(value) => setDraft((current) => ({ ...current, shipping_zone_id: value === "all" ? "" : value }))}>
                <SelectTrigger className="h-11 rounded-lg px-3 text-sm"><SelectValue placeholder="Any zone" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any zone</SelectItem>
                  {zones.map((zone) => <SelectItem key={zone.id} value={String(zone.id)}>{zone.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </label>
          ) : null}
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button size="sm" variant="secondary" onClick={() => setDraft({ status: "", shipping_zone_id: "" })}>Reset Filters</Button>
          <Button size="sm" onClick={() => onApply(draft)}>Apply Filters</Button>
        </div>
      </div>
    </div>
  );
}

function ManagementPage<T extends { id: number }>({ title, description, createLabel, data, pagination, columns, loading, selected, sort, search, status, zoneId, zones, showZones, onSort, onSearch, onFilter, onPage, onPerPage, onToggle, onToggleAll, onCreate, onView, onEdit, onDelete, onBulkDelete, onExport, canCreate = true, canEdit = true, canDelete = true }: {
  title: string;
  description: string;
  createLabel: string;
  data: T[];
  pagination: PaginationMeta | null;
  columns: Column<T>[];
  loading: boolean;
  selected: number[];
  sort: string;
  search: string;
  status: string;
  zoneId: string;
  zones: ShippingZone[];
  showZones: boolean;
  onSort: (key: string) => void;
  onSearch: (value: string) => void;
  onFilter: (value: { status: string; shipping_zone_id: string }) => void;
  onPage: (page: number) => void;
  onPerPage: (value: number) => void;
  onToggle: (id: number) => void;
  onToggleAll: () => void;
  onCreate: () => void;
  onView: (item: T) => void;
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
  onBulkDelete: () => void;
  onExport: () => void;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}) {
  const [searchInput, setSearchInput] = useState(search);
  const [filterOpen, setFilterOpen] = useState(false);
  const allSelected = data.length > 0 && data.every((item) => selected.includes(item.id));
  const page = pagination?.current_page ?? 1;
  const lastPage = pagination?.last_page ?? 1;

  useEffect(() => setSearchInput(search), [search]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>Dashboard</span><ChevronRight className="h-4 w-4" /><span>Settings</span><ChevronRight className="h-4 w-4" /><span className="font-medium text-foreground">{title}</span>
      </div>

      <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {canCreate ? <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={onCreate}>{createLabel}</Button> : null}
      </section>

      <section className="rounded-lg border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
          <form className="flex min-w-0 flex-1 gap-2" onSubmit={(event) => { event.preventDefault(); onSearch(searchInput); }}>
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search records..." className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none transition focus:border-primary" />
            </div>
            <Button size="sm" type="submit">Search</Button>
          </form>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" icon={<Filter className="h-4 w-4" />} onClick={() => setFilterOpen(true)}>Filter</Button>
            <Button variant="secondary" size="sm" icon={<Download className="h-4 w-4" />} disabled={!selected.length} onClick={onExport}>Export</Button>
            {canDelete ? <Button variant="danger" size="sm" icon={<Trash2 className="h-4 w-4" />} disabled={!selected.length} onClick={onBulkDelete}>Delete Selected</Button> : null}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="w-10 px-4 py-3"><input type="checkbox" checked={allSelected} onChange={onToggleAll} aria-label="Select all rows" /></th>
                {columns.map((column) => (
                  <th key={column.key} className={cn("px-4 py-3", column.className)}>
                    {column.sortable ? (
                      <button type="button" onClick={() => onSort(column.sortKey ?? column.key)} className="flex items-center gap-1 font-bold">
                        {column.label}<ChevronsUpDown className={cn("h-3.5 w-3.5", sort === (column.sortKey ?? column.key) && "text-foreground")} />
                      </button>
                    ) : column.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={pagination?.per_page ?? 10} columns={columns.length} selectable actions />
              ) : data.length ? data.map((item) => (
                <tr key={item.id} className="border-t border-border hover:bg-muted/40">
                  <td className="px-4 py-3"><input type="checkbox" checked={selected.includes(item.id)} onChange={() => onToggle(item.id)} aria-label={`Select row ${item.id}`} /></td>
                  {columns.map((column) => <td key={column.key} className={cn("px-4 py-3 align-middle", column.className)}>{column.render(item)}</td>)}
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" icon={<Eye className="h-4 w-4" />} title="View" aria-label="View" onClick={() => onView(item)} />
                      {canEdit ? <Button variant="ghost" size="icon" icon={<Edit3 className="h-4 w-4" />} title="Edit" aria-label="Edit" onClick={() => onEdit(item)} /> : null}
                      {canDelete ? <Button variant="ghost" size="icon" icon={<Trash2 className="h-4 w-4" />} title="Delete" aria-label="Delete" onClick={() => onDelete(item)} /> : null}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={columns.length + 2} className="h-48 text-center"><p className="font-semibold">No records found</p><p className="mt-1 text-sm text-muted-foreground">Try changing filters or create a new record.</p></td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">Total Records: <span className="font-semibold text-foreground">{pagination?.total ?? 0}</span></p>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={String(pagination?.per_page ?? 10)} onValueChange={(value) => onPerPage(Number(value))}>
              <SelectTrigger className="h-9 w-[110px] rounded-lg px-2 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{pageSizes.map((size) => <SelectItem key={size} value={String(size)}>{size} / page</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="secondary" size="sm" icon={<ChevronLeft className="h-4 w-4" />} disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button>
            {Array.from({ length: Math.min(lastPage, 5) }, (_, index) => {
              const start = Math.max(1, Math.min(page - 2, lastPage - 4));
              const pageNumber = start + index;
              if (pageNumber > lastPage) return null;
              return <Button key={pageNumber} variant={pageNumber === page ? "primary" : "secondary"} size="sm" onClick={() => onPage(pageNumber)}>{pageNumber}</Button>;
            })}
            <Button variant="secondary" size="sm" icon={<ChevronRight className="h-4 w-4" />} disabled={page >= lastPage} onClick={() => onPage(page + 1)}>Next</Button>
          </div>
        </div>
      </section>

      <FilterModal open={filterOpen} status={status} zoneId={zoneId} zones={zones} showZones={showZones} onClose={() => setFilterOpen(false)} onApply={(value) => { onFilter(value); setFilterOpen(false); }} />
    </div>
  );
}

function StatusBadge({ status }: { status: ShippingStatus }) {
  return <span className="rounded-full border border-border px-2 py-1 text-xs font-bold">{statusLabel(status)}</span>;
}

function DetailRows({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <div className="divide-y divide-border rounded-lg border border-border">
      {rows.map(([label, value]) => (
        <div key={label} className="grid gap-1 px-4 py-3 sm:grid-cols-3">
          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
          <div className="text-sm font-medium sm:col-span-2">{value || <span className="text-muted-foreground">Not set</span>}</div>
        </div>
      ))}
    </div>
  );
}

function ZoneDetails({ zone }: { zone: ShippingZone }) {
  return (
    <DetailRows rows={[
      ["Zone Name", zone.name],
      ["Countries", zone.countries.join(", ") || "All countries"],
      ["Methods", zone.methods_count],
      ["Status", <StatusBadge key="status" status={zone.status} />],
      ["Description", zone.description],
      ["Created At", formatDate(zone.created_at)],
    ]} />
  );
}

function MethodDetails({ method }: { method: ShippingMethod }) {
  return (
    <DetailRows rows={[
      ["Method Name", method.name],
      ["Shipping Zone", method.shipping_zone?.name],
      ["Delivery Time", method.delivery_time],
      ["Shipping Cost", method.free_shipping ? "Free" : method.shipping_cost.toFixed(2)],
      ["Free Shipping", method.free_shipping ? "Yes" : "No"],
      ["Minimum Order", method.minimum_order_amount ? method.minimum_order_amount.toFixed(2) : "Not required"],
      ["Status", <StatusBadge key="status" status={method.status} />],
      ["Description", method.description],
      ["Created At", formatDate(method.created_at)],
    ]} />
  );
}

function ZoneForm({ zone, mode, onCancel, onSubmit }: { zone?: ShippingZone | null; mode: DrawerMode; onCancel: () => void; onSubmit: (values: ShippingZonePayload) => Promise<void> }) {
  const [values, setValues] = useState({
    name: zone?.name ?? "",
    countries: zone?.countries.join(", ") ?? "Bangladesh",
    description: zone?.description ?? "",
    status: zone?.status ?? "active",
    display_order: String(zone?.display_order ?? 0),
  });
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        name: values.name,
        countries: values.countries.split(",").map((item) => item.trim()).filter(Boolean),
        description: values.description || null,
        status: values.status === "active",
        display_order: Number(values.display_order || 0),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <Input label="Zone Name" className="h-10 rounded-lg" value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} required />
      <Input label="Supported Countries" className="h-10 rounded-lg" value={values.countries} onChange={(event) => setValues({ ...values, countries: event.target.value })} required />
      <Input label="Description" className="h-10 rounded-lg" value={values.description} onChange={(event) => setValues({ ...values, description: event.target.value })} />
      <Input label="Display Order" type="number" min={0} className="h-10 rounded-lg" value={values.display_order} onChange={(event) => setValues({ ...values, display_order: event.target.value })} />
      <label className="block space-y-1.5 text-sm font-semibold">
        <span>Status</span>
        <Select value={values.status} onValueChange={(status) => setValues({ ...values, status: status as ShippingStatus })}>
          <SelectTrigger className="h-10 rounded-lg px-3 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>{statuses.map((status) => <SelectItem key={status} value={status}>{statusLabel(status)}</SelectItem>)}</SelectContent>
        </Select>
      </label>
      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" isLoading={saving}>{mode === "create" ? "Create Zone" : "Save Changes"}</Button>
        <Button type="button" size="sm" variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

function MethodForm({ method, zones, mode, onCancel, onSubmit }: { method?: ShippingMethod | null; zones: ShippingZone[]; mode: DrawerMode; onCancel: () => void; onSubmit: (values: ShippingMethodPayload) => Promise<void> }) {
  const [values, setValues] = useState({
    shipping_zone_id: String(method?.shipping_zone_id ?? zones[0]?.id ?? ""),
    name: method?.name ?? "",
    delivery_time: method?.delivery_time ?? "",
    shipping_cost: String(method?.shipping_cost ?? 0),
    free_shipping: method?.free_shipping ?? false,
    minimum_order_amount: String(method?.minimum_order_amount ?? 0),
    status: method?.status ?? "active",
    display_order: String(method?.display_order ?? 0),
    description: method?.description ?? "",
  });
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        shipping_zone_id: Number(values.shipping_zone_id),
        name: values.name,
        delivery_time: values.delivery_time || null,
        shipping_cost: Number(values.shipping_cost || 0),
        free_shipping: values.free_shipping,
        minimum_order_amount: Number(values.minimum_order_amount || 0),
        status: values.status === "active",
        display_order: Number(values.display_order || 0),
        description: values.description || null,
        delivery_type: values.free_shipping ? "free_shipping" : "flat_rate",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <label className="block space-y-1.5 text-sm font-semibold">
        <span>Shipping Zone</span>
        <Select value={values.shipping_zone_id} onValueChange={(shipping_zone_id) => setValues({ ...values, shipping_zone_id })}>
          <SelectTrigger className="h-10 rounded-lg px-3 text-sm"><SelectValue placeholder="Select zone" /></SelectTrigger>
          <SelectContent>{zones.map((zone) => <SelectItem key={zone.id} value={String(zone.id)}>{zone.name}</SelectItem>)}</SelectContent>
        </Select>
      </label>
      <Input label="Method Name" className="h-10 rounded-lg" value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} required />
      <Input label="Delivery Time" className="h-10 rounded-lg" value={values.delivery_time} onChange={(event) => setValues({ ...values, delivery_time: event.target.value })} />
      <Input label="Shipping Cost" type="number" min={0} step="0.01" className="h-10 rounded-lg" value={values.shipping_cost} onChange={(event) => setValues({ ...values, shipping_cost: event.target.value })} disabled={values.free_shipping} />
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" className="h-4 w-4 rounded border-border" checked={values.free_shipping} onChange={(event) => setValues({ ...values, free_shipping: event.target.checked, shipping_cost: event.target.checked ? "0" : values.shipping_cost })} />
        Free Shipping
      </label>
      {values.free_shipping ? (
        <Input label="Minimum Order Amount" type="number" min={0} step="0.01" className="h-10 rounded-lg" value={values.minimum_order_amount} onChange={(event) => setValues({ ...values, minimum_order_amount: event.target.value })} />
      ) : null}
      <Input label="Description" className="h-10 rounded-lg" value={values.description} onChange={(event) => setValues({ ...values, description: event.target.value })} />
      <Input label="Display Order" type="number" min={0} className="h-10 rounded-lg" value={values.display_order} onChange={(event) => setValues({ ...values, display_order: event.target.value })} />
      <label className="block space-y-1.5 text-sm font-semibold">
        <span>Status</span>
        <Select value={values.status} onValueChange={(status) => setValues({ ...values, status: status as ShippingStatus })}>
          <SelectTrigger className="h-10 rounded-lg px-3 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>{statuses.map((status) => <SelectItem key={status} value={status}>{statusLabel(status)}</SelectItem>)}</SelectContent>
        </Select>
      </label>
      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" isLoading={saving} disabled={!zones.length}>{mode === "create" ? "Create Method" : "Save Changes"}</Button>
        <Button type="button" size="sm" variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

export function ShippingZonesContent() {
  const { query, setQuery } = useUrlQueryState("created_at");
  const [items, setItems] = useState<ShippingZone[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number[]>([]);
  const [drawer, setDrawer] = useState<{ open: boolean; mode: DrawerMode; item: ShippingZone | null }>({ open: false, mode: "create", item: null });
  const { confirmDelete, deleteConfirmationDialog } = useDeleteConfirmation();
  useAuthStore((state) => state.user?.permissions);
  const canCreate = hasPermission("can_create_shipping_zone");
  const canEdit = hasPermission("can_edit_shipping_zone");
  const canDelete = hasPermission("can_delete_shipping_zone");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await shippingService.zones(query);
      setItems(response.data.zones);
      setPagination(response.meta.pagination ?? null);
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => { void load(); }, [load]);

  const columns = useMemo<Column<ShippingZone>[]>(() => [
    { key: "name", label: "Zone Name", sortable: true, render: (zone) => <span className="font-semibold">{zone.name}</span> },
    { key: "countries", label: "Countries", render: (zone) => <span>{zone.countries.join(", ") || "All countries"}</span> },
    { key: "methods_count", label: "Methods", render: (zone) => zone.methods_count },
    { key: "status", label: "Status", sortable: true, render: (zone) => <StatusBadge status={zone.status} /> },
    { key: "created_at", label: "Created At", sortable: true, render: (zone) => formatDate(zone.created_at) },
  ], []);

  async function submit(values: ShippingZonePayload) {
    try {
      if (drawer.mode === "create") {
        await shippingService.createZone(values);
        toast.success("Shipping zone created successfully.");
      } else if (drawer.item) {
        await shippingService.updateZone(drawer.item.id, values);
        toast.success("Shipping zone updated successfully.");
      }
      setDrawer({ open: false, mode: "create", item: null });
      await load();
    } catch (error) {
      toast.error(toAppError(error).message);
    }
  }

  return (
    <>
      <ManagementPage
        title="Shipping Zones"
        description="Manage supported delivery countries and shipping zones."
        createLabel="Create Zone"
        data={items}
        pagination={pagination}
        columns={columns}
        loading={loading}
        selected={selected}
        sort={query.sort}
        search={query.search}
        status={query.status}
        zoneId=""
        zones={[]}
        showZones={false}
        onSort={(key) => setQuery({ sort: key, direction: query.sort === key && query.direction === "asc" ? "desc" : "asc", page: 1 })}
        onSearch={(value) => setQuery({ search: value, page: 1 })}
        onFilter={(value) => setQuery({ status: value.status, page: 1 })}
        onPage={(value) => setQuery({ page: value })}
        onPerPage={(value) => setQuery({ per_page: value, page: 1 })}
        onToggle={(id) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])}
        onToggleAll={() => setSelected((current) => items.every((item) => current.includes(item.id)) ? [] : items.map((item) => item.id))}
        onCreate={() => setDrawer({ open: true, mode: "create", item: null })}
        onView={(item) => setDrawer({ open: true, mode: "view", item })}
        onEdit={(item) => setDrawer({ open: true, mode: "edit", item })}
        onDelete={(item) => confirmDelete({ title: "Confirm Deletion", onConfirm: async () => { await shippingService.deleteZone(item.id); toast.success("Shipping zone deleted."); await load(); } })}
        onBulkDelete={() => confirmDelete({ title: "Confirm Deletion", onConfirm: async () => { await shippingService.bulkDeleteZones(selected); setSelected([]); toast.success("Selected shipping zones deleted."); await load(); } })}
        onExport={() => exportCsv("shipping-zones.csv", items.filter((item) => selected.includes(item.id)).map((zone) => ({ name: zone.name, countries: zone.countries.join("; "), status: zone.status, methods: zone.methods_count })))}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
      />
      {deleteConfirmationDialog}
      <Drawer open={drawer.open} title={drawer.mode === "create" ? "Create Shipping Zone" : drawer.mode === "view" ? "Shipping Zone Details" : "Edit Shipping Zone"} description="Define delivery coverage by country." onClose={() => setDrawer({ open: false, mode: "create", item: null })}>
        {drawer.mode === "view" && drawer.item ? (
          <ZoneDetails zone={drawer.item} />
        ) : (
          <ZoneForm key={drawer.item?.id ?? "create"} mode={drawer.mode} zone={drawer.item} onCancel={() => setDrawer({ open: false, mode: "create", item: null })} onSubmit={submit} />
        )}
      </Drawer>
    </>
  );
}

export function ShippingMethodsContent() {
  const { query, setQuery } = useUrlQueryState("created_at");
  const [items, setItems] = useState<ShippingMethod[]>([]);
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number[]>([]);
  const [drawer, setDrawer] = useState<{ open: boolean; mode: DrawerMode; item: ShippingMethod | null }>({ open: false, mode: "create", item: null });
  const { confirmDelete, deleteConfirmationDialog } = useDeleteConfirmation();
  useAuthStore((state) => state.user?.permissions);
  const canCreate = hasPermission("can_create_shipping_method");
  const canEdit = hasPermission("can_edit_shipping_method");
  const canDelete = hasPermission("can_delete_shipping_method");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await shippingService.methods({ ...query, shipping_zone_id: query.role });
      setItems(response.data.methods);
      setZones(response.data.zones);
      setPagination(response.meta.pagination ?? null);
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => { void load(); }, [load]);

  const columns = useMemo<Column<ShippingMethod>[]>(() => [
    { key: "name", label: "Method Name", sortable: true, render: (method) => <span className="font-semibold">{method.name}</span> },
    { key: "shipping_zone_id", label: "Shipping Zone", sortable: true, render: (method) => method.shipping_zone?.name ?? "Not assigned" },
    { key: "delivery_time", label: "Delivery Time", render: (method) => method.delivery_time || "Not set" },
    { key: "rate_cents", label: "Shipping Cost", sortable: true, render: (method) => method.free_shipping ? "Free" : method.shipping_cost.toFixed(2) },
    { key: "status", label: "Status", sortable: true, render: (method) => <StatusBadge status={method.status} /> },
    { key: "created_at", label: "Created At", sortable: true, render: (method) => formatDate(method.created_at) },
  ], []);

  async function submit(values: ShippingMethodPayload) {
    try {
      if (drawer.mode === "create") {
        await shippingService.createMethod(values);
        toast.success("Shipping method created successfully.");
      } else if (drawer.item) {
        await shippingService.updateMethod(drawer.item.id, values);
        toast.success("Shipping method updated successfully.");
      }
      setDrawer({ open: false, mode: "create", item: null });
      await load();
    } catch (error) {
      toast.error(toAppError(error).message);
    }
  }

  return (
    <>
      <ManagementPage
        title="Shipping Methods"
        description="Manage delivery methods, costs, free shipping, and active status."
        createLabel="Create Method"
        data={items}
        pagination={pagination}
        columns={columns}
        loading={loading}
        selected={selected}
        sort={query.sort}
        search={query.search}
        status={query.status}
        zoneId={query.role}
        zones={zones}
        showZones
        onSort={(key) => setQuery({ sort: key, direction: query.sort === key && query.direction === "asc" ? "desc" : "asc", page: 1 })}
        onSearch={(value) => setQuery({ search: value, page: 1 })}
        onFilter={(value) => setQuery({ status: value.status, role: value.shipping_zone_id, page: 1 })}
        onPage={(value) => setQuery({ page: value })}
        onPerPage={(value) => setQuery({ per_page: value, page: 1 })}
        onToggle={(id) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])}
        onToggleAll={() => setSelected((current) => items.every((item) => current.includes(item.id)) ? [] : items.map((item) => item.id))}
        onCreate={() => setDrawer({ open: true, mode: "create", item: null })}
        onView={(item) => setDrawer({ open: true, mode: "view", item })}
        onEdit={(item) => setDrawer({ open: true, mode: "edit", item })}
        onDelete={(item) => confirmDelete({ title: "Confirm Deletion", onConfirm: async () => { await shippingService.deleteMethod(item.id); toast.success("Shipping method deleted."); await load(); } })}
        onBulkDelete={() => confirmDelete({ title: "Confirm Deletion", onConfirm: async () => { await shippingService.bulkDeleteMethods(selected); setSelected([]); toast.success("Selected shipping methods deleted."); await load(); } })}
        onExport={() => exportCsv("shipping-methods.csv", items.filter((item) => selected.includes(item.id)).map((method) => ({ name: method.name, zone: method.shipping_zone?.name ?? "", cost: method.shipping_cost, status: method.status })))}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
      />
      {deleteConfirmationDialog}
      <Drawer open={drawer.open} title={drawer.mode === "create" ? "Create Shipping Method" : drawer.mode === "view" ? "Shipping Method Details" : "Edit Shipping Method"} description="Assign this method to one shipping zone." onClose={() => setDrawer({ open: false, mode: "create", item: null })}>
        {drawer.mode === "view" && drawer.item ? (
          <MethodDetails method={drawer.item} />
        ) : (
          <MethodForm key={drawer.item?.id ?? `create-${zones.length}`} mode={drawer.mode} method={drawer.item} zones={zones} onCancel={() => setDrawer({ open: false, mode: "create", item: null })} onSubmit={submit} />
        )}
      </Drawer>
    </>
  );
}
