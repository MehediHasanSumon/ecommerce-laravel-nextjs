"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Download, Eye, Filter, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { orderManagementService } from "@/features/admin/orders/services/order-management-service";
import { useUrlQueryState } from "@/features/admin/shared/hooks/use-url-query-state";
import type { PaginationMeta } from "@/features/admin/shared/types";
import type { OrderDetail, OrderListItem } from "@/services/order-service";
import { toAppError } from "@/lib/errors";
import { formatPrice } from "@/utils/format";

const orderStatuses = ["", "pending", "confirmed", "processing", "packed", "ready_for_shipment", "shipped", "out_for_delivery", "delivered", "cancelled", "refunded"];
const paymentStatuses = ["", "pending", "paid", "failed", "cancelled", "refunded", "partially_refunded"];
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
        payment_status: query.email_verified,
      });
      setItems(response.data.orders);
      setPagination(response.meta.pagination ?? null);
      setSelected([]);
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setLoading(false);
    }
  }, [query.direction, query.email_verified, query.page, query.per_page, query.search, query.sort, query.status]);

  useEffect(() => { void load(); }, [load]);

  const rows = useMemo(() => items, [items]);
  const allSelected = rows.length > 0 && rows.every((order) => selected.includes(order.id));

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

      <div className="rounded-lg border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="h-10 rounded-lg pl-9 lg:w-80" placeholder="Search orders or customers" value={query.search} onChange={(event) => setQuery({ search: event.target.value, page: 1 }, { replace: true })} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={query.status || "any"} onValueChange={(value) => setQuery({ status: value === "any" ? "" : value, page: 1 })}>
              <SelectTrigger className="h-10 w-[180px] rounded-lg px-3 text-sm"><SelectValue placeholder="Order status" /></SelectTrigger>
              <SelectContent>{orderStatuses.map((status) => <SelectItem key={status || "any"} value={status || "any"}>{label(status)}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={query.email_verified || "any"} onValueChange={(value) => setQuery({ email_verified: value === "any" ? "" : value, page: 1 })}>
              <SelectTrigger className="h-10 w-[180px] rounded-lg px-3 text-sm"><SelectValue placeholder="Payment status" /></SelectTrigger>
              <SelectContent>{paymentStatuses.map((status) => <SelectItem key={status || "any"} value={status || "any"}>{label(status)}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="sm" variant="secondary" icon={<Filter className="h-4 w-4" />} onClick={() => setQuery({ status: "", email_verified: "", search: "", page: 1 })}>Reset</Button>
            <Select value={bulkStatus || "none"} onValueChange={(value) => setBulkStatus(value === "none" ? "" : value)}>
              <SelectTrigger className="h-10 w-[180px] rounded-lg px-3 text-sm"><SelectValue placeholder="Bulk action" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Bulk status</SelectItem>
                {orderStatuses.filter(Boolean).map((status) => <SelectItem key={status} value={status}>{label(status)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" disabled={!selected.length || !bulkStatus} onClick={applyBulkUpdate}>Apply Bulk</Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3"><input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? [] : rows.map((order) => order.id))} aria-label="Select all orders" /></th>
                {["Order", "Customer", "Total", "Payment", "Order Status", "Shipping", "Date", ""].map((head) => <th key={head} className="px-4 py-3">{head}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => <tr key={index} className="border-t border-border"><td colSpan={9} className="px-4 py-4"><div className="h-5 animate-pulse rounded bg-muted" /></td></tr>)
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
                  <td className="px-4 py-3 text-right"><Link href={`/admin/orders/${order.orderNumber}`}><Button size="sm" variant="secondary" icon={<Eye className="h-4 w-4" />}>View</Button></Link></td>
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
            <Button size="sm" variant="secondary" disabled={(pagination?.current_page ?? 1) <= 1} onClick={() => setQuery({ page: query.page - 1 })}>Previous</Button>
            {Array.from({ length: Math.min(pagination?.last_page ?? 1, 5) }, (_, index) => {
              const current = pagination?.current_page ?? 1;
              const last = pagination?.last_page ?? 1;
              const start = Math.max(1, Math.min(current - 2, last - 4));
              const pageNumber = start + index;
              if (pageNumber > last) return null;
              return <Button key={pageNumber} size="sm" variant={pageNumber === current ? "primary" : "secondary"} onClick={() => setQuery({ page: pageNumber })}>{pageNumber}</Button>;
            })}
            <Button size="sm" variant="secondary" disabled={(pagination?.current_page ?? 1) >= (pagination?.last_page ?? 1)} onClick={() => setQuery({ page: query.page + 1 })}>Next</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminOrderDetailContent({ orderNumber }: { orderNumber: string }) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState<"invoice" | "slip" | null>(null);
  const [note, setNote] = useState("");
  const [refund, setRefund] = useState({ amount: "", reason: "", note: "" });
  const [shippingLog, setShippingLog] = useState({ status: "shipped", courier: "", tracking_number: "", tracking_url: "", note: "" });

  const load = useCallback(async () => {
    try {
      const response = await orderManagementService.show(orderNumber);
      setOrder(response.data.order);
      setNote(response.data.order.adminNotes ?? "");
    } catch (error) {
      toast.error(toAppError(error).message);
    }
  }, [orderNumber]);

  useEffect(() => { void load(); }, [load]);

  async function update(field: "status" | "payment_status" | "shipping_status", value: string) {
    if (!order) return;
    setSaving(true);
    try {
      const response = await orderManagementService.update(order.orderNumber, { [field]: value });
      setOrder(response.data.order);
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
        <Link href="/admin/orders"><Button variant="secondary">Back to Orders</Button></Link>
        <Button icon={<Download className="h-4 w-4" />} isLoading={downloading === "invoice"} onClick={() => void download("invoice")}>Download Invoice</Button>
        <Button variant="secondary" icon={<Download className="h-4 w-4" />} isLoading={downloading === "slip"} onClick={() => void download("slip")}>Delivery Slip</Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <StatusControl title="Order Status" value={order.status} values={orderStatuses.filter(Boolean)} disabled={saving} onChange={(value) => update("status", value)} />
        <StatusControl title="Payment Status" value={order.paymentStatus} values={paymentStatuses.filter(Boolean)} disabled={saving} onChange={(value) => update("payment_status", value)} />
        <StatusControl title="Shipping Status" value={order.shippingStatus} values={["pending", "processing", "shipped", "delivered", "returned"]} disabled={saving} onChange={(value) => update("shipping_status", value)} />
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
          <div className="space-y-3">{order.timeline.map((event) => <div key={event.id} className="border-l-2 border-primary/40 pl-3"><p className="font-semibold">{event.title}</p><p className="text-xs text-muted-foreground">{dateLabel(event.createdAt)}</p>{event.note ? <p className="mt-1 text-sm text-muted-foreground">{event.note}</p> : null}</div>)}</div>
        </Panel>
        <Panel title="Order Summary">
          <Summary label="Subtotal" value={order.summary.subtotal} />
          <Summary label="Discount" value={-(order.summary.itemDiscount + order.summary.couponDiscount)} />
          <Summary label="Shipping" value={order.summary.shipping} />
          <Summary label="Tax" value={order.summary.tax} />
          <Summary label="Grand Total" value={order.summary.total} strong />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Admin Notes">
          <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={6} className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
          <Button className="mt-3" size="sm" isLoading={saving} onClick={async () => {
            setSaving(true);
            try {
              const response = await orderManagementService.update(order.orderNumber, { admin_notes: note, note: "Admin notes updated." });
              setOrder(response.data.order);
              toast.success("Admin notes saved.");
            } catch (error) { toast.error(toAppError(error).message); } finally { setSaving(false); }
          }}>Save Notes</Button>
        </Panel>
        <Panel title="Refund Workflow">
          <div className="space-y-3">
            <Input label="Amount" type="number" value={refund.amount} onChange={(event) => setRefund((current) => ({ ...current, amount: event.target.value }))} />
            <Input label="Reason" value={refund.reason} onChange={(event) => setRefund((current) => ({ ...current, reason: event.target.value }))} />
            <textarea placeholder="Refund note" value={refund.note} onChange={(event) => setRefund((current) => ({ ...current, note: event.target.value }))} rows={3} className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            <Button size="sm" disabled={!refund.amount || !refund.reason} onClick={async () => {
              try {
                const response = await orderManagementService.refund(order.orderNumber, { amount: Number(refund.amount), reason: refund.reason, note: refund.note });
                setOrder(response.data.order);
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
            <textarea placeholder="Shipping note" value={shippingLog.note} onChange={(event) => setShippingLog((current) => ({ ...current, note: event.target.value }))} rows={3} className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            <Button size="sm" onClick={async () => {
              try {
                const response = await orderManagementService.shippingLog(order.orderNumber, shippingLog);
                setOrder(response.data.order);
                toast.success("Shipping log added.");
              } catch (error) { toast.error(toAppError(error).message); }
            }}>Add Shipping Log</Button>
          </div>
          <div className="mt-4 space-y-2">{order.shippingLogs?.map((item) => <p key={item.id} className="text-sm text-muted-foreground">{label(item.status)} • {item.courier ?? "No courier"} • {item.trackingNumber ?? "No tracking"}</p>)}</div>
        </Panel>
      </div>
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
