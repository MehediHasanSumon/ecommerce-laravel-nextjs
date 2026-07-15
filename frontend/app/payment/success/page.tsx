"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { notFound, useSearchParams } from "next/navigation";
import { CheckCircle, Download, Home, Package, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { downloadPaymentInvoice, fetchPaymentResult, type OrderDetail } from "@/services/order-service";
import { toAppError } from "@/lib/errors";
import { formatPrice } from "@/utils/format";

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order");
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  useEffect(() => {
    if (!orderNumber?.trim()) {
      notFound();
    }
    fetchPaymentResult(orderNumber)
      .then(setOrder)
      .catch(() => notFound())
      .finally(() => setLoading(false));
  }, [orderNumber]);

  if (loading) {
    return <PaymentResultSkeleton />;
  }

  if (!order) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
          <CheckCircle size={48} className="text-emerald-500" />
        </div>
        <h1 className="mb-2 text-3xl font-extrabold">Payment Successful</h1>
        <p className="mb-2 text-muted-foreground">Thank you for your purchase. Your order is confirmed and being processed.</p>
        <p className="mb-8 text-lg font-bold text-primary">{order.orderNumber}</p>

        <div className="mb-8 grid gap-4 text-left md:grid-cols-3">
          <InfoTile title="Payment Status" value={order.paymentStatus} />
          <InfoTile title="Payment Method" value={order.payment.gateway || order.paymentMethod} />
          <InfoTile title="Grand Total" value={formatPrice(order.summary.total)} />
        </div>

        <div className="mb-8 rounded-2xl border border-border bg-card p-6 text-left">
          <h2 className="mb-4 font-bold">Order Summary</h2>
          <div className="space-y-2 text-sm">
            <SummaryRow label="Subtotal" value={formatPrice(order.summary.subtotal)} />
            <SummaryRow label="Discount" value={`-${formatPrice(order.summary.itemDiscount + order.summary.couponDiscount)}`} />
            <SummaryRow label="Shipping" value={formatPrice(order.summary.shipping)} />
            <SummaryRow label="Tax" value={formatPrice(order.summary.tax)} />
            <SummaryRow label="Total" value={formatPrice(order.summary.total)} strong />
          </div>
        </div>

        <div className="mb-8 grid gap-4 text-left md:grid-cols-2">
          <AddressBlock title="Billing Address" address={order.billingAddress} />
          <AddressBlock title="Shipping Address" address={order.shippingAddress} />
        </div>

        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Link href={`/account/orders/${order.orderNumber}`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90">
            <Package size={16} /> View Order
          </Link>
          {order.paymentStatus === "paid" ? (
            <button
              type="button"
              disabled={invoiceLoading}
              onClick={async () => {
                setInvoiceLoading(true);
                try {
                  await downloadPaymentInvoice(order.orderNumber);
                } catch (error) {
                  toast.error(toAppError(error).message);
                } finally {
                  setInvoiceLoading(false);
                }
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-6 py-3 font-semibold transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download size={16} /> Download Invoice
            </button>
          ) : null}
          <Link href="/shop" className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-6 py-3 font-semibold transition-colors hover:bg-muted">
            <ShoppingBag size={16} /> Continue Shopping
          </Link>
          <Link href="/" className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-6 py-3 font-semibold transition-colors hover:bg-muted">
            <Home size={16} /> Home
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function InfoTile({ title, value }: { title: string; value?: string | number | null }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="mt-1 font-bold capitalize">{String(value ?? "Not available").replaceAll("_", " ")}</p>
    </div>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <div className={`flex justify-between ${strong ? "border-t border-border pt-2 font-bold" : ""}`}><span>{label}</span><span>{value}</span></div>;
}

function AddressBlock({ title, address }: { title: string; address: Record<string, string | null> }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-3 font-bold">{title}</h2>
      <p className="text-sm font-semibold">{address.full_name}</p>
      <p className="text-sm text-muted-foreground">{address.phone}</p>
      <p className="mt-2 text-sm text-muted-foreground">{address.address_line}, {address.city}, {address.state}</p>
    </div>
  );
}

function PaymentResultSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-16">
        <div className="mx-auto mb-6 h-24 w-24 animate-pulse rounded-full bg-muted" />
        <div className="mx-auto mb-3 h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="mx-auto mb-8 h-5 w-full max-w-80 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 md:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-muted" />)}</div>
      </main>
      <Footer />
    </div>
  );
}
