"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Bell, Package, Tag, Info, Star, Check } from "lucide-react";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AccountSidebar } from "@/components/account/AccountSidebar";
import { toast } from "sonner";
import { accountService, type AccountNotification } from "@/services/account-service";

function iconFor(type: string) {
  if (type === "order" || type === "shipping" || type === "payment") return Package;
  if (type === "promo") return Tag;
  if (type === "review") return Star;
  return Info;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<AccountNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [prefs, setPrefs] = useState<Record<string, boolean>>({ orders: true, promos: true, reviews: true, newsletter: false, sms: false });

  useEffect(() => {
    accountService.notifications().then((data) => {
      setNotifications(data.items);
      setUnreadCount(data.unreadCount);
    });
  }, []);

  const markAllRead = async () => {
    await accountService.markNotificationsRead();
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
    setUnreadCount(0);
    toast.success("All notifications marked as read");
  };

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
          <span className="text-foreground font-medium">Notifications</span>
        </nav>

        <div className="flex gap-8">
          <AccountSidebar active="notifications" />
          <div className="flex-1 min-w-0 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-extrabold flex items-center gap-2">
                  Notifications
                  {unreadCount > 0 && <span className="text-sm font-normal text-muted-foreground">({unreadCount} unread)</span>}
                </h1>
                {unreadCount > 0 && <button onClick={markAllRead} className="text-sm text-primary hover:underline flex items-center gap-1"><Check size={13} /> Mark all read</button>}
              </div>

              <div className="space-y-3">
                {notifications.length ? notifications.map((item) => {
                  const Icon = iconFor(item.type);
                  return (
                    <div key={item.id} className={`flex items-start gap-4 p-4 rounded-2xl border transition-colors hover:bg-muted/50 ${item.read ? "border-border bg-card" : "border-primary/20 bg-primary/5"}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.read ? "bg-muted" : "bg-primary/10"}`}>
                        <Icon size={18} className={item.read ? "text-muted-foreground" : "text-primary"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${item.read ? "" : "text-primary"}`}>{item.title}</p>
                        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{item.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">{item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}</p>
                      </div>
                      {!item.read && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />}
                    </div>
                  );
                }) : <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">No notifications yet.</div>}
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="font-bold mb-5 flex items-center gap-2"><Bell size={16} /> Notification Preferences</h2>
              <div className="space-y-4">
                {[
                  ["orders", "Order Updates", "Shipping, delivery, and order status notifications"],
                  ["promos", "Promotions & Deals", "Flash sales, coupon codes, and special offers"],
                  ["reviews", "Review Requests", "Reminders to review purchased products"],
                  ["newsletter", "Newsletter", "Weekly curated content and new arrivals"],
                  ["sms", "SMS Notifications", "Text message alerts for critical updates"],
                ].map(([id, label, desc]) => (
                  <div key={id} className="flex items-center justify-between py-2">
                    <div><p className="text-sm font-semibold">{label}</p><p className="text-xs text-muted-foreground">{desc}</p></div>
                    <button onClick={() => setPrefs((p) => ({ ...p, [id]: !p[id] }))} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${prefs[id] ? "bg-primary" : "bg-muted"}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${prefs[id] ? "translate-x-6" : "translate-x-1"}`} />
                    </button>
                  </div>
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
