"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { CheckCircle2, ChevronRight, Clock3, CreditCard, Download, MapPin, PackageCheck, RotateCcw, Truck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AccountSidebar } from "@/components/account/AccountSidebar";
import { cancelOrder, fetchOrder, orderInvoiceUrl, type OrderDetail } from "@/services/order-service";
import { useCartStore } from "@/store/cartStore";
import { formatPrice } from "@/utils/format";

export default function AccountOrderDetailPage() {
  const params = useParams<{ order: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [reordering, setReordering] = useState(false);
  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    fetchOrder(decodeURIComponent(params.order)).then(setOrder).catch(() => setOrder(null));
  }, [params.order]);

  const canCancel = order
    ? ["pending", "confirmed"].includes(order.status)
      && (order.shippingStatus ?? "pending") === "pending"
      && order.paymentStatus !== "paid"
    : false;

  const handleCancel = async () => {
    if (!order || !window.confirm("Cancel this order?")) return;
    setCancelling(true);
    try {
      const next = await cancelOrder(order.orderNumber);
      setOrder(next);
      toast.success("Order cancelled.");
    } catch {
      toast.error("Unable to cancel this order.");
    } finally {
      setCancelling(false);
    }
  };

  const handleReorder = async () => {
    if (!order) return;
    setReordering(true);
    try {
      for (const item of order.items) {
        if (!item.productId) continue;
        await addItem({
          productId: Number(item.productId),
          productVariantId: item.variantId ? Number(item.variantId) : undefined,
          quantity: item.quantity,
          selectedOptions: item.selection?.selected_options as Record<string, unknown> | undefined,
        });
      }
      toast.success("Order items added to cart.");
    } catch {
      toast.error("Unable to reorder all items.");
    } finally {
      setReordering(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 pb-16">
        <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">Home</Link><ChevronRight size={14} />
          <Link href="/account/orders" className="hover:text-foreground">Orders</Link><ChevronRight size={14} />
          <span className="font-medium text-foreground">{params.order}</span>
        </nav>
        <div className="flex gap-8">
          <AccountSidebar active="orders" />
          <div className="min-w-0 flex-1">
            {!order ? <div className="h-72 animate-pulse rounded-2xl bg-muted" /> : (
              <div className="space-y-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h1 className="text-2xl font-extrabold">{order.orderNumber}</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Payment {order.paymentStatus} · Order {order.status}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a href={orderInvoiceUrl(order.orderNumber)} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-muted">
                      <Download size={15} />
                      Download Invoice
                    </a>
                    <a href="#timeline" className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-muted">
                      <Truck size={15} />
                      Track Order
                    </a>
                    <button type="button" disabled={reordering} onClick={() => void handleReorder()} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-muted disabled:opacity-50">
                      <RotateCcw size={15} />
                      Reorder
                    </button>
                    {canCancel ? (
                      <button type="button" disabled={cancelling} onClick={() => void handleCancel()} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50">
                        <XCircle size={15} />
                        Cancel Order
                      </button>
                    ) : null}
                  </div>
                </div>
                <section className="grid gap-3 md:grid-cols-3">
                  <InfoCard icon={<PackageCheck size={16} />} label="Order Status" value={label(order.status)} />
                  <InfoCard icon={<CreditCard size={16} />} label="Payment" value={`${label(order.paymentStatus)} · ${label(order.paymentMethod)}`} />
                  <InfoCard icon={<Truck size={16} />} label="Shipping" value={`${label(order.shippingStatus)} · ${order.shippingMethod ?? "Not set"}`} />
                </section>
                <section className="rounded-2xl border border-border bg-card p-5">
                  <h2 className="mb-4 font-bold">Ordered Products</h2>
                  <div className="space-y-3">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex gap-4 border-t border-border pt-4 first:border-t-0 first:pt-0">
                        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
                          {item.image ? (
                            <Image src={item.image} alt={item.productName} fill unoptimized className="object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs font-bold text-muted-foreground">IMG</div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <Link href={item.productSlug ? `/products/${item.productSlug}` : "#"} className="font-semibold transition-colors hover:text-primary">
                            {item.productName}
                          </Link>
                          <p className="mt-1 text-xs text-muted-foreground">{[item.sku, `Qty ${item.quantity}`].filter(Boolean).join(" · ")}</p>
                          <VariantText selection={item.selection} />
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span>Unit: {formatPrice(item.discountedPrice ?? item.unitPrice)}</span>
                            {item.lineDiscount > 0 ? <span>Discount: -{formatPrice(item.lineDiscount)}</span> : null}
                          </div>
                        </div>
                        <p className="shrink-0 pt-1 font-bold">{formatPrice(item.lineSubtotal - item.lineDiscount)}</p>
                      </div>
                    ))}
                  </div>
                </section>
                <section className="grid gap-5 lg:grid-cols-2">
                  <div id="timeline" className="rounded-2xl border border-border bg-card p-5">
                    <h2 className="mb-4 flex items-center gap-2 font-bold"><Clock3 size={16} className="text-primary" /> Order Timeline</h2>
                    <Timeline order={order} />
                  </div>
                  <div className="space-y-5">
                    <DetailPanel title="Payment Details" rows={[
                      ["Gateway", label(order.payment.gateway ?? order.paymentMethod)],
                      ["Transaction ID", order.payment.transactionId ?? order.payment.paymentId ?? "Not available"],
                      ["Status", label(order.payment.status ?? order.paymentStatus)],
                      ["Paid At", formatDate(order.payment.paidAt)],
                    ]} />
                    <DetailPanel title="Shipping Details" rows={[
                      ["Method", order.shippingMethod ?? "Not set"],
                      ["Status", label(order.shippingStatus)],
                      ["Customer Notes", order.customerNotes ?? "Not provided"],
                    ]} />
                  </div>
                </section>
                <section className="rounded-2xl border border-border bg-card p-5">
                  <h2 className="mb-4 font-bold">Order Summary</h2>
                  <Summary label="Subtotal" value={order.summary.subtotal} />
                  <Summary label="Discount" value={-(order.summary.itemDiscount + order.summary.couponDiscount)} />
                  <Summary label="Shipping" value={order.summary.shipping} />
                  <Summary label="Tax" value={order.summary.tax} />
                  <Summary label="Grand Total" value={order.summary.total} strong />
                </section>
                <section className="grid gap-5 lg:grid-cols-2">
                  <AddressPanel title="Billing Address" address={order.billingAddress} />
                  <AddressPanel title="Shipping Address" address={order.shippingAddress} />
                </section>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Summary({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return <div className={`flex justify-between py-1 ${strong ? "mt-2 border-t border-border pt-3 font-bold" : "text-sm"}`}><span>{label}</span><span>{formatPrice(value)}</span></div>;
}

function InfoCard({ icon, label: title, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{icon}{title}</div>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

function Timeline({ order }: { order: OrderDetail }) {
  type TimelineItem = OrderDetail["timeline"][number];
  const fallback: TimelineItem[] = [
    { id: -4, type: "order", title: "Order placed", toStatus: "pending", createdAt: order.placedAt },
    { id: -3, type: "payment", title: "Payment completed", toStatus: order.paymentStatus, createdAt: order.payment.paidAt },
    { id: -2, type: "order", title: `Order ${label(order.status)}`, toStatus: order.status, createdAt: order.placedAt },
    { id: -1, type: "shipping", title: `Shipping ${label(order.shippingStatus)}`, toStatus: order.shippingStatus, createdAt: null },
  ].filter((item) => item.toStatus);
  const timeline = order.timeline.length ? order.timeline : fallback;

  return (
    <div className="space-y-4">
      {timeline.map((item, index) => (
        <div key={item.id} className="relative flex gap-3">
          {index < timeline.length - 1 ? <span className="absolute left-[9px] top-6 h-[calc(100%+0.25rem)] w-px bg-border" /> : null}
          <span className="relative mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <CheckCircle2 size={12} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">{item.title}</p>
            <p className="text-xs text-muted-foreground">{[label(item.toStatus), formatDate(item.createdAt)].filter(Boolean).join(" · ")}</p>
            {item.note ? <p className="mt-1 text-xs text-muted-foreground">{item.note}</p> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function DetailPanel({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-4 font-bold">{title}</h2>
      <div className="space-y-2">
        {rows.map(([key, value]) => (
          <div key={key} className="flex justify-between gap-4 text-sm">
            <span className="text-muted-foreground">{key}</span>
            <span className="text-right font-medium">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AddressPanel({ title, address }: { title: string; address: Record<string, string | null> }) {
  const lines = [
    address.full_name,
    address.phone,
    [address.address_line, address.area, address.city, address.district, address.state].filter(Boolean).join(", "),
    [address.postal_code, address.country].filter(Boolean).join(", "),
  ].filter(Boolean);

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-4 flex items-center gap-2 font-bold"><MapPin size={16} className="text-primary" /> {title}</h2>
      <div className="space-y-1 text-sm text-muted-foreground">
        {lines.map((line, index) => <p key={`${line}-${index}`}>{line}</p>)}
      </div>
    </div>
  );
}

function VariantText({ selection }: { selection?: Record<string, unknown> | null }) {
  const selectedOptions = selection?.selected_options;
  const optionText = selectedOptions && typeof selectedOptions === "object"
    ? Object.values(selectedOptions).map((value) => String(value)).filter(Boolean).join(" · ")
    : "";
  const attributes = selection?.selected_attributes;
  const attributeText = Array.isArray(attributes) ? attributes.map((value) => String(value)).join(" · ") : "";
  const text = optionText || attributeText || String(selection?.selected_variant ?? "");

  return text ? <p className="mt-1 text-xs text-muted-foreground">{text}</p> : null;
}

function label(value?: string | null) {
  if (!value) return "Not set";
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value?: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}
