"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Package, Search, XCircle } from "lucide-react";
import { toast } from "sonner";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AccountSidebar } from "@/components/account/AccountSidebar";
import { OrderCardSkeleton } from "@/components/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cancelOrder, fetchOrders, type OrderListItem } from "@/services/order-service";
import type { PaginationMeta } from "@/features/admin/shared/types";
import { selectCurrencyFingerprint, useSettingsStore } from "@/store/settings-store";
import { formatPrice } from "@/utils/format";
import { ORDER_STATUS_COLORS, formatOrderStatus } from "@/constants";
import { hasPermission } from "@/lib/permissions";

export default function OrdersPage() {
  useSettingsStore(selectCurrencyFingerprint);
  const router = useRouter();
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState<string | null>(null);
  const canEditOrder = hasPermission("can_edit_order");

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

  const canCancel = (order: OrderListItem) =>
    canEditOrder
    &&
    ["pending", "confirmed"].includes(order.status)
    && (order.shippingStatus ?? "pending") === "pending"
    && order.paymentStatus !== "paid";

  const handleCancel = async (orderNumber: string) => {
    if (!window.confirm("Cancel this order?")) return;
    setCancellingOrder(orderNumber);
    try {
      const next = await cancelOrder(orderNumber);
      setOrders((current) => current.map((order) => order.orderNumber === orderNumber ? next : order));
      toast.success("Order cancelled.");
    } catch {
      toast.error("Unable to cancel this order.");
    } finally {
      setCancellingOrder(null);
    }
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

        <div className="flex flex-col gap-4 md:flex-row md:gap-8">
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
                      {status === "all" ? "All Orders" : formatOrderStatus(status)}
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
                <div className="overflow-hidden rounded-2xl border border-border bg-card">
                  <div className="divide-y divide-border">
                    {orders.map((order) => (
                      <div
                        key={order.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => router.push(`/account/orders/${order.orderNumber}`)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            router.push(`/account/orders/${order.orderNumber}`);
                          }
                        }}
                        className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                          <Package size={18} className="text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{order.orderNumber}</p>
                          <p className="text-xs text-muted-foreground">
                            {order.itemsCount ?? 0} items · {order.placedAt ? new Date(order.placedAt).toLocaleDateString() : "Not set"}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ORDER_STATUS_COLORS[order.status] ?? "bg-muted text-muted-foreground"}`}>
                            {formatOrderStatus(order.status)}
                          </span>
                          <p className="mt-1 text-sm font-bold">{formatPrice(order.summary.total)}</p>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                          {canCancel(order) ? (
                            <button
                              type="button"
                              disabled={cancellingOrder === order.orderNumber}
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleCancel(order.orderNumber);
                              }}
                              className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                            >
                              <XCircle size={13} />
                              Cancel
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
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
