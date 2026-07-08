"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Eye, Package } from "lucide-react";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AccountSidebar } from "@/components/account/AccountSidebar";
import { OrderCardSkeleton } from "@/components/skeleton";
import { fetchOrders, type OrderListItem } from "@/services/order-service";
import { selectCurrencyFingerprint, useSettingsStore } from "@/store/settings-store";
import { formatPrice } from "@/utils/format";
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from "@/constants";

export default function OrdersPage() {
  useSettingsStore(selectCurrencyFingerprint);
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    setLoading(true);
    fetchOrders(filter === "all" ? {} : { status: filter })
      .then((response) => setOrders(response.data.orders))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [filter]);

  const filters = ["all", "pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 pb-16">
        <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <ChevronRight size={14} />
          <Link href="/account" className="hover:text-foreground">Account</Link>
          <ChevronRight size={14} />
          <span className="font-medium text-foreground">Orders</span>
        </nav>

        <div className="flex gap-8">
          <AccountSidebar active="orders" />
          <div className="min-w-0 flex-1">
            <h1 className="mb-6 text-2xl font-extrabold">My Orders</h1>
            <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
              {filters.map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium capitalize transition-colors ${filter === status ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                >
                  {status === "all" ? "All Orders" : ORDER_STATUS_LABELS[status] ?? status.replaceAll("_", " ")}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="space-y-4">{Array.from({ length: 3 }).map((_, index) => <OrderCardSkeleton key={index} />)}</div>
            ) : orders.length === 0 ? (
              <div className="py-16 text-center">
                <Package size={48} className="mx-auto mb-4 text-muted-foreground opacity-40" />
                <h3 className="mb-2 text-lg font-bold">No orders found</h3>
                <p className="mb-6 text-sm text-muted-foreground">You haven&apos;t placed any orders in this category yet.</p>
                <Link href="/shop" className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground hover:opacity-90">Start Shopping</Link>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.id} className="overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-sm">
                    <div className="flex items-center justify-between border-b border-border p-5">
                      <div>
                        <p className="text-sm font-bold">{order.orderNumber}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{order.placedAt ? new Date(order.placedAt).toLocaleDateString() : "Not set"}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${ORDER_STATUS_COLORS[order.status] ?? "bg-muted text-muted-foreground"}`}>
                          {ORDER_STATUS_LABELS[order.status] ?? order.status}
                        </span>
                        <span className="font-bold">{formatPrice(order.summary.total)}</span>
                      </div>
                    </div>
                    <div className="p-5">
                      <p className="text-sm font-medium">{order.itemsCount ?? 0} items · {order.paymentMethod.replaceAll("_", " ")}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Payment: {order.paymentStatus} · Shipping: {order.shippingStatus}</p>
                      <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
                        <Link href={`/account/orders/${order.orderNumber}`} className="inline-flex items-center gap-1.5 rounded-xl bg-muted px-4 py-2 text-sm font-medium transition-colors hover:bg-primary hover:text-primary-foreground">
                          <Eye size={14} /> View Details
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
