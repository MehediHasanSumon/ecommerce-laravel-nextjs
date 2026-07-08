"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AccountSidebar } from "@/components/account/AccountSidebar";
import { fetchOrder, type OrderDetail } from "@/services/order-service";
import { formatPrice } from "@/utils/format";

export default function AccountOrderDetailPage() {
  const params = useParams<{ order: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);

  useEffect(() => {
    fetchOrder(decodeURIComponent(params.order)).then(setOrder).catch(() => setOrder(null));
  }, [params.order]);

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
                <div>
                  <h1 className="text-2xl font-extrabold">{order.orderNumber}</h1>
                  <p className="mt-1 text-sm text-muted-foreground">Payment {order.paymentStatus} · Order {order.status}</p>
                </div>
                <section className="rounded-2xl border border-border bg-card p-5">
                  <h2 className="mb-4 font-bold">Ordered Products</h2>
                  <div className="space-y-3">{order.items.map((item) => <div key={item.id} className="flex justify-between border-t border-border pt-3 first:border-t-0 first:pt-0"><div><p className="font-medium">{item.productName}</p><p className="text-xs text-muted-foreground">{item.sku} · Qty {item.quantity}</p></div><p className="font-semibold">{formatPrice(item.lineSubtotal - item.lineDiscount)}</p></div>)}</div>
                </section>
                <section className="rounded-2xl border border-border bg-card p-5">
                  <h2 className="mb-4 font-bold">Order Summary</h2>
                  <Summary label="Subtotal" value={order.summary.subtotal} />
                  <Summary label="Discount" value={-(order.summary.itemDiscount + order.summary.couponDiscount)} />
                  <Summary label="Shipping" value={order.summary.shipping} />
                  <Summary label="Tax" value={order.summary.tax} />
                  <Summary label="Grand Total" value={order.summary.total} strong />
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
