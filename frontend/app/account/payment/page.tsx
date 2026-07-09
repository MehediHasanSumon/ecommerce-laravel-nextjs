"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, CreditCard } from "lucide-react";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AccountSidebar } from "@/components/account/AccountSidebar";
import { accountService, type PaymentHistoryItem } from "@/services/account-service";
import { formatPrice } from "@/utils/format";

export default function PaymentPage() {
  const [items, setItems] = useState<PaymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    accountService.paymentHistory().then(setItems).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8 pb-16">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <ChevronRight size={14} />
          <Link href="/account" className="hover:text-foreground">Account</Link>
          <ChevronRight size={14} />
          <span className="text-foreground font-medium">Payment Methods</span>
        </nav>
        <div className="flex gap-8">
          <AccountSidebar active="payment" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-extrabold">Payment Methods</h1>
            </div>

            <div className="space-y-4">
              {loading ? (
                Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-24 rounded-2xl bg-muted animate-pulse" />)
              ) : items.length ? (
                items.map((item) => (
                  <div key={item.id} className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
                    <div className="w-12 h-8 bg-gradient-to-r from-primary to-primary/70 rounded-lg flex items-center justify-center">
                      <CreditCard size={18} className="text-primary-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm capitalize">{item.gateway.replaceAll("_", " ")} payment</p>
                      <p className="text-xs text-muted-foreground">Order {item.orderNumber ?? "Pending"} · {item.transactionId ?? "No transaction id"}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatPrice(item.amount)}</p>
                      <p className="text-xs text-muted-foreground capitalize">{item.status}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">No payment history yet.</div>
              )}
            </div>

            <div className="mt-8 p-4 bg-muted rounded-2xl text-sm text-muted-foreground">
              <p className="font-semibold mb-1">Security Note</p>
              <p>Saved payment methods are not stored yet. This page is ready for tokenized payment methods in future gateway integrations.</p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
