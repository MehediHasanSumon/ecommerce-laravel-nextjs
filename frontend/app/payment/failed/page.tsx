"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, RotateCcw, ShoppingBag } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { fetchPaymentResult, type OrderDetail } from "@/services/order-service";

export default function PaymentFailedPage() {
  const orderNumber = useSearchParams().get("order");
  const [order, setOrder] = useState<OrderDetail | null>(null);

  useEffect(() => {
    if (orderNumber) {
      fetchPaymentResult(orderNumber).then(setOrder).catch(() => undefined);
    }
  }, [orderNumber]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-red-100 dark:bg-red-950">
          <AlertCircle size={48} className="text-red-500" />
        </div>
        <h1 className="mb-2 text-3xl font-extrabold">Payment Failed</h1>
        <p className="mb-2 text-muted-foreground">Your payment could not be completed. No duplicate order was created.</p>
        {order ? <p className="mb-2 text-lg font-bold text-primary">{order.orderNumber}</p> : null}
        {order?.payment.failureMessage ? <p className="mb-8 text-sm text-red-600">{order.payment.failureMessage}</p> : <div className="mb-8" />}
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Link href={order ? `/checkout?payment=failed&order=${encodeURIComponent(order.orderNumber)}` : "/checkout?payment=failed"} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90">
            <RotateCcw size={16} /> Retry Payment
          </Link>
          <Link href="/checkout" className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-6 py-3 font-semibold transition-colors hover:bg-muted">
            Return to Checkout
          </Link>
          <Link href="/shop" className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-6 py-3 font-semibold transition-colors hover:bg-muted">
            <ShoppingBag size={16} /> Continue Shopping
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
