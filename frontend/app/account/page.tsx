'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, ShoppingBag, Heart, Package, TrendingUp, ArrowRight } from 'lucide-react';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { AccountSidebar } from '@/components/account/AccountSidebar';
import { DashboardWidgetSkeleton, OrderCardSkeleton } from '@/components/skeleton';
import { useCartStore } from '@/store/cartStore';
import { useWishlistStore } from '@/store/wishlistStore';
import { selectCurrencyFingerprint, useSettingsStore } from '@/store/settings-store';
import { MOCK_ORDERS } from '@/mock/orders';
import { MOCK_PRODUCTS } from '@/mock/products';
import { ProductCard } from '@/components/product/ProductCard';
import { formatPrice } from '@/utils/format';
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '@/constants';

function StatCard({
  icon: Icon,
  label,
  value,
  change,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  change?: string;
  color: string;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={18} />
        </div>
        {change && (
          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
            {change}
          </span>
        )}
      </div>
      <p className="text-2xl font-extrabold">{value}</p>
      <p className="text-xs text-muted-foreground font-medium mt-1">{label}</p>
    </div>
  );
}

export default function AccountDashboardPage() {
  useSettingsStore(selectCurrencyFingerprint);
  const [mounted, setMounted] = useState(false);
  const initializeCart = useCartStore((s) => s.initialize);
  const initializeWishlist = useWishlistStore((s) => s.initialize);
  useEffect(() => {
    setMounted(true);
    initializeCart().catch(() => undefined);
    initializeWishlist().catch(() => undefined);
  }, [initializeCart, initializeWishlist]);

  const cartCount = useCartStore((s) => s.getItemCount());
  const wishlistCount = useWishlistStore((s) => s.items.length);
  const recentOrders = MOCK_ORDERS.slice(0, 3);
  const suggestedProducts = MOCK_PRODUCTS.slice(0, 4);

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8 pb-16">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
          <ChevronRight size={14} />
          <span className="text-foreground font-medium">My Account</span>
        </nav>

        <div className="flex gap-8">
          <AccountSidebar active="dashboard" />

          <div className="flex-1 min-w-0">
            {/* Welcome */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-extrabold">Welcome back, John! 👋</h1>
                <p className="text-muted-foreground text-sm mt-1">
                  Here&apos;s what&apos;s happening with your account today.
                </p>
              </div>
              <Link
                href="/account/profile"
                className="hidden md:inline-flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors"
              >
                Edit Profile
              </Link>
            </div>

            {/* Stats */}
            {!mounted ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {Array.from({ length: 4 }).map((_, i) => (
                  <DashboardWidgetSkeleton key={i} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard
                  icon={ShoppingBag}
                  label="Total Orders"
                  value={String(MOCK_ORDERS.length)}
                  change="+2 this month"
                  color="bg-blue-100 text-blue-600 dark:bg-blue-950"
                />
                <StatCard
                  icon={Heart}
                  label="Wishlist"
                  value={String(wishlistCount)}
                  color="bg-rose-100 text-rose-600 dark:bg-rose-950"
                />
                <StatCard
                  icon={Package}
                  label="Cart Items"
                  value={String(cartCount)}
                  color="bg-purple-100 text-purple-600 dark:bg-purple-950"
                />
                <StatCard
                  icon={TrendingUp}
                  label="Total Spent"
                  value={formatPrice(MOCK_ORDERS.reduce((s, o) => s + o.total, 0))}
                  change="↑ 12%"
                  color="bg-amber-100 text-amber-600 dark:bg-amber-950"
                />
              </div>
            )}

            {/* Recent Orders */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden mb-8">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h2 className="font-bold">Recent Orders</h2>
                <Link
                  href="/account/orders"
                  className="text-sm font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  View all <ArrowRight size={13} />
                </Link>
              </div>
              {!mounted ? (
                <div className="p-5 space-y-4">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <OrderCardSkeleton key={i} />
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {recentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center gap-4 px-5 py-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex -space-x-2">
                        {order.items.slice(0, 2).map((item) => (
                          <div
                            key={item.id}
                            className="w-10 h-10 rounded-lg overflow-hidden border-2 border-background bg-muted shrink-0"
                          >
                            <Image
                              src={item.product.thumbnail}
                              alt={item.product.name}
                              width={40}
                              height={40}
                              className="object-cover"
                            />
                          </div>
                        ))}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{order.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.items.length} items · {order.createdAt.slice(0, 10)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ORDER_STATUS_COLORS[order.status]}`}
                        >
                          {ORDER_STATUS_LABELS[order.status]}
                        </span>
                        <p className="text-sm font-bold mt-1">{formatPrice(order.total)}</p>
                      </div>
                      <Link
                        href={`/account/orders/${order.id}`}
                        className="shrink-0 p-2 hover:bg-muted rounded-lg transition-colors"
                      >
                        <ChevronRight size={16} className="text-muted-foreground" />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Suggested Products */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold">Suggested for You</h2>
                <Link href="/shop" className="text-sm font-semibold text-primary hover:underline">
                  View all →
                </Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {suggestedProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

