"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AlertCircle, Check, Circle, Loader2, MapPin, Package, Search, Truck } from "lucide-react";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { trackOrder, type TrackedOrder } from "@/services/order-tracking-service";
import { toAppError } from "@/lib/errors";
import { formatPrice } from "@/utils/format";
import { cn } from "@/utils/cn";

const orderPattern = /^ORD-[A-Z0-9-]{8,32}$/;
const phonePattern = /^\+?[0-9][0-9\s\-()]{7,24}$/;

export default function OrderTrackingPage() {
  const [form, setForm] = useState({ orderId: "", mobileNumber: "" });
  const [errors, setErrors] = useState<{ orderId?: string; mobileNumber?: string }>({});
  const [result, setResult] = useState<TrackedOrder | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const orderId = form.orderId.trim().toUpperCase();
    const mobileNumber = form.mobileNumber.trim();
    const nextErrors: typeof errors = {};
    if (!orderId) nextErrors.orderId = "Enter your Order ID.";
    else if (!orderPattern.test(orderId)) nextErrors.orderId = "Enter a valid Order ID.";
    if (!mobileNumber) nextErrors.mobileNumber = "Enter the mobile number used for this order.";
    else if (!phonePattern.test(mobileNumber)) nextErrors.mobileNumber = "Enter a valid mobile number.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setLoading(true);
    setMessage("");
    setResult(null);
    try {
      setResult(await trackOrder({ order_id: orderId, mobile_number: mobileNumber }));
    } catch (error) {
      const appError = toAppError(error);
      setMessage(appError.message || "No order was found with the provided Order ID and Mobile Number.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 pb-16 sm:py-12 lg:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-extrabold sm:text-4xl">Order Tracking</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">Enter the Order ID and mobile number used during checkout.</p>
        </div>

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)] xl:grid-cols-[400px_minmax(0,1fr)]">
          <div className="lg:sticky lg:top-24">
            <form onSubmit={submit} className="rounded-lg border border-border bg-card p-4 sm:p-5">
              <div className="grid gap-4">
                <TrackingInput label="Order ID" value={form.orderId} placeholder="ORD-20260716-XXXXXXXX" error={errors.orderId} onChange={(orderId) => setForm((current) => ({ ...current, orderId: orderId.toUpperCase() }))} />
                <TrackingInput label="Mobile Number" value={form.mobileNumber} placeholder="01XXXXXXXXX" error={errors.mobileNumber} onChange={(mobileNumber) => setForm((current) => ({ ...current, mobileNumber }))} />
              </div>
              <Button loading={loading} />
              {message ? <div role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{message}</div> : null}
            </form>
          </div>

          <div className="min-w-0">
            {result ? <TrackingResult order={result} /> : (
              <div className="hidden min-h-56 items-center justify-center rounded-lg border border-dashed border-border text-center text-sm text-muted-foreground lg:flex">
                Enter your order details to view tracking information.
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function TrackingResult({ order }: { order: TrackedOrder }) {
  return <div className="min-w-0 space-y-5" aria-live="polite">
    <section className="rounded-lg border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold uppercase text-muted-foreground">Order ID</p><h2 className="mt-1 text-xl font-bold">{order.orderId}</h2><p className="mt-1 text-sm text-muted-foreground">{dateLabel(order.orderDate)}</p></div><span className="inline-flex w-fit rounded-full border border-border px-3 py-1 text-sm font-bold">{label(order.status)}</span></div>
      <div className="mt-5 grid gap-4 border-t border-border pt-5 sm:grid-cols-2 lg:grid-cols-4"><Info label="Customer" value={order.customer.name} /><Info label="Mobile Number" value={order.customer.phone} /><Info label="Payment" value={`${label(order.paymentMethod)} · ${label(order.paymentStatus)}`} /><Info label="Shipping Status" value={label(order.shippingStatus)} /></div>
    </section>

    <section className="rounded-lg border border-border bg-card p-4 sm:p-5">
      <h2 className="font-bold">Order Timeline</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">{order.timeline.map((step) => <TimelineStep key={step.key} step={step} />)}</div>
    </section>

    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-lg border border-border bg-card p-4 sm:p-5"><div className="flex items-center gap-2"><MapPin className="h-4 w-4" /><h2 className="font-bold">Shipping Information</h2></div><div className="mt-4 space-y-3"><Info label="Recipient" value={order.shipping.recipientName} /><Info label="Phone" value={order.shipping.phone} /><Info label="Address" value={order.shipping.address} /><Info label="Shipping Method" value={order.shipping.method} />{order.shipping.estimatedDelivery ? <Info label="Estimated Delivery" value={dateLabel(order.shipping.estimatedDelivery)} /> : null}{order.shipping.courier ? <Info label="Courier" value={order.shipping.courier} /> : null}{order.shipping.trackingNumber ? <Info label="Tracking Number" value={order.shipping.trackingNumber} /> : null}{order.shipping.courierStatus ? <Info label="Current Status" value={label(order.shipping.courierStatus)} /> : null}{order.shipping.codStatus ? <Info label="COD Status" value={label(order.shipping.codStatus)} /> : null}{order.shipping.latestUpdate ? <Info label="Latest Update" value={dateTimeLabel(order.shipping.latestUpdate)} /> : null}{order.shipping.deliveryNotes ? <Info label="Delivery Notes" value={order.shipping.deliveryNotes} /> : null}</div>{order.shipping.trackingUrl ? <a href={order.shipping.trackingUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"><Truck className="h-4 w-4" />Courier Tracking</a> : null}</section>
      <section className="rounded-lg border border-border bg-card p-4 sm:p-5"><h2 className="font-bold">Order Summary</h2><div className="mt-4"><Summary label="Subtotal" value={order.summary.subtotal} /><Summary label="Product Discount" value={-order.summary.discount} /><Summary label="Coupon Discount" value={-order.summary.couponDiscount} /><Summary label="Tax" value={order.summary.tax} /><Summary label="Shipping Charge" value={order.summary.shipping} /><Summary label="Grand Total" value={order.summary.total} strong /></div></section>
    </div>

    {order.shipping.courierTimeline.length ? <section className="rounded-lg border border-border bg-card p-4 sm:p-5"><div className="flex items-center gap-2"><Truck className="h-4 w-4" /><h2 className="font-bold">Courier Timeline</h2></div><div className="mt-5 space-y-4">{order.shipping.courierTimeline.map((event, index) => <div key={`${event.status}-${event.occurredAt}-${index}`} className="border-l-2 border-primary/40 pl-3"><p className="font-semibold">{event.title}</p><p className="text-xs text-muted-foreground">{dateTimeLabel(event.occurredAt)}</p>{event.description ? <p className="mt-1 text-sm text-muted-foreground">{event.description}</p> : null}</div>)}</div></section> : null}

    <section className="overflow-hidden rounded-lg border border-border bg-card"><div className="border-b border-border p-4 sm:p-5"><div className="flex items-center gap-2"><Package className="h-4 w-4" /><h2 className="font-bold">Ordered Products</h2></div></div><div className="divide-y divide-border">{order.items.map((item, index) => <div key={`${item.sku}-${index}`} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5"><div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">{item.image ? <Image src={item.image} alt={item.name} fill unoptimized className="object-cover" /> : null}</div><div className="min-w-0 flex-1">{item.slug ? <Link href={`/products/${item.slug}`} className="font-semibold hover:text-primary">{item.name}</Link> : <p className="font-semibold">{item.name}</p>}<p className="mt-1 text-xs text-muted-foreground">{item.variant || "Default"}{item.sku ? ` · ${item.sku}` : ""}</p></div><div className="grid grid-cols-3 gap-5 text-sm sm:text-right"><Info label="Quantity" value={String(item.quantity)} /><Info label="Unit Price" value={formatPrice(item.unitPrice)} /><Info label="Line Total" value={formatPrice(item.lineTotal)} /></div></div>)}</div></section>
  </div>;
}

function TrackingInput({ label: title, value, placeholder, error, onChange }: { label: string; value: string; placeholder: string; error?: string; onChange: (value: string) => void }) { return <label className="block space-y-2 text-sm font-semibold"><span>{title}</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} aria-invalid={Boolean(error)} className={cn("h-12 w-full rounded-xl border bg-background px-4 text-sm outline-none transition focus:border-primary", error ? "border-destructive" : "border-border")} />{error ? <span className="block text-xs text-destructive">{error}</span> : null}</label>; }
function Button({ loading }: { loading: boolean }) { return <button type="submit" disabled={loading} className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-60">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}{loading ? "Tracking Order..." : "Track Order"}</button>; }
function Info({ label: title, value }: { label: string; value?: string | null }) { return <div><p className="text-xs font-medium text-muted-foreground">{title}</p><p className="mt-1 break-words text-sm font-semibold">{value || "Not available"}</p></div>; }
function Summary({ label: title, value, strong }: { label: string; value: number; strong?: boolean }) { return <div className={cn("flex items-center justify-between py-2 text-sm", strong && "mt-2 border-t border-border pt-4 text-base font-bold")}><span>{title}</span><span>{formatPrice(value)}</span></div>; }
function TimelineStep({ step }: { step: TrackedOrder["timeline"][number] }) { const done = step.state === "completed"; const current = step.state === "current"; const exception = step.state === "exception"; return <div className={cn("flex items-center gap-3 rounded-lg border p-3 lg:flex-col lg:text-center", (done || current) && "border-primary/40 bg-primary/5", exception && "border-destructive/40 bg-destructive/5")}><span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full border", done && "border-primary bg-primary text-primary-foreground", current && "border-primary text-primary", exception && "border-destructive text-destructive")}>{done ? <Check className="h-4 w-4" /> : exception ? <AlertCircle className="h-4 w-4" /> : <Circle className="h-3 w-3" />}</span><span className="text-xs font-semibold">{step.label}</span></div>; }
function label(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase()); }
function dateLabel(value?: string | null) { return value ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value)) : "Not available"; }
function dateTimeLabel(value?: string | null) { return value ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Not available"; }
