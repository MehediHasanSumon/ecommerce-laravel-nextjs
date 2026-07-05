'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, Package, Eye, Download } from 'lucide-react';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { AccountSidebar } from '@/components/account/AccountSidebar';
import { OrderCardSkeleton } from '@/components/skeleton';
import { MOCK_ORDERS } from '@/mock/orders';
import { selectCurrencyFingerprint, useSettingsStore } from '@/store/settings-store';
import { formatPrice } from '@/utils/format';
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '@/constants';

export default function OrdersPage() {
  useSettingsStore(selectCurrencyFingerprint);
  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState('all');
  useEffect(() => {
    setMounted(true);
  }, []);

  const FILTERS = ['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  const filtered = filter === 'all' ? MOCK_ORDERS : MOCK_ORDERS.filter((o) => o.status === filter);

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
          <Link href="/account" className="hover:text-foreground">
            Account
          </Link>
          <ChevronRight size={14} />
          <span className="text-foreground font-medium">Orders</span>
        </nav>

        <div className="flex gap-8">
          <AccountSidebar active="orders" />

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-extrabold mb-6">My Orders</h1>

            {/* Filter tabs */}
            <div className="flex overflow-x-auto pb-2 mb-6 gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium capitalize whitespace-nowrap transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
                >
                  {f === 'all' ? 'All Orders' : ORDER_STATUS_LABELS[f]}
                </button>
              ))}
            </div>

            {!mounted ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <OrderCardSkeleton key={i} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <Package size={48} className="mx-auto text-muted-foreground opacity-40 mb-4" />
                <h3 className="font-bold text-lg mb-2">No orders found</h3>
                <p className="text-muted-foreground text-sm mb-6">
                  You haven&apos;t placed any orders in this category yet.
                </p>
                <Link
                  href="/shop"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90"
                >
                  Start Shopping
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.map((order) => (
                  <div
                    key={order.id}
                    className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center justify-between p-5 border-b border-border">
                      <div>
                        <p className="font-bold text-sm">{order.orderNumber}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {order.createdAt.slice(0, 10)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-xs font-semibold px-3 py-1 rounded-full ${ORDER_STATUS_COLORS[order.status]}`}
                        >
                          {ORDER_STATUS_LABELS[order.status]}
                        </span>
                        <span className="font-bold">{formatPrice(order.total)}</span>
                      </div>
                    </div>

                    <div className="p-5">
                      <div className="flex gap-3 mb-4">
                        {order.items.slice(0, 3).map((item) => (
                          <div
                            key={item.id}
                            className="relative w-14 h-14 rounded-xl overflow-hidden bg-muted shrink-0"
                          >
                            <Image
                              src={item.product.thumbnail}
                              alt={item.product.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ))}
                        {order.items.length > 3 && (
                          <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center text-sm text-muted-foreground font-semibold">
                            +{order.items.length - 3}
                          </div>
                        )}
                        <div className="ml-2">
                          <p className="text-sm font-medium">
                            {order.items
                              .map((i) => i.product.name)
                              .slice(0, 2)
                              .join(', ')}
                            {order.items.length > 2 ? ` +${order.items.length - 2} more` : ''}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {order.items.reduce((s, i) => s + i.quantity, 0)} items
                          </p>
                          {order.trackingNumber && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Tracking: {order.trackingNumber}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 pt-4 border-t border-border">
                        <Link
                          href={`/account/orders/${order.id}`}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-muted rounded-xl text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          <Eye size={14} /> View Details
                        </Link>
                        <button className="inline-flex items-center gap-1.5 px-4 py-2 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors">
                          <Download size={14} /> Invoice
                        </button>
                        {order.status === 'delivered' && (
                          <button className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 bg-primary/10 text-primary rounded-xl text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-colors">
                            Write Review
                          </button>
                        )}
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

