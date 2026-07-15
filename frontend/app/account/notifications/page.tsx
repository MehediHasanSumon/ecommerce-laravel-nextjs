"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Package, Tag, Info, Star, Check, Trash2 } from "lucide-react";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AccountSidebar } from "@/components/account/AccountSidebar";
import { toast } from "sonner";
import { useNotificationStore } from "@/store/notification-store";

function iconFor(type: string) {
  if (type === "order" || type === "shipping" || type === "payment") return Package;
  if (type === "promo") return Tag;
  if (type === "review") return Star;
  return Info;
}

export default function NotificationsPage() {
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const notifications = useNotificationStore((state) => state.items);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const fetchNotifications = useNotificationStore((state) => state.fetchNotifications);
  const markAllReadStore = useNotificationStore((state) => state.markAllRead);
  const deleteNotificationStore = useNotificationStore((state) => state.deleteNotification);

  useEffect(() => {
    void fetchNotifications({ per_page: 20, force: true });
  }, [fetchNotifications]);

  const markAllRead = async () => {
    await markAllReadStore();
    toast.success("All notifications marked as read");
  };

  const deleteNotification = async (id: number) => {
    setDeletingId(id);
    try {
      await deleteNotificationStore(id);
      toast.success("Notification deleted.");
    } catch {
      toast.error("Unable to delete notification.");
    } finally {
      setDeletingId(null);
    }
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

        <div className="flex flex-col gap-4 md:flex-row md:gap-8">
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
                      <button
                        type="button"
                        disabled={deletingId === item.id}
                        onClick={() => void deleteNotification(item.id)}
                        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                        aria-label="Delete notification"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  );
                }) : <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">No notifications yet.</div>}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
