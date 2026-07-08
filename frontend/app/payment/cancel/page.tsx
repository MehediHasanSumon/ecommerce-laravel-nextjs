"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Ban, ShoppingBag } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export default function PaymentCancelPage() {
  const orderNumber = useSearchParams().get("order");
  const checkoutUrl = orderNumber ? `/checkout?payment=cancelled&order=${encodeURIComponent(orderNumber)}` : "/checkout?payment=cancelled";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950">
          <Ban size={48} className="text-amber-500" />
        </div>
        <h1 className="mb-2 text-3xl font-extrabold">Payment Cancelled</h1>
        <p className="mb-8 text-muted-foreground">Your payment was cancelled. You can return to checkout and try again.</p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Link href={checkoutUrl} className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90">
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
