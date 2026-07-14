"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ChevronsUpDown, Download, Eye, Filter, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { orderManagementService } from "@/features/admin/orders/services/order-management-service";
import { useUrlQueryState } from "@/features/admin/shared/hooks/use-url-query-state";
import type { PaginationMeta } from "@/features/admin/shared/types";
import type { OrderDetail, OrderListItem } from "@/services/order-service";
import { toAppError } from "@/lib/errors";
import { hasPermission } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth-store";
import { formatPrice } from "@/utils/format";
import { cn } from "@/utils/cn";

const orderStatuses = ["", "pending", "confirmed", "processing", "packed", "ready_for_shipment", "shipped", "out_for_delivery", "delivered", "cancelled", "refunded"];
const paymentStatuses = ["", "pending", "paid", "failed", "cancelled", "refunded", "partially_refunded"];
const shippingStatuses = ["", "pending", "processing", "shipped", "delivered", "returned"];
const paymentMethods = ["", "cash_on_delivery", "bkash", "nagad", "sslcommerz", "stripe", "paypal"];
const pageSizes = [10, 20, 50, 100];

function label(value: string) {
  return value ? value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase()) : "Any";
}

function dateLabel(value?: string | null) {
  return value ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value)) : "Not set";
}

export function OrderManagementContent() {
  const { query, setQuery } = useUrlQueryState("created_at");
  const [items, setItems] = useState<OrderListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(query.search);
  useAuthStore((state) => state.user?.permissions);
  const canEditOrder = hasPermission("can_edit_order");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await orderManagementService.list({
        page: query.page,
        per_page: query.per_page,
        search: query.search,
        sort: query.sort,
        direction: query.direction,
        status: query.status,
        payment_status: query.payment_status,
        shipping_status: query.shipping_status,
        payment_method: query.payment_method,
        shipping_method: query.shipping_method,
        date_from: query.date_from,
        date_to: query.date_to,
        amount_min: query.amount_min,
        amount_max: query.amount_max,
      });
      setItems(response.data.orders);
      setPagination(response.meta.pagination ?? null);
      setSelected([]);
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setLoading(false);
    }
  }, [query.amount_max, query.amount_min, query.date_from, query.date_to, query.direction, query.page, query.payment_method, query.payment_status, query.per_page, query.search, query.shipping_method, query.shipping_status, query.sort, query.status]);

  useEffect(() => { void load(); }, [load]);

  const rows = useMemo(() => items, [items]);
  const allSelected = rows.length > 0 && rows.every((order) => selected.includes(order.id));
  const page = pagination?.current_page ?? 1;
  const lastPage = pagination?.last_page ?? 1;

  useEffect(() => {
    setSearchInput(query.search);
  }, [query.search]);

  function sortBy(key: string) {
    setQuery({
      sort: key,
      direction: query.sort === key && query.direction === "asc" ? "desc" : "asc",
      page: 1,
    });
  }

  async function applyBulkUpdate() {
    if (!selected.length || !bulkStatus) return;
    try {
      await orderManagementService.bulkUpdate({ ids: selected, status: bulkStatus, note: "Bulk status update from admin order list." });
      toast.success("Selected orders updated.");
      await load();
    } catch (error) {
      toast.error(toAppError(error).message);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>Dashboard</span>
        <ChevronRight className="h-4 w-4" />
        <span>Orders</span>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-foreground">Order Management</span>
      </div>

      <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Order Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">Track orders, payments, shipping status, and customer lifecycle events.</p>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-3">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && setQuery({ search: searchInput, page: 1 })}
              placeholder="Search..."
              className="h-9 min-w-0 flex-1 bg-transparent text-sm"
            />
          </div>
          <Button size="sm" variant="secondary" icon={<Search className="h-4 w-4" />} onClick={() => setQuery({ search: searchInput, page: 1 })}>Search</Button>
          <Button size="sm" variant="secondary" icon={<Filter className="h-4 w-4" />} onClick={() => setFilterOpen(true)}>Advanced Filter</Button>
        </div>
      </section>

      {selected.length && canEditOrder ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3 text-foreground sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold">{selected.length} selected</p>
          <div className="flex flex-wrap gap-2">
            <Select value={bulkStatus || "none"} onValueChange={(value) => setBulkStatus(value === "none" ? "" : value)}>
              <SelectTrigger className="h-10 w-[180px] rounded-lg border-border bg-background px-3 text-sm text-foreground"><SelectValue placeholder="Select status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Bulk status</SelectItem>
                {orderStatuses.filter(Boolean).map((status) => <SelectItem key={status} value={status}>{label(status)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" variant="secondary" disabled={!bulkStatus} onClick={applyBulkUpdate}>Apply Bulk</Button>
          </div>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-muted text-xs uppercase text-muted-foreground">
              <tr>
                <th className="w-12 px-4 py-3"><input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? [] : rows.map((order) => order.id))} aria-label="Select all orders" /></th>
                <SortableHead label="Order" sortKey="order_number" activeSort={query.sort} onSort={sortBy} />
                <th className="px-4 py-3 font-bold">Customer</th>
                <SortableHead label="Total" sortKey="total_cents" activeSort={query.sort} onSort={sortBy} />
                <SortableHead label="Payment" sortKey="payment_status" activeSort={query.sort} onSort={sortBy} />
                <SortableHead label="Order Status" sortKey="status" activeSort={query.sort} onSort={sortBy} />
                <SortableHead label="Shipping" sortKey="shipping_method_name" activeSort={query.sort} onSort={sortBy} />
                <SortableHead label="Date" sortKey="placed_at" activeSort={query.sort} onSort={sortBy} />
                <th className="w-28 px-4 py-3 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <OrderTableSkeleton />
              ) : rows.length ? rows.map((order) => (
                <tr key={order.id} className="border-t border-border hover:bg-muted/40">
                  <td className="px-4 py-3"><input type="checkbox" checked={selected.includes(order.id)} onChange={() => setSelected((current) => current.includes(order.id) ? current.filter((id) => id !== order.id) : [...current, order.id])} aria-label={`Select ${order.orderNumber}`} /></td>
                  <td className="px-4 py-3 font-semibold">{order.orderNumber}</td>
                  <td className="px-4 py-3">{order.customer?.name ?? "Guest"}<p className="text-xs text-muted-foreground">{order.customer?.email}</p></td>
                  <td className="px-4 py-3 font-semibold">{formatPrice(order.summary.total)}</td>
                  <td className="px-4 py-3 capitalize">{order.paymentMethod.replaceAll("_", " ")}<p className="text-xs text-muted-foreground">{label(order.paymentStatus)}</p></td>
                  <td className="px-4 py-3"><span className="rounded-full border border-border px-2 py-1 text-xs font-bold">{label(order.status)}</span></td>
                  <td className="px-4 py-3">{order.shippingMethod ?? "Not set"}</td>
                  <td className="px-4 py-3">{dateLabel(order.placedAt)}</td>
                  <td className="px-4 py-3 text-right"><Link href={`/admin/orders/${order.orderNumber}`}><Button size="icon" variant="ghost" icon={<Eye className="h-4 w-4" />} title="View" aria-label={`View ${order.orderNumber}`} /></Link></td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={9} className="h-48 text-center">
                    <div className="mx-auto max-w-sm">
                      <p className="font-semibold">No records found</p>
                      <p className="mt-1 text-sm text-muted-foreground">Try changing filters or wait for new checkout orders.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">Total Records: <span className="font-semibold text-foreground">{pagination?.total ?? 0}</span></p>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={String(pagination?.per_page ?? query.per_page)} onValueChange={(value) => setQuery({ per_page: Number(value), page: 1 })}>
              <SelectTrigger className="h-9 w-[110px] rounded-lg px-2 text-sm" aria-label="Rows per page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizes.map((size) => <SelectItem key={size} value={String(size)}>{size} / page</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="secondary" size="sm" icon={<ChevronLeft className="h-4 w-4" />} disabled={page <= 1} onClick={() => setQuery({ page: page - 1 })}>Previous</Button>
            {Array.from({ length: Math.min(lastPage, 5) }, (_, index) => {
              const start = Math.max(1, Math.min(page - 2, lastPage - 4));
              const pageNumber = start + index;
              if (pageNumber > lastPage) return null;
              return <Button key={pageNumber} size="sm" variant={pageNumber === page ? "primary" : "secondary"} onClick={() => setQuery({ page: pageNumber })}>{pageNumber}</Button>;
            })}
            <Button variant="secondary" size="sm" icon={<ChevronRight className="h-4 w-4" />} disabled={page >= lastPage} onClick={() => setQuery({ page: page + 1 })}>Next</Button>
          </div>
        </div>
      </section>
      <OrderFilterModal
        open={filterOpen}
        query={query}
        onClose={() => setFilterOpen(false)}
        onApply={(filters) => {
          setQuery({ ...filters, page: 1 });
          setFilterOpen(false);
        }}
      />
    </div>
  );
}

function OrderFilterModal({ open, query, onClose, onApply }: { open: boolean; query: ReturnType<typeof useUrlQueryState>["query"]; onClose: () => void; onApply: (filters: Partial<ReturnType<typeof useUrlQueryState>["query"]>) => void }) {
  const [draft, setDraft] = useState(query);
  useEffect(() => setDraft(query), [query, open]);
  if (!open) return null;

  const reset = {
    status: "",
    payment_status: "",
    shipping_status: "",
    payment_method: "",
    shipping_method: "",
    date_from: "",
    date_to: "",
    amount_min: "",
    amount_max: "",
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Close filters" type="button" />
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-border bg-background p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">Advanced Filter</h2>
            <p className="mt-1 text-sm text-muted-foreground">Refine orders by status, payment, shipping, date, and amount.</p>
          </div>
          <Button variant="ghost" size="icon" icon={<X className="h-4 w-4" />} aria-label="Close filters" onClick={onClose} />
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <CompactSelect label="Order Status" value={draft.status} options={orderStatuses.filter(Boolean)} onChange={(status) => setDraft({ ...draft, status })} />
          <CompactSelect label="Payment Status" value={draft.payment_status} options={paymentStatuses.filter(Boolean)} onChange={(payment_status) => setDraft({ ...draft, payment_status })} />
          <CompactSelect label="Shipping Status" value={draft.shipping_status} options={shippingStatuses.filter(Boolean)} onChange={(shipping_status) => setDraft({ ...draft, shipping_status })} />
          <CompactSelect label="Payment Method" value={draft.payment_method} options={paymentMethods.filter(Boolean)} onChange={(payment_method) => setDraft({ ...draft, payment_method })} />
          <CompactText label="Shipping Method" value={draft.shipping_method} placeholder="Enter shipping method" onChange={(shipping_method) => setDraft({ ...draft, shipping_method })} />
          <CompactText label="Minimum Amount" type="number" value={draft.amount_min} placeholder="Enter amount" onChange={(amount_min) => setDraft({ ...draft, amount_min })} />
          <CompactDate label="Date From" value={draft.date_from} onChange={(date_from) => setDraft({ ...draft, date_from })} />
          <CompactDate label="Date To" value={draft.date_to} onChange={(date_to) => setDraft({ ...draft, date_to })} />
          <CompactText label="Maximum Amount" type="number" value={draft.amount_max} placeholder="Enter amount" onChange={(amount_max) => setDraft({ ...draft, amount_max })} />
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button size="sm" variant="secondary" onClick={() => setDraft({ ...draft, ...reset })}>Reset Filters</Button>
          <Button size="sm" onClick={() => onApply({
            status: draft.status,
            payment_status: draft.payment_status,
            shipping_status: draft.shipping_status,
            payment_method: draft.payment_method,
            shipping_method: draft.shipping_method,
            date_from: draft.date_from,
            date_to: draft.date_to,
            amount_min: draft.amount_min,
            amount_max: draft.amount_max,
          })}>Apply Filters</Button>
        </div>
      </div>
    </div>
  );
}

function SortableHead({ label: title, sortKey, activeSort, onSort }: { label: string; sortKey: string; activeSort: string; onSort: (key: string) => void }) {
  return (
    <th className="px-4 py-3 font-bold">
      <button className="inline-flex items-center gap-1" onClick={() => onSort(sortKey)} type="button">
        {title}
        <ChevronsUpDown className={cn("h-3.5 w-3.5", activeSort === sortKey && "text-foreground")} />
      </button>
    </th>
  );
}

function OrderTableSkeleton() {
  return Array.from({ length: 6 }).map((_, rowIndex) => (
    <tr key={rowIndex} className="border-t border-border">
      {Array.from({ length: 9 }).map((__, columnIndex) => (
        <td key={columnIndex} className="px-4 py-4">
          <div className={cn("h-5 animate-pulse rounded bg-muted", columnIndex === 0 ? "w-4" : "w-full")} />
        </td>
      ))}
    </tr>
  ));
}

function CompactSelect({ label: title, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="space-y-2 text-sm font-semibold">
      <span>{title}</span>
      <Select value={value || "all"} onValueChange={(next) => onChange(next === "all" ? "" : next)}>
        <SelectTrigger className="h-11 rounded-lg px-3 text-sm"><SelectValue placeholder={`Any ${title.toLowerCase()}`} /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any {title.toLowerCase()}</SelectItem>
          {options.map((option) => <SelectItem key={option} value={option}>{label(option)}</SelectItem>)}
        </SelectContent>
      </Select>
    </label>
  );
}

function CompactText({ label: title, value, onChange, placeholder, type = "text" }: { label: string; value: string; placeholder?: string; type?: string; onChange: (value: string) => void }) {
  return (
    <label className="space-y-2 text-sm font-semibold">
      <span>{title}</span>
      <input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-primary" />
    </label>
  );
}

function CompactDate({ label: title, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <CompactText label={title} type="date" value={value} onChange={onChange} />;
}

export function AdminOrderDetailContent({ orderNumber }: { orderNumber: string }) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [timelineMeta, setTimelineMeta] = useState<PaginationMeta | null>(null);
  const [timelinePage, setTimelinePage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState<"invoice" | "slip" | null>(null);
  const [note, setNote] = useState("");
  const [refund, setRefund] = useState({ amount: "", reason: "", note: "" });
  const [shippingLog, setShippingLog] = useState({ status: "shipped", courier: "", tracking_number: "", tracking_url: "", note: "" });
  useAuthStore((state) => state.user?.permissions);
  const canEditOrder = hasPermission("can_edit_order");

  const load = useCallback(async (page = 1) => {
    try {
      const response = await orderManagementService.show(orderNumber, { timeline_page: page, timeline_per_page: 5 });
      setOrder(response.data.order);
      setNote(response.data.order.adminNotes ?? "");
      setTimelineMeta(response.meta.timeline_pagination ?? null);
      setTimelinePage(response.meta.timeline_pagination?.current_page ?? page);
    } catch (error) {
      toast.error(toAppError(error).message);
    }
  }, [orderNumber]);

  useEffect(() => { void load(1); }, [load]);

  async function update(field: "status" | "payment_status" | "shipping_status", value: string) {
    if (!order) return;
    setSaving(true);
    try {
      await orderManagementService.update(order.orderNumber, { [field]: value });
      await load(1);
      toast.success("Order updated.");
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setSaving(false);
    }
  }

  async function download(type: "invoice" | "slip") {
    if (!order) return;
    setDownloading(type);
    try {
      if (type === "invoice") {
        await orderManagementService.downloadInvoice(order.orderNumber);
      } else {
        await orderManagementService.downloadDeliverySlip(order.orderNumber);
      }
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setDownloading(null);
    }
  }

  if (!order) {
    return <div className="h-64 animate-pulse rounded-xl bg-muted" />;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{order.customer.name} · {formatPrice(order.summary.total)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <Link href="/admin/orders"><Button variant="secondary" size="sm" className="h-9 rounded-lg px-4 text-xs">Back to Orders</Button></Link>
          <Button size="sm" className="h-9 rounded-lg px-4 text-xs" icon={<Download className="h-3.5 w-3.5" />} isLoading={downloading === "invoice"} onClick={() => void download("invoice")}>Download Invoice</Button>
          <Button variant="secondary" size="sm" className="h-9 rounded-lg px-4 text-xs" icon={<Download className="h-3.5 w-3.5" />} isLoading={downloading === "slip"} onClick={() => void download("slip")}>Delivery Slip</Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <StatusControl title="Order Status" value={order.status} values={orderStatuses.filter(Boolean)} disabled={saving || !canEditOrder} onChange={(value) => update("status", value)} />
        <StatusControl title="Payment Status" value={order.paymentStatus} values={paymentStatuses.filter(Boolean)} disabled={saving || !canEditOrder} onChange={(value) => update("payment_status", value)} />
        <StatusControl title="Shipping Status" value={order.shippingStatus} values={["pending", "processing", "shipped", "delivered", "returned"]} disabled={saving || !canEditOrder} onChange={(value) => update("shipping_status", value)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Customer Information"><p className="font-semibold">{order.customer.name}</p><p className="text-sm text-muted-foreground">{order.customer.email}</p><p className="text-sm text-muted-foreground">{order.customer.phone}</p></Panel>
        <Panel title="Payment Information"><p className="capitalize">{order.payment.gateway ?? order.paymentMethod}</p><p className="text-sm text-muted-foreground">Transaction: {order.payment.transactionId ?? order.payment.paymentId ?? "Pending"}</p><p className="text-sm text-muted-foreground">Paid at: {dateLabel(order.payment.paidAt)}</p></Panel>
        <AddressPanel title="Billing Address" address={order.billingAddress} />
        <AddressPanel title="Shipping Address" address={order.shippingAddress} />
      </div>

      <Panel title="Ordered Products">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground"><tr>{["Product", "SKU", "Qty", "Unit", "Discount", "Line Total"].map((head) => <th key={head} className="py-2">{head}</th>)}</tr></thead>
            <tbody>
              {order.items.map((item) => {
                const productContent = (
                  <div className="flex items-center gap-3">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {item.image ? (
                        <Image src={item.image} alt={item.productName} fill unoptimized className="object-cover" />
                      ) : (
                        <div className="h-full w-full bg-muted" />
                      )}
                    </div>
                    <span className="font-medium transition-colors group-hover:text-primary">{item.productName}</span>
                  </div>
                );

                return (
                  <tr key={item.id} className="border-t border-border">
                    <td className="py-3">
                      {item.productSlug ? (
                        <Link href={`/products/${item.productSlug}`} className="group inline-flex">
                          {productContent}
                        </Link>
                      ) : productContent}
                    </td>
                    <td>{item.sku ?? "-"}</td>
                    <td>{item.quantity}</td>
                    <td>{formatPrice(item.unitPrice)}</td>
                    <td>{formatPrice(item.lineDiscount)}</td>
                    <td className="font-semibold">{formatPrice(item.lineSubtotal - item.lineDiscount)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Panel title="Timeline">
          <div className="space-y-3">
            {order.timeline.length ? order.timeline.map((event) => (
              <div key={event.id} className="border-l-2 border-primary/40 pl-3">
                <p className="font-semibold">{event.title}</p>
                <p className="text-xs text-muted-foreground">{dateLabel(event.createdAt)}</p>
                {event.note ? <p className="mt-1 text-sm text-muted-foreground">{event.note}</p> : null}
              </div>
            )) : <p className="text-sm text-muted-foreground">No timeline logs found.</p>}
          </div>
          {timelineMeta && timelineMeta.last_page > 1 ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <p className="text-xs text-muted-foreground">Showing {timelineMeta.from}-{timelineMeta.to} of {timelineMeta.total}</p>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" className="h-8 rounded-md px-3 text-xs" icon={<ChevronLeft className="h-3.5 w-3.5" />} disabled={timelinePage <= 1} onClick={() => void load(timelinePage - 1)}>Previous</Button>
                <span className="flex h-8 min-w-8 items-center justify-center rounded-md border border-border bg-background px-2 text-xs font-semibold">{timelinePage}</span>
                <Button variant="secondary" size="sm" className="h-8 rounded-md px-3 text-xs" icon={<ChevronRight className="h-3.5 w-3.5" />} disabled={timelinePage >= timelineMeta.last_page} onClick={() => void load(timelinePage + 1)}>Next</Button>
              </div>
            </div>
          ) : null}
        </Panel>
        <Panel title="Order Summary">
          <Summary label="Subtotal" value={order.summary.subtotal} />
          <Summary label="Discount" value={-(order.summary.itemDiscount + order.summary.couponDiscount)} />
          <Summary label="Shipping" value={order.summary.shipping} />
          <Summary label="Tax" value={order.summary.tax} />
          <Summary label="Grand Total" value={order.summary.total} strong />
        </Panel>
      </div>

      {canEditOrder ? <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Admin Notes">
          <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={6} className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
          <Button className="mt-3" size="sm" isLoading={saving} onClick={async () => {
            setSaving(true);
            try {
              await orderManagementService.update(order.orderNumber, { admin_notes: note, note: "Admin notes updated." });
              await load(timelinePage);
              toast.success("Admin notes saved.");
            } catch (error) { toast.error(toAppError(error).message); } finally { setSaving(false); }
          }}>Save Notes</Button>
        </Panel>
        <Panel title="Refund Workflow">
          <div className="space-y-3">
            <Input label="Amount" type="number" value={refund.amount} onChange={(event) => setRefund((current) => ({ ...current, amount: event.target.value }))} />
            <Input label="Reason" value={refund.reason} onChange={(event) => setRefund((current) => ({ ...current, reason: event.target.value }))} />
            <textarea placeholder="Enter note" value={refund.note} onChange={(event) => setRefund((current) => ({ ...current, note: event.target.value }))} rows={3} className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            <Button size="sm" disabled={!refund.amount || !refund.reason} onClick={async () => {
              try {
                await orderManagementService.refund(order.orderNumber, { amount: Number(refund.amount), reason: refund.reason, note: refund.note });
                await load(1);
                setRefund({ amount: "", reason: "", note: "" });
                toast.success("Refund recorded.");
              } catch (error) { toast.error(toAppError(error).message); }
            }}>Record Refund</Button>
          </div>
          <div className="mt-4 space-y-2">{order.refunds?.map((item) => <p key={item.id} className="text-sm text-muted-foreground">{formatPrice(item.amount)} • {label(item.status)} • {item.reason}</p>)}</div>
        </Panel>
        <Panel title="Shipment / Courier Tracking">
          <div className="space-y-3">
            <Select value={shippingLog.status} onValueChange={(value) => setShippingLog((current) => ({ ...current, status: value }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["pending", "processing", "shipped", "delivered", "returned"].map((item) => <SelectItem key={item} value={item}>{label(item)}</SelectItem>)}</SelectContent>
            </Select>
            <Input label="Courier" value={shippingLog.courier} onChange={(event) => setShippingLog((current) => ({ ...current, courier: event.target.value }))} />
            <Input label="Tracking Number" value={shippingLog.tracking_number} onChange={(event) => setShippingLog((current) => ({ ...current, tracking_number: event.target.value }))} />
            <Input label="Tracking URL" value={shippingLog.tracking_url} onChange={(event) => setShippingLog((current) => ({ ...current, tracking_url: event.target.value }))} />
            <textarea placeholder="Enter note" value={shippingLog.note} onChange={(event) => setShippingLog((current) => ({ ...current, note: event.target.value }))} rows={3} className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            <Button size="sm" onClick={async () => {
              try {
                await orderManagementService.shippingLog(order.orderNumber, shippingLog);
                await load(1);
                toast.success("Shipping log added.");
              } catch (error) { toast.error(toAppError(error).message); }
            }}>Add Shipping Log</Button>
          </div>
          <div className="mt-4 space-y-2">{order.shippingLogs?.map((item) => <p key={item.id} className="text-sm text-muted-foreground">{label(item.status)} • {item.courier ?? "No courier"} • {item.trackingNumber ?? "No tracking"}</p>)}</div>
        </Panel>
      </div> : null}
    </div>
  );
}

function StatusControl({ title, value, values, disabled, onChange }: { title: string; value: string; values: string[]; disabled?: boolean; onChange: (value: string) => void }) {
  return <div className="rounded-xl border border-border bg-card p-4"><p className="mb-2 text-sm font-semibold">{title}</p><Select value={value} disabled={disabled} onValueChange={onChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{values.map((item) => <SelectItem key={item} value={item}>{label(item)}</SelectItem>)}</SelectContent></Select></div>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-border bg-card p-5"><h2 className="mb-4 font-bold">{title}</h2>{children}</section>;
}

function AddressPanel({ title, address }: { title: string; address: Record<string, string | null> }) {
  return <Panel title={title}><p className="font-semibold">{address.full_name}</p><p className="text-sm text-muted-foreground">{address.phone}</p><p className="mt-2 text-sm text-muted-foreground">{address.address_line}, {address.city}, {address.state}, {address.country}</p></Panel>;
}

function Summary({ label: title, value, strong }: { label: string; value: number; strong?: boolean }) {
  return <div className={`flex justify-between py-1 ${strong ? "mt-2 border-t border-border pt-3 font-bold" : "text-sm"}`}><span>{title}</span><span>{formatPrice(value)}</span></div>;
}
