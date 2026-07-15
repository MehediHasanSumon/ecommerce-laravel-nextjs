"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronRight, Heart, Package, ShoppingBag, TrendingUp } from "lucide-react";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AccountSidebar } from "@/components/account/AccountSidebar";
import { DashboardWidgetSkeleton, OrderCardSkeleton } from "@/components/skeleton";
import { ProductCard } from "@/components/product/ProductCard";
import { useCartStore } from "@/store/cartStore";
import { useWishlistStore } from "@/store/wishlistStore";
import { selectCurrencyFingerprint, useSettingsStore } from "@/store/settings-store";
import { accountService, type AccountDashboard } from "@/services/account-service";
import { formatPrice } from "@/utils/format";
import { ORDER_STATUS_COLORS, formatOrderStatus } from "@/constants";

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="min-w-0 bg-card border border-border rounded-2xl p-4 sm:p-5">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={18} />
        </div>
      </div>
      <p className="break-words text-xl font-extrabold sm:text-2xl [overflow-wrap:anywhere]">{value}</p>
      <p className="text-xs text-muted-foreground font-medium mt-1">{label}</p>
    </div>
  );
}

export default function AccountDashboardPage() {
  useSettingsStore(selectCurrencyFingerprint);
  const [dashboard, setDashboard] = useState<AccountDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const initializeCart = useCartStore((s) => s.initialize);
  const initializeWishlist = useWishlistStore((s) => s.initialize);
  const cartCount = useCartStore((s) => s.getItemCount());
  const wishlistCount = useWishlistStore((s) => s.items.length);

  useEffect(() => {
    Promise.all([
      initializeCart().catch(() => undefined),
      initializeWishlist().catch(() => undefined),
      accountService.dashboard().then(setDashboard),
    ]).finally(() => setLoading(false));
  }, [initializeCart, initializeWishlist]);

  const stats = dashboard?.stats;
  const recentOrders = dashboard?.recentOrders ?? [];
  const suggestedProducts = dashboard?.suggestedProducts ?? [];

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />
      <main className="mx-auto max-w-7xl px-3 py-6 pb-16 sm:px-4 sm:py-8 lg:px-6">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <ChevronRight size={14} />
          <span className="text-foreground font-medium">My Account</span>
        </nav>

        <div className="flex flex-col gap-4 md:flex-row md:gap-8">
          <AccountSidebar active="dashboard" />

          <div className="flex-1 min-w-0">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="break-words text-2xl font-extrabold">Welcome back, {dashboard?.profile.name ?? "Customer"}</h1>
                <p className="text-muted-foreground text-sm mt-1">Here&apos;s what&apos;s happening with your account today.</p>
              </div>
              <Link href="/account/profile" className="hidden md:inline-flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors">
                Edit Profile
              </Link>
            </div>

            {loading ? (
              <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => <DashboardWidgetSkeleton key={i} />)}
              </div>
            ) : (
              <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                <StatCard icon={ShoppingBag} label="Total Orders" value={String(stats?.totalOrders ?? 0)} color="bg-blue-100 text-blue-600 dark:bg-blue-950" />
                <StatCard icon={Heart} label="Wishlist" value={String(wishlistCount || stats?.wishlistCount || 0)} color="bg-rose-100 text-rose-600 dark:bg-rose-950" />
                <StatCard icon={Package} label="Cart Items" value={String(cartCount || stats?.cartItems || 0)} color="bg-purple-100 text-purple-600 dark:bg-purple-950" />
                <StatCard icon={TrendingUp} label="Total Spent" value={formatPrice(stats?.totalSpent ?? 0)} color="bg-amber-100 text-amber-600 dark:bg-amber-950" />
              </div>
            )}

            <div className="bg-card border border-border rounded-2xl overflow-hidden mb-8">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h2 className="font-bold">Recent Orders</h2>
                <Link href="/account/orders" className="text-sm font-semibold text-primary hover:underline flex items-center gap-1">
                  View all <ArrowRight size={13} />
                </Link>
              </div>
              {loading ? (
                <div className="p-5 space-y-4">{Array.from({ length: 2 }).map((_, i) => <OrderCardSkeleton key={i} />)}</div>
              ) : recentOrders.length ? (
                <div className="divide-y divide-border">
                  {recentOrders.map((order) => (
                    <Link
                      key={order.id}
                      href={`/account/orders/${order.orderNumber}`}
                      className="flex items-start gap-3 px-4 py-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:items-center sm:gap-4 sm:px-5"
                    >
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Package size={18} className="text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{order.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">{order.itemsCount ?? 0} items · {order.placedAt ? new Date(order.placedAt).toLocaleDateString() : "Not set"}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ORDER_STATUS_COLORS[order.status] ?? "bg-muted text-muted-foreground"}`}>
                          {formatOrderStatus(order.status)}
                        </span>
                        <p className="text-sm font-bold mt-1">{formatPrice(order.summary.total)}</p>
                      </div>
                      <span className="hidden shrink-0 p-2 sm:inline-flex">
                        <ChevronRight size={16} className="text-muted-foreground" />
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-sm text-muted-foreground">No orders yet.</div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold">Suggested for You</h2>
                <Link href="/shop" className="text-sm font-semibold text-primary hover:underline">View all</Link>
              </div>
              <div className="grid grid-cols-1 gap-4 min-[380px]:grid-cols-2 md:grid-cols-4">
                {suggestedProducts.map((product) => <ProductCard key={product.id} product={product} />)}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
