"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Eye, Package, Search } from "lucide-react";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AccountSidebar } from "@/components/account/AccountSidebar";
import { OrderCardSkeleton } from "@/components/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchOrders, type OrderListItem } from "@/services/order-service";
import type { PaginationMeta } from "@/features/admin/shared/types";
import { selectCurrencyFingerprint, useSettingsStore } from "@/store/settings-store";
import { formatPrice } from "@/utils/format";
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from "@/constants";

export default function OrdersPage() {
  useSettingsStore(selectCurrencyFingerprint);
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchOrders({
      ...(filter === "all" ? {} : { status: filter }),
      ...(query ? { search: query } : {}),
      page,
      per_page: 10,
    })
      .then((response) => {
        setOrders(response.data.orders);
        setPagination(response.meta?.pagination ?? null);
      })
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [filter, query, page]);

  const filters = ["all", "pending", "confirmed", "processing", "packed", "ready_for_shipment", "shipped", "out_for_delivery", "delivered", "cancelled", "refunded"];

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setQuery(search.trim());
  };

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
            <form onSubmit={handleSearch} className="mb-6 flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
                />
              </div>
              <Select
                value={filter}
                onValueChange={(value) => {
                  setFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-10 rounded-xl border-border bg-background px-3 text-sm font-medium sm:w-56" aria-label="Filter orders by status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {filters.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status === "all" ? "All Orders" : ORDER_STATUS_LABELS[status] ?? status.replaceAll("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button type="submit" className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
                Search
              </button>
            </form>

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
                    <div className="border-b border-border p-5">
                      <div>
                        <p className="text-sm font-bold">{order.orderNumber}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{order.placedAt ? new Date(order.placedAt).toLocaleDateString() : "Not set"}</p>
                      </div>
                    </div>
                    <div className="p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${ORDER_STATUS_COLORS[order.paymentStatus] ?? "bg-muted text-muted-foreground"}`}>
                            {ORDER_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus}
                          </span>
                          <span className="font-bold">{formatPrice(order.summary.total)}</span>
                        </div>
                        <Link href={`/account/orders/${order.orderNumber}`} className="inline-flex items-center gap-1.5 rounded-xl bg-muted px-4 py-2 text-sm font-medium transition-colors hover:bg-primary hover:text-primary-foreground">
                          <Eye size={14} /> View Details
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
                {pagination && pagination.last_page > 1 && (
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-muted-foreground">
                      Showing {pagination.from ?? 0}-{pagination.to ?? 0} of {pagination.total}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPage((current) => Math.max(1, current - 1))}
                        disabled={pagination.current_page <= 1}
                        className="rounded-xl border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setPage((current) => Math.min(pagination.last_page, current + 1))}
                        disabled={pagination.current_page >= pagination.last_page}
                        className="rounded-xl border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
